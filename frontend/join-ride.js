const joinRideForm = document.getElementById("joinRideForm");

const user = JSON.parse(localStorage.getItem("user"));

if (!user) {
    window.location.href = "login.html";
}

document.getElementById("userName").textContent = user.fullName;

joinRideForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    const rideCode = document.getElementById("rideCode").value.trim();

    try {

        const response = await fetch("https://ride-sync-lgyl.onrender.com/api/join-ride", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                rideCode: rideCode,
                userId: user.id
            })
        });

        const data = await response.json();

        if (response.ok) {

            localStorage.setItem(
                "currentRide",
                JSON.stringify(data.ride)
            );

            window.location.href = "ride-room.html";

        } else {

            alert(data.message);

        }

    } catch (error) {

        console.log(error);
        alert("Unable to connect to server.");

    }

});