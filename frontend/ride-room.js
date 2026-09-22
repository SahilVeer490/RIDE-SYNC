const user = JSON.parse(localStorage.getItem("user"));
const ride = JSON.parse(localStorage.getItem("currentRide"));

const rideStatus = document.getElementById("rideStatus");
const rideStatusText = document.getElementById("rideStatusText");
const rideTypeLabel = document.getElementById("rideTypeLabel");

if (ride.status === "live") {
    rideStatusText.textContent = "LIVE";
    rideTypeLabel.textContent = "LIVE RIDE";

} else if (ride.status === "upcoming") {
    rideStatusText.textContent = "UPCOMING";
    rideTypeLabel.textContent = "UPCOMING RIDE";

} else if (ride.status === "completed") {
    rideStatusText.textContent = "COMPLETED";
    rideTypeLabel.textContent = "COMPLETED RIDE";
}

// User name
document.getElementById("userName").textContent = user.fullName;

// Ride details
document.getElementById("rideName").textContent = ride.rideName;

document.getElementById("rideRoute").textContent =
    ride.startLocation + " → " + ride.destination;

// Rider count

const leaderControls = document.getElementById("leaderControls");

if (ride.createdBy.toString() !== user.id.toString()) {
    leaderControls.style.display = "none";
}

let userMarker = null;

function calculateDistance(lat1, lon1, lat2, lon2) {

    const R = 6371;

    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c =
        2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

let previousLatitude = null;
let previousLongitude = null;
let previousTime = null;
let totalDistance = 0;

if (ride.status !== "live") {
    console.log("GPS tracking is available only for live rides.");
} else {
        async function loadWeather(latitude, longitude) {
        try {
            const response = await fetch(
                `https://ride-sync-lgyl.onrender.com/api/weather?latitude=${latitude}&longitude=${longitude}`
            );

            const data = await response.json();

            document.getElementById("rideWeather").textContent =
                Math.round(data.temperature) + "°C";

        } catch (error) {
            console.log("Weather error:", error);
        }
    }

    async function loadFuelStations(latitude, longitude) {
        try {
            const response = await fetch(
                `https://ride-sync-lgyl.onrender.com/api/fuel-stations?latitude=${latitude}&longitude=${longitude}`
            );

            const data = await response.json();

            const fuelContainer = document.getElementById("fuelStations");

            if (!data.stations || data.stations.length === 0) {
                fuelContainer.innerHTML =
                    "<p>No fuel stations found nearby.</p>";
                return;
            }

            fuelContainer.innerHTML = "";

            data.stations.slice(0, 5).forEach((station) => {

                const name =
                    station.tags?.name || "Fuel Station";

                fuelContainer.innerHTML += `
                    <div class="fuel-card">
                        <strong>⛽ ${name}</strong>
                    </div>
                `;
            });

        } catch (error) {
            console.log("Fuel station error:", error);
        }
    }

    async function loadServiceCenters(latitude, longitude) {
        try {
            const response = await fetch(
                `https://ride-sync-lgyl.onrender.com/api/service-centers?latitude=${latitude}&longitude=${longitude}`
            );

            const data = await response.json();

            const serviceContainer =
                document.getElementById("serviceCenters");

            if (!data.centers || data.centers.length === 0) {
                serviceContainer.innerHTML =
                    "<p>No service centers found nearby.</p>";
                return;
            }

            serviceContainer.innerHTML = "";

            data.centers.slice(0, 5).forEach((center) => {

                const name =
                    center.tags?.name || "Bike Service Center";

                serviceContainer.innerHTML += `
                    <div class="service-card">
                        <strong>🔧 ${name}</strong>
                    </div>
                `;
            });

        } catch (error) {
            console.log("Service center error:", error);
        }
    }



    // existing GPS code goes here
    navigator.geolocation.watchPosition(
    async (position) => {

        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        loadWeather(latitude, longitude);
        loadFuelStations(latitude, longitude);
        loadServiceCenters(latitude, longitude);
        
        const speed = position.coords.speed;

        const currentTime = Date.now();

        if (
            previousLatitude !== null &&
            previousLongitude !== null &&
            previousTime !== null
        ) {
            const distance = calculateDistance(
                previousLatitude,
                previousLongitude,
                latitude,
                longitude
            );

            totalDistance += distance;
            document.getElementById("rideDistance").textContent = totalDistance.toFixed(1) + " km";

            const timeInSeconds =
                (currentTime - previousTime) / 1000;

            if (timeInSeconds > 0) {
                const calculatedSpeed =
                    (distance / timeInSeconds) * 3600;

                document.getElementById("rideSpeed").textContent =
                    Math.round(calculatedSpeed) + " km/h";
            }
        }

        previousLatitude = latitude;
        previousLongitude = longitude;
        previousTime = currentTime;

        console.log("GPS SPEED:", speed);
        if (speed !== null && speed >= 0) {
            const speedKmh = Math.round(speed * 3.6);
            document.getElementById("rideSpeed").textContent = speedKmh + " km/h";
        }      
        console.log("Latitude:", latitude);
        console.log("Longitude:", longitude);

        if (!userMarker) {

            userMarker = L.marker([latitude, longitude])
                .addTo(map)
                .bindPopup("YOU");

            map.setView([latitude, longitude], 15);

        } else {

            userMarker.setLatLng([latitude, longitude]);

        }

        try {

            const response = await fetch(
                "https://ride-sync-lgyl.onrender.com/api/update-location",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        rideCode: ride.rideCode,
                        userId: user.id,
                        latitude: latitude,
                        longitude: longitude
                    })
                }
            );

            const data = await response.json();

            console.log(data.message);

        } catch (error) {

            console.log("Location update failed:", error);

        }
    },

    (error) => {
        console.log("GPS Error:", error);
    },

    {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000
    }
);

