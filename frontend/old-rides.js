const user = JSON.parse(localStorage.getItem("user"));
let ridesData = [];

if (!user) {
    window.location.href = "login.html";
}

document.getElementById("userName").textContent = user.fullName;

async function loadOldRides() {

    try {

        const response = await fetch(
            "http://localhost:5000/api/old-rides/" + user.id
        );

        const data = await response.json();

        const ridesContainer = document.getElementById("ridesContainer");

        if (!response.ok) {
            ridesContainer.innerHTML = "<p>Unable to load rides.</p>";
            return;
        }

        ridesData = data.rides.filter(
            (ride) => ride.status === "completed"
        );

        if (ridesData.length === 0) {
            ridesContainer.innerHTML = `
                <p class="no-rides">
                    You haven't completed any rides yet.
                </p>
            `;
            return;
        }


ridesData.forEach((ride) => {

    const riderIds = new Set(
    ride.joinedRiders.map((rider) => rider.toString())
    );

    riderIds.add(ride.createdBy.toString());

    const totalRiders = riderIds.size;

    const rideCard = document.createElement("div");

    rideCard.className = "ride-card";

    rideCard.innerHTML = `
        <p class="card-label">RIDE</p>

        <h2>${ride.rideName}</h2>

        <p>
            ${ride.startLocation} → ${ride.destination}
        </p>

        <p>
            Date: ${ride.rideDate}
        </p>

        <p>
            Time: ${ride.rideTime}
        </p>
        
        <p>Riders: ${totalRiders} / ${ride.maxRiders}</p>

        <p>
            Ride Code: <strong>${ride.rideCode}</strong>
        </p>

        <button
            class="dashboard-btn"
            onclick="openRide('${ride.rideCode}')"
        >
            VIEW RIDE →
        </button>

        <button
            class="dashboard-btn analytics-btn"
            onclick="openAnalytics('${ride.rideCode}')"
        >
            ANALYTICS →
        </button>
    `;

    ridesContainer.appendChild(rideCard);

});

} catch (error) {

        console.log(error);

        document.getElementById("ridesContainer").innerHTML =
            "<p>Unable to connect to server.</p>";

    }
}

loadOldRides();

function openRide(rideCode) {

    const ride = ridesData.find(
        (item) => item.rideCode === rideCode
    );

    localStorage.setItem(
        "currentRide",
        JSON.stringify(ride)
    );

    window.location.href = "ride-room.html";
}

function openAnalytics(rideCode) {

    const ride = ridesData.find(
        (item) => item.rideCode === rideCode
    );

    localStorage.setItem(
        "analyticsRide",
        JSON.stringify(ride)
    );

    window.location.href = "analytics.html";
}