const resultBox = document.getElementById("scannerResult");

function onScanSuccess(decodedText) {

    try {

        const data = JSON.parse(decodedText);

        resultBox.innerHTML = `
            <div class="emergency-result">

                <h2>🚨 EMERGENCY INFORMATION</h2>

                <p><strong>Rider:</strong> ${data.riderName}</p>

                <p><strong>Rider Code:</strong> ${data.riderCode}</p>

                <p><strong>Blood Group:</strong> ${data.bloodGroup}</p>

                <p><strong>Bike:</strong> ${data.bikeModel}</p>

                <p><strong>Bike Number:</strong> ${data.bikeNumber}</p>

                <p><strong>Emergency Contact:</strong> ${data.emergencyContactName}</p>

                <p>
                    <strong>Contact Number:</strong>
                    ${data.emergencyContactPhone}
                </p>

                <p>
                    <strong>Emergency Note:</strong>
                    ${data.emergencyNote || "No additional information"}
                </p>

                <a href="tel:${data.emergencyContactPhone}">
                    📞 CALL EMERGENCY CONTACT
                </a>

                <a href="tel:112">
                    🚨 CALL 112
                </a>

            </div>
        `;

        scanner.clear();

    } catch (error) {

        resultBox.innerHTML = `
            <p>❌ Invalid RIDE SYNC Emergency QR.</p>
        `;

    }
}

function onScanFailure(error) {
    // Keep scanning
}

const scanner = new Html5QrcodeScanner(
    "reader",
    {
        fps: 10,
        qrbox: 250
    }
);

scanner.render(onScanSuccess, onScanFailure);