const user = JSON.parse(localStorage.getItem("user"));

const form = document.getElementById("emergencyProfileForm");
const messageBox = document.getElementById("profileMessage");

if (!user) {
    alert("Please login first.");
    window.location.href = "login.html";
}

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const profileData = {
        riderId: user.id,
        bloodGroup: document.getElementById("bloodGroup").value,
        emergencyContactName: document.getElementById("emergencyContactName").value,
        emergencyContactPhone: document.getElementById("emergencyContactPhone").value,
        bikeModel: document.getElementById("bikeModel").value,
        bikeNumber: document.getElementById("bikeNumber").value,
        emergencyNote: document.getElementById("emergencyNote").value
    };

    try {
        const response = await fetch(
            "https://ride-sync-lgyl.onrender.com/api/emergency-profile",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(profileData)
            }
        );

        const data = await response.json();

        if (response.ok) {

            const emergencyData = {
                riderCode: data.profile.riderCode,
                riderName: user.fullName,
                bloodGroup: data.profile.bloodGroup,
                emergencyContactName: data.profile.emergencyContactName,
                emergencyContactPhone: data.profile.emergencyContactPhone,
                bikeModel: data.profile.bikeModel,
                bikeNumber: data.profile.bikeNumber,
                emergencyNote: data.profile.emergencyNote
            };

            messageBox.innerHTML = `
                <div>
                    ${data.message}
                    <br><br>

                    <strong>Your Rider Code:</strong>
                    ${data.profile.riderCode}

                    <div id="qrcode"></div>

                    <br>

                    <button
                        type="button"
                        class="emergency-save-btn"
                        onclick="downloadQR()">
                        DOWNLOAD QR
                    </button>
                </div>
            `;

            new QRCode(document.getElementById("qrcode"), {
                text: JSON.stringify(emergencyData),
                width: 220,
                height: 220
            });

        } else {
            messageBox.textContent =
                data.message || "Unable to create profile.";
        }

    } catch (error) {
        console.log("EMERGENCY PROFILE ERROR:", error);

        messageBox.textContent =
            "Unable to connect to RIDE SYNC server.";
    }
});


function downloadQR() {

    const qrImage = document.querySelector("#qrcode img");

    if (!qrImage) {
        alert("QR code not generated yet.");
        return;
    }

    const link = document.createElement("a");

    link.href = qrImage.src;
    link.download = "RIDE-SYNC-Emergency-QR.png";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}