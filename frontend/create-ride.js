const createRideForm = document.getElementById("createRideForm");

const user = JSON.parse(localStorage.getItem("user"));

if (!user) {
    window.location.href = "login.html";
}

document.getElementById("userName").textContent = user.fullName;

createRideForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const rideName = document.getElementById("rideName").value;
    const startLocation = document.getElementById("startLocation").value;
    const destination = document.getElementById("destination").value;
    const rideDate = document.getElementById("rideDate").value;
    const rideTime = document.getElementById("rideTime").value;
    const maxRiders = document.getElementById("maxRiders").value;
    const rideDescription = document.getElementById("rideDescription").value;

    try {
        const response = await fetch("https://ride-sync-lgyl.onrender.com/api/create-ride", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                rideName,
                startLocation,
                destination,
                rideDate,
                rideTime,
                maxRiders,
                rideDescription,
                createdBy: user.id
            })
        });

        const data = await response.json();

        if (response.ok) {

            localStorage.setItem("currentRide", JSON.stringify(data.ride));

            window.location.href = "ride-room.html";
        }else {
            alert(data.message);
        }

    } catch (error) {
        console.log(error);
        alert("Unable to connect to server.");
    }
});