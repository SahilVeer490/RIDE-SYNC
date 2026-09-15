const user = JSON.parse(localStorage.getItem("user"));
const ride = JSON.parse(localStorage.getItem("analyticsRide"));

if (!user || !ride) {
    window.location.href = "old-rides.html";
}

document.getElementById("userName").textContent =
    user.fullName;

document.getElementById("analyticsRideName").textContent =
    ride.rideName;

document.getElementById("analyticsRoute").textContent =
    ride.startLocation + " → " + ride.destination;

const riderIds = new Set(
    ride.joinedRiders.map((rider) => rider.toString())
);

riderIds.add(ride.createdBy.toString());

document.getElementById("totalRiders").textContent =
    riderIds.size;

document.getElementById("maxRiders").textContent =
    ride.maxRiders;

document.getElementById("rideDate").textContent =
    ride.rideDate;

document.getElementById("rideTime").textContent =
    ride.rideTime;

document.getElementById("startLocation").textContent =
    ride.startLocation;

document.getElementById("destination").textContent =
    ride.destination;

document.getElementById("rideCode").textContent =
    ride.rideCode;