const map = L.map("rideMap").setView([19.0760, 72.8777], 12);

L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
        attribution: "&copy; OpenStreetMap contributors"
    }
).addTo(map);

let riderMarkers = {};

async function loadRiderLocations() {

    try {

        const response = await fetch(
            "https://ride-sync-lgyl.onrender.com/api/ride-locations/" +
            ride.rideCode
        );

        const data = await response.json();

        if (!response.ok) {
            console.log(data.message);
            return;
        }

        data.riderLocations.forEach((rider) => {

            const riderId = rider.user._id;

            // Don't create another marker for yourself
            if (riderId === user.id) {
                return;
            }

            const newPosition = [
                rider.latitude,
                rider.longitude
            ];

            // Marker already exists → move it
            if (riderMarkers[riderId]) {

                riderMarkers[riderId].setLatLng(newPosition);

            } else {

                // First time → create marker
                riderMarkers[riderId] = L.marker(newPosition)
                    .addTo(map)
                    .bindPopup(
                        rider.user.fullName
                    );
            }

        });

    } catch (error) {

        console.log(
            "Unable to load rider locations:",
            error
        );

    }
}

// First load
loadRiderLocations();

// Update every 3 seconds
setInterval(loadRiderLocations, 3000);

}

const startRideBtn = document.getElementById("startRideBtn");

startRideBtn.addEventListener("click", async () => {
    try {
        const response = await fetch(
            "https://ride-sync-lgyl.onrender.com/api/start-ride/" + ride._id,
            {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    userId: user.id
                })
            }
        );

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem(
                "currentRide",
                JSON.stringify(data.ride)
            );

            ride.status = data.ride.status;
            ride.startedAt = data.ride.startedAt;

            startRideTimer();

            alert("Ride started successfully!");

            location.reload();
        } else {
            alert(data.message);
        }

    } catch (error) {
        console.log(error);
        alert("Unable to start ride.");
    }
});

const endRideBtn = document.getElementById("endRideBtn");

endRideBtn.addEventListener("click", async () => {
    try {
        const response = await fetch(
            "https://ride-sync-lgyl.onrender.com/api/end-ride/" + ride._id,
            {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    userId: user.id
                })
            }
        );

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem(
                "currentRide",
                JSON.stringify(data.ride)
            );

            alert("Ride ended successfully!");

            window.location.href = "old-rides.html";
        } else {
            alert(data.message);
        }

    } catch (error) {
        console.log(error);
        alert("Unable to end ride.");
    }
});

