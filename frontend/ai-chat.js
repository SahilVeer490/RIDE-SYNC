const chatBox = document.getElementById("chatBox");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");

const user = JSON.parse(localStorage.getItem("user"));
const currentRide = JSON.parse(localStorage.getItem("currentRide"));

function addMessage(message, type) {
    const messageDiv = document.createElement("div");
    messageDiv.className = type === "user" ? "user-message" : "ai-message";

    messageDiv.innerHTML = message.replace(/\n/g, "<br>");

    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

async function sendMessage() {
    const message = messageInput.value.trim();

    if (!message) return;

    addMessage(message, "user");

    messageInput.value = "";
    sendBtn.disabled = true;
    sendBtn.textContent = "THINKING...";

    try {
        const response = await fetch(
            "https://ride-sync-lgyl.onrender.com/api/ai-chat",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    message: message,
                    userId: user ? user.id : null,
                    rideCode: currentRide ? currentRide.rideCode : null
                })
            }
        );

        const data = await response.json();

        if (response.ok) {
            addMessage(data.reply, "ai");
        } else {
            addMessage("Sorry, I couldn't answer that right now.", "ai");
        }

    } catch (error) {
        console.log("AI CHAT ERROR:", error);

        addMessage(
            "Unable to connect to RIDE SYNC AI. Please check if the backend is running.",
            "ai"
        );
    }

    sendBtn.disabled = false;
    sendBtn.textContent = "SEND";
}

sendBtn.addEventListener("click", sendMessage);

messageInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        sendMessage();
    }
});