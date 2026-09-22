const user = JSON.parse(localStorage.getItem("user"));

const form = document.getElementById("emergencyProfileForm");
const messageBox = document.getElementById("profileMessage");

if (!user) {
    alert("Please login first.");
    window.location.href = "login.html";
}


// ===============================
// CHECK EXISTING EMERGENCY PROFILE
// ===============================

async function checkExistingProfile() {

    try {

        const response = await fetch(
            `https://ride-sync-lgyl.onrender.com/api/emergency-profile/${user.id}`
        );

        const data = await response.json();

        if (response.ok && data.profile) {

            showExistingQR(data.profile);

        } else {

            form.style.display = "flex";

        }

    } catch (error) {

        console.log("PROFILE CHECK ERROR:", error);

        form.style.display = "flex";
    }
}


// ===============================
// SHOW EXISTING QR
// ===============================

function showExistingQR(profile) {

    form.style.display = "none";

    const emergencyData = {
        riderCode: profile.riderCode,
        riderName: user.fullName,
        bloodGroup: profile.bloodGroup,
        emergencyContactName: profile.emergencyContactName,
        emergencyContactPhone: profile.emergencyContactPhone,
        bikeModel: profile.bikeModel,
        bikeNumber: profile.bikeNumber,
        emergencyNote: profile.emergencyNote || ""
    };

    messageBox.innerHTML = `
        <div class="emergency-result">

            <h2>🚨 YOUR EMERGENCY QR</h2>

            <p>
                <strong>Rider Code:</strong>
                ${profile.riderCode}
            </p>

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
}


// ===============================
// CREATE NEW PROFILE
// ===============================

form.addEventListener("submit", async (event) => {

    event.preventDefault();

    const profileData = {

        riderId: user.id,

        bloodGroup:
            document.getElementById("bloodGroup").value,

        emergencyContactName:
            document.getElementById("emergencyContactName").value,

        emergencyContactPhone:
            document.getElementById("emergencyContactPhone").value,

        bikeModel:
            document.getElementById("bikeModel").value,

        bikeNumber:
            document.getElementById("bikeNumber").value,

        emergencyNote:
            document.getElementById("emergencyNote").value
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

            showExistingQR(data.profile);

        } else {

            messageBox.textContent =
                data.message ||
                "Unable to create profile.";
        }


    } catch (error) {

        console.log("EMERGENCY PROFILE ERROR:", error);

        messageBox.textContent =
            "Unable to connect to RIDE SYNC server.";
    }
});


// ===============================
// DOWNLOAD QR
// ===============================

function downloadQR() {

    const qrImage =
        document.querySelector("#qrcode img");

    if (!qrImage) {

        alert("QR code not generated yet.");

        return;
    }


    const link = document.createElement("a");

    link.href = qrImage.src;

    link.download =
        "RIDE-SYNC-Emergency-QR.png";

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);
}


// CHECK PROFILE WHEN PAGE OPENS

checkExistingProfile();