const updateRideBtn = document.getElementById("updateRideBtn");
const updateRideForm = document.getElementById("updateRideForm");

updateRideBtn.addEventListener("click", () => {

    updateRideForm.style.display = "block";

    document.getElementById("updateRideName").value =
        ride.rideName;

    document.getElementById("updateStartLocation").value =
        ride.startLocation;

    document.getElementById("updateDestination").value =
        ride.destination;

    document.getElementById("updateRideDate").value =
        ride.rideDate;

    document.getElementById("updateRideTime").value =
        ride.rideTime;

    document.getElementById("updateMaxRiders").value =
        ride.maxRiders;

    document.getElementById("updateRideDescription").value =
        ride.rideDescription || "";
});

const saveRideChanges = document.getElementById("saveRideChanges");

saveRideChanges.addEventListener("click", async () => {

    const updatedRide = {
        userId: user.id,
        rideName: document.getElementById("updateRideName").value,
        startLocation: document.getElementById("updateStartLocation").value,
        destination: document.getElementById("updateDestination").value,
        rideDate: document.getElementById("updateRideDate").value,
        rideTime: document.getElementById("updateRideTime").value,
        maxRiders: document.getElementById("updateMaxRiders").value,
        rideDescription: document.getElementById("updateRideDescription").value
    };

    try {
        const response = await fetch(
            "https://ride-sync-lgyl.onrender.com/api/update-ride/" + ride._id,
            {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(updatedRide)
            }
        );

        const data = await response.json();

        if (response.ok) {

            localStorage.setItem(
                "currentRide",
                JSON.stringify(data.ride)
            );

            alert("Ride updated successfully!");

            location.reload();

        } else {
            alert(data.message);
        }

    } catch (error) {
        console.log(error);
        alert("Unable to update ride.");
    }
});

const deleteRideBtn = document.getElementById("deleteRideBtn");

deleteRideBtn.addEventListener("click", async () => {

    const confirmDelete = confirm(
        "Are you sure you want to delete this ride?"
    );

    if (!confirmDelete) {
        return;
    }

    try {
        const response = await fetch(
            "https://ride-sync-lgyl.onrender.com/api/delete-ride/" + ride._id,
            {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    userId: user.id
                })
            }
        );

        const data = await response.json();

        if (response.ok) {

            alert("Ride deleted successfully!");

            localStorage.removeItem("currentRide");

            window.location.href = "dashboard.html";

        } else {
            alert(data.message);
        }

    } catch (error) {
        console.log(error);
        alert("Unable to delete ride.");
    }
});

async function loadRideCrew() {

    try {

        const response = await fetch(
            "https://ride-sync-lgyl.onrender.com/api/ride-crew/" + ride.rideCode
        );

        const data = await response.json();

        if (!response.ok) {
            console.log(data.message);
            return;
        }

        const crewList = document.getElementById("crewList");
        const riderCount = document.getElementById("riderCount");

        riderCount.textContent =
            data.riders.length + " / " + ride.maxRiders;

        crewList.innerHTML = "";

        data.riders.forEach((rider) => {

            const member = document.createElement("div");

            member.className = "crew-member";

            const isYou =
                rider._id.toString() === user.id.toString();

            member.innerHTML = `
                <span class="rider-status"></span>

                <div>
                    <strong>
                        ${isYou ? "You" : rider.fullName}
                    </strong>

                    <small>
                        ${rider.bike || "Bike not specified"}
                    </small>
                </div>
            `;

            crewList.appendChild(member);
        });

    } catch (error) {

        console.log("Crew loading failed:", error);

    }
}

loadRideCrew();
setInterval(loadRideCrew, 3000);

let rideTimerInterval = null;

