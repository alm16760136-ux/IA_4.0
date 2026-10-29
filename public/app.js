const form = document.querySelector("#chat-form");
const input = document.querySelector("#message-input");
const sendButton = document.querySelector("#send-button");
const messages = document.querySelector("#messages");
const typingIndicator = document.querySelector("#typing-indicator");

let conversationId = null;

function addMessage(text, role, isError = false) {
  const article = document.createElement("article");
  article.className = `message ${role}-message${isError ? " error-message" : ""}`;

  if (role === "assistant") {
    const avatar = document.createElement("span");
    avatar.className = "avatar";
    avatar.setAttribute("aria-hidden", "true");
    avatar.textContent = "F";
    article.append(avatar);
  }

  const content = document.createElement("div");
  content.className = "message-content";

  const author = document.createElement("span");
  author.className = "message-author";
  author.textContent = role === "user" ? "Tú" : "Asistente";

  const bubble = document.createElement("p");
  bubble.className = "message-bubble";
  bubble.textContent = text;

  content.append(author, bubble);
  article.append(content);
  messages.append(article);
  article.scrollIntoView({ behavior: "smooth", block: "end" });
}

function setWaiting(waiting) {
  sendButton.disabled = waiting;
  input.disabled = waiting;
  typingIndicator.textContent = waiting ? "Escribiendo…" : "";
}

input.addEventListener("input", () => {
  input.style.height = "auto";
  input.style.height = `${Math.min(input.scrollHeight, 180)}px`;
});

input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const message = input.value.trim();

  if (message.length < 1 || message.length > 2000 || sendButton.disabled) {
    return;
  }

  addMessage(message, "user");
  input.value = "";
  input.style.height = "auto";
  setWaiting(true);

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        conversation_id: conversationId,
      }),
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "No se pudo completar la solicitud.");
    }

    if (typeof result.reply !== "string" || typeof result.conversation_id !== "string") {
      throw new Error("El servidor devolvió una respuesta no válida.");
    }

    conversationId = result.conversation_id;
    addMessage(result.reply, "assistant");
  } catch (error) {
    addMessage(
      error instanceof Error ? error.message : "No se pudo completar la solicitud.",
      "assistant",
      true,
    );
  } finally {
    setWaiting(false);
    input.focus();
  }
});
