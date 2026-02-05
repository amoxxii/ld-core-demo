const chatContent = document.getElementById("chatContent");
const chatInput = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendBtn");

function scrollToEnd() {
  document.getElementById("messagesEnd")?.scrollIntoView({ behavior: "smooth" });
}

function addMessage(role, content, id) {
  const row = document.createElement("div");
  row.className = "message-row" + (role === "user" ? " message-row-user" : "");
  if (role === "assistant") {
    const avatar = document.createElement("img");
    avatar.src = "/assets/ToggleAvatar.png";
    avatar.alt = "";
    avatar.className = "message-avatar";
    row.appendChild(avatar);
  }
  const msg = document.createElement("div");
  msg.className = "message message-" + (role === "user" ? "user" : "assistant");
  if (id) msg.dataset.id = id;
  if (role === "assistant" && content.includes("**")) {
    msg.classList.add("markdown-content");
    msg.innerHTML = content
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\n/g, "<br>");
  } else {
    msg.textContent = content;
  }
  row.appendChild(msg);
  chatContent.appendChild(row);
  scrollToEnd();
}

function addLoading() {
  const row = document.createElement("div");
  row.className = "message-row";
  row.id = "loading-row";
  row.innerHTML = '<img src="/assets/ToggleAvatar.png" alt="" class="message-avatar" /><div class="message message-assistant"><div class="loading-dots"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div></div>';
  chatContent.appendChild(row);
  scrollToEnd();
}

function removeLoading() {
  document.getElementById("loading-row")?.remove();
}

async function sendMessage() {
  const text = chatInput.value.trim();
  if (!text) return;

  chatInput.value = "";
  sendBtn.disabled = true;
  addMessage("user", text);
  addLoading();

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userInput: text }),
    });
    const data = await res.json();

    removeLoading();
    if (res.ok) {
      addMessage("assistant", data.response, data.requestId);
    } else {
      addMessage("assistant", data.response || data.error || "Something went wrong.");
    }
  } catch (_) {
    removeLoading();
    addMessage("assistant", "Network error. Please try again.");
  } finally {
    sendBtn.disabled = false;
    chatInput.focus();
  }
}

sendBtn.addEventListener("click", sendMessage);
chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});