function startRideTimer() {

    if (ride.status !== "live" || !ride.startedAt) {
        document.getElementById("rideTime").textContent = "00:00:00";
        return;
    }

    const startTime = new Date(ride.startedAt).getTime();

    function updateTimer() {

        const elapsedSeconds = Math.floor(
            (Date.now() - startTime) / 1000
        );

        const hours = Math.floor(elapsedSeconds / 3600);
        const minutes = Math.floor((elapsedSeconds % 3600) / 60);
        const seconds = elapsedSeconds % 60;

        document.getElementById("rideTime").textContent =
            String(hours).padStart(2, "0") + ":" +
            String(minutes).padStart(2, "0") + ":" +
            String(seconds).padStart(2, "0");
    }

    updateTimer();

    rideTimerInterval = setInterval(updateTimer, 1000);
}

startRideTimer();

const sosBtn = document.getElementById("sosBtn");

sosBtn.addEventListener("click", () => {

    const confirmSOS = confirm(
        "🚨 EMERGENCY SOS\n\nDo you want to trigger an SOS alert and share your current location?"
    );

    if (!confirmSOS) {
        return;
    }

    if (!navigator.geolocation) {
        alert("Location services are not supported on this device.");
        return;
    }

    navigator.geolocation.getCurrentPosition(
        async (position) => {

            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;

            try {

                const response = await fetch(
                    "https://ride-sync-lgyl.onrender.com/api/sos",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            rideCode: ride.rideCode,
                            userId: user.id,
                            latitude: latitude,
                            longitude: longitude
                        })
                    }
                );

                const data = await response.json();

                if (response.ok) {

                    const locationLink =
                        `https://www.google.com/maps?q=${latitude},${longitude}`;

                    alert(
                        "🚨 SOS ALERT TRIGGERED!\n\n" +
                        "📍 Location saved successfully.\n\n" +
                        locationLink
                    );

                    console.log("SOS SAVED:", data);

                } else {

                    alert("Unable to save SOS alert.");
                    console.log("SOS ERROR:", data);

                }

            } catch (error) {

                console.log("SOS NETWORK ERROR:", error);

                alert(
                    "🚨 SOS location captured,\n" +
                    "but could not connect to the server."
                );
            }
        },

        (error) => {

            console.log("SOS location error:", error);

            alert(
                "Unable to get your current location.\n" +
                "Please allow location access."
            );
        }
    );
});

async function loadSOSAlerts() {
    try {
        const response = await fetch(
            `https://ride-sync-lgyl.onrender.com/api/sos-alerts/${ride.rideCode}`
        );

        const data = await response.json();

        const sosContainer = document.getElementById("sosAlerts");

        if (!data.alerts || data.alerts.length === 0) {
            sosContainer.innerHTML =
                "<p>No SOS alerts yet.</p>";
            return;
        }

        sosContainer.innerHTML = "";

        data.alerts.forEach((alert) => {

            const riderName =
                alert.user?.fullName || "Unknown Rider";

            const locationLink =
                `https://www.google.com/maps?q=${alert.latitude},${alert.longitude}`;

            const alertTime =
                new Date(alert.createdAt).toLocaleString();

            sosContainer.innerHTML += `
                <div class="sos-alert-card">

                    <strong>🚨 ${riderName}</strong>

                    <p>📍 Emergency location detected</p>

                    <p>🕐 ${alertTime}</p>

                    <a href="${locationLink}" target="_blank">
                        View Location
                    </a>

                </div>
            `;
        });

    } catch (error) {
        console.log("SOS alerts error:", error);
    }
}

loadSOSAlerts();

function findServiceCenters() {

    if (!navigator.geolocation) {
        alert("Location services are not supported on this device.");
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {

            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;

            const mapsUrl =
                `https://www.google.com/maps/search/motorcycle+service+center/@${latitude},${longitude},14z`;

            window.open(mapsUrl, "_blank");
        },

        (error) => {
            console.log("Location error:", error);

            alert(
                "Unable to get your location. Please allow location access."
            );
        }
    );
}

function findFuelStations() {

    if (!navigator.geolocation) {
        alert("Location services are not supported on this device.");
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {

            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;

            const mapsUrl =
                `https://www.google.com/maps/search/petrol+pump/@${latitude},${longitude},14z`;

            window.open(mapsUrl, "_blank");
        },

        (error) => {
            console.log("Location error:", error);

            alert(
                "Unable to get your location. Please allow location access."
            );
        }
    );
}

