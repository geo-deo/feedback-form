// ⚡ Конфиг Firebase (возьми из Firebase Console → Project settings → Web app)
const firebaseConfig = {
  apiKey: "AIzaSyCCE7xEdDgukUVN_zNRQwbg9LHiuHCSDCA",
  authDomain: "feedback-form-c4ea0.firebaseapp.com",
  projectId: "feedback-form-c4ea0",
  storageBucket: "feedback-form-c4ea0.appspot.com", // исправлено
  messagingSenderId: "617989343890",
  appId: "1:617989343890:web:4a5fd70d58267b35f4b44b",
  measurementId: "G-JRV5EMMSTE"
};

// Инициализация Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

document.addEventListener("DOMContentLoaded", () => {
  const authSection = document.getElementById("authSection");
  const chatSection = document.getElementById("chatSection");
  const statusEl = document.getElementById("authStatus");
  const authBtn = document.getElementById("authBtn");
  const tabSignin = document.getElementById("tabSignin");
  const tabSignup = document.getElementById("tabSignup");
  let mode = "signin"; // signin | signup

  // 🔹 Переключение вкладок
  function setMode(newMode) {
    mode = newMode;
    if (mode === "signin") {
      tabSignin.classList.add("active");
      tabSignup.classList.remove("active");
      authBtn.textContent = "Sign In";
    } else {
      tabSignup.classList.add("active");
      tabSignin.classList.remove("active");
      authBtn.textContent = "Sign Up";
    }
  }
  tabSignin.addEventListener("click", () => setMode("signin"));
  tabSignup.addEventListener("click", () => setMode("signup"));

  // 🔹 Обработка логина/регистрации
  authBtn.addEventListener("click", async () => {
    const email = document.getElementById("authEmail").value;
    const password = document.getElementById("authPassword").value;

    try {
      let userCred;
      if (mode === "signup") {
        userCred = await auth.createUserWithEmailAndPassword(email, password);
        statusEl.textContent = "✅ Зарегистрирован: " + userCred.user.email;
      } else {
        userCred = await auth.signInWithEmailAndPassword(email, password);
        statusEl.textContent = "✅ Вход выполнен: " + userCred.user.email;
      }

      // После успешного входа → показать чат
      afterLogin(userCred.user);

    } catch (err) {
      statusEl.textContent = "❌ Ошибка: " + err.message;
    }
  });

  // 🔹 После входа
  function afterLogin(user) {
    authSection.style.display = "none";
    chatSection.style.display = "flex";
    document.getElementById("userBar").textContent = "👤 " + user.email;
    startChat(user);
  }

  // 🔹 Логика чата
  function startChat(user) {
    const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.API_BASE) || "http://localhost:3001";
    const API_URL = API_BASE.replace(/\/$/, "") + "/api/ai-chat";

    const messagesEl = document.getElementById("messages");
    const inputEl = document.getElementById("inputMessage");
    const sendBtn = document.getElementById("sendBtn");

    function appendMessage(text, side = "left") {
      const el = document.createElement("div");
      el.className = "msg " + (side === "left" ? "left" : "right");
      el.textContent = text;
      messagesEl.appendChild(el);
      messagesEl.scrollTop = messagesEl.scrollHeight + 999;
    }

    function setTyping(on, text = "AI печатает…") {
      if (on) {
        if (!messagesEl.querySelector(".__typing")) {
          const el = document.createElement("div");
          el.className = "msg left __typing";
          el.innerHTML = '<span class="typing">' + text + "</span>";
          messagesEl.appendChild(el);
          messagesEl.scrollTop = messagesEl.scrollHeight + 999;
        }
      } else {
        const t = messagesEl.querySelector(".__typing");
        if (t) t.remove();
      }
    }

    appendMessage("👋 Привет! Чем могу быть полезен?", "left");

    async function sendMessage() {
      const val = inputEl.value.trim();
      if (!val) return;
      appendMessage(val, "right");
      inputEl.value = "";
      inputEl.focus();

      setTyping(true);

      try {
        const resp = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: val })
        });

        const data = await resp.json();
        setTyping(false);
        appendMessage(data.reply || "⚠️ Пустой ответ", "left");
      } catch (err) {
        setTyping(false);
        appendMessage("❌ Ошибка соединения: " + err.message, "left");
      }
    }

    sendBtn.addEventListener("click", sendMessage);
    inputEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }
});