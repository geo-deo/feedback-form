// chat.js

document.addEventListener("DOMContentLoaded", () => {
  const el = document.getElementById("chat-root");

  if (!window.ChatUI) {
    console.error("ChatUI не найден. Проверь подключение https://unpkg.com/chatui/dist/index.js");
    return;
  }

  ChatUI.render(
    {
      messages: [
        {
          type: "text",
          content: { text: "Привет 👋 Я AI-бот, задайте свой вопрос!" },
          position: "left",
        },
      ],
      onSend: async (type, val) => {
        if (type === "text" && val.trim()) {
          // Добавляем сообщение пользователя
          ChatUI.appendMessage({
            type: "text",
            content: { text: val },
            position: "right",
          });

          try {
            // Отправляем на наш API
            const res = await fetch("http://localhost:3001/api/ai-chat", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ message: val }),
            });

            const data = await res.json();

            // Добавляем ответ бота
            ChatUI.appendMessage({
              type: "text",
              content: { text: data.reply || "Ошибка: нет ответа" },
              position: "left",
            });
          } catch (err) {
            console.error("Ошибка API:", err);
            ChatUI.appendMessage({
              type: "text",
              content: { text: "⚠️ Ошибка при обращении к серверу" },
              position: "left",
            });
          }
        }
      },
    },
    el
  );
});