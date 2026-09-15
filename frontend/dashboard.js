const user = JSON.parse(localStorage.getItem("user"));

if (!user) {
    window.location.href = "login.html";
} else {
    document.getElementById("userName").textContent = user.fullName;
    document.getElementById("welcomeName").textContent =
        user.fullName.toUpperCase() + ".";
}

document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("user");
    window.location.href = "login.html";
});

async function loadLiveRides() {
    try {
        const response = await fetch(
            "http://localhost:5000/api/live-rides/" + user.id
        );

        const data = await response.json();

        const liveRidesContainer =
            document.getElementById("liveRidesContainer");

        if (!response.ok) {
            liveRidesContainer.innerHTML =
                "<p class='no-rides'>Unable to load live rides.</p>";
            return;
        }

        if (data.rides.length === 0) {
            liveRidesContainer.innerHTML =
                "<p class='no-rides'>No live rides right now.</p>";
            return;
        }

        liveRidesContainer.innerHTML = "";

        data.rides.forEach((ride) => {

            const rideCard = document.createElement("div");

            rideCard.className = "live-ride-card";

            rideCard.innerHTML = `
                <div>
                    <p class="card-label">● LIVE NOW</p>

                    <h3>${ride.rideName}</h3>

                    <p>
                        ${ride.startLocation} → ${ride.destination}
                    </p>

                    <p>
                        Riders: ${ride.joinedRiders.length} / ${ride.maxRiders}
                    </p>

                    <p>
                        Ride Code:
                        <strong>${ride.rideCode}</strong>
                    </p>
                </div>

                <button
                    class="dashboard-btn"
                    onclick="openLiveRide('${ride.rideCode}')"
                >
                    ENTER RIDE →
                </button>
            `;

            liveRidesContainer.appendChild(rideCard);
        });

    } catch (error) {
        console.log(error);

        document.getElementById("liveRidesContainer").innerHTML =
            "<p class='no-rides'>Unable to connect to server.</p>";
    }
}

function openLiveRide(rideCode) {

    fetch("http://localhost:5000/api/live-rides/" + user.id)
        .then(response => response.json())
        .then(data => {

            const ride = data.rides.find(
                (item) => item.rideCode === rideCode
            );

            if (!ride) {
                alert("Ride is no longer live.");
                return;
            }

            localStorage.setItem(
                "currentRide",
                JSON.stringify(ride)
            );

            window.location.href = "ride-room.html";
        })
        .catch(error => {
            console.log(error);
            alert("Unable to open ride.");
        });
}

loadLiveRides();

async function loadUpcomingRides() {
    try {
        const response = await fetch(
            "http://localhost:5000/api/upcoming-rides/" + user.id
        );

        const data = await response.json();

        const upcomingRidesContainer =
            document.getElementById("upcomingRidesContainer");

        if (!response.ok) {
            upcomingRidesContainer.innerHTML =
                "<p class='no-rides'>Unable to load upcoming rides.</p>";
            return;
        }

        if (data.rides.length === 0) {
            upcomingRidesContainer.innerHTML =
                "<p class='no-rides'>No upcoming rides.</p>";
            return;
        }

        upcomingRidesContainer.innerHTML = "";

        data.rides.forEach((ride) => {

            const rideCard = document.createElement("div");

            rideCard.className = "upcoming-ride-card";

            rideCard.innerHTML = `
                <div>
                    <p class="card-label">● UPCOMING</p>

                    <h3>${ride.rideName}</h3>

                    <p>
                        ${ride.startLocation} → ${ride.destination}
                    </p>

                    <p>
                        Date: ${ride.rideDate}
                    </p>

                    <p>
                        Time: ${ride.rideTime}
                    </p>

                    <p>
                        Riders: ${ride.joinedRiders.length} / ${ride.maxRiders}
                    </p>

                    <p>
                        Ride Code:
                        <strong>${ride.rideCode}</strong>
                    </p>
                </div>

                <button
                    class="dashboard-btn"
                    onclick="openUpcomingRide('${ride.rideCode}')"
                >
                    VIEW RIDE →
                </button>
            `;

            upcomingRidesContainer.appendChild(rideCard);
        });

    } catch (error) {
        console.log(error);

        document.getElementById("upcomingRidesContainer").innerHTML =
            "<p class='no-rides'>Unable to connect to server.</p>";
    }
}


function openUpcomingRide(rideCode) {

    fetch("http://localhost:5000/api/upcoming-rides/" + user.id)
        .then(response => response.json())
        .then(data => {

            const ride = data.rides.find(
                (item) => item.rideCode === rideCode
            );

            if (!ride) {
                alert("Ride is no longer upcoming.");
                return;
            }

            localStorage.setItem(
                "currentRide",
                JSON.stringify(ride)
            );

            window.location.href = "ride-room.html";
        })
        .catch(error => {
            console.log(error);
            alert("Unable to open ride.");
        });
    }


loadUpcomingRides();