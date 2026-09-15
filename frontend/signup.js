const signupForm = document.getElementById("signupForm");

signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const fullName = document.getElementById("fullName").value;
    const email = document.getElementById("signupEmail").value;
    const phone = document.getElementById("phone").value;
    const bike = document.getElementById("bike").value;
    const password = document.getElementById("signupPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    if (password !== confirmPassword) {
        alert("Passwords do not match!");
        return;
    }

    try {
        const response = await fetch("http://localhost:5000/api/signup", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                fullName,
                email,
                phone,
                bike,
                password
            })
        });

        const data = await response.json();

        if (response.ok) {
            alert("Account created successfully!");
            window.location.href = "login.html";
        } else {
            alert(data.message);
        }

    } catch (error) {
        alert("Unable to connect to server.");
        console.log(error);
    }
});