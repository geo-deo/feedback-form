// ⚡️ Вставь сюда свои данные из Firebase Console → Project Settings → SDK setup
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCCE7xEdDgukUVN_zNRQwbg9LHiuHCSDCA",
  authDomain: "feedback-form-c4ea0.firebaseapp.com",
  projectId: "feedback-form-c4ea0",
  storageBucket: "feedback-form-c4ea0.firebasestorage.app",
  messagingSenderId: "617989343890",
  appId: "1:617989343890:web:4a5fd70d58267b35f4b44b",
  measurementId: "G-JRV5EMMSTE"
};

// Инициализация Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("form");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.querySelector('input[type="email"]').value.trim();
    const password = document.querySelector('input[type="password"]').value.trim();

    try {
      // Авторизация в Firebase
      const userCredential = await auth.signInWithEmailAndPassword(email, password);
      const user = userCredential.user;

      console.log("Signed in:", user.email);

      // ✅ редирект в чат после логина
      window.location.href = "/chat.html";
    } catch (err) {
      console.error(err);
      alert("Ошибка: " + err.message);
    }
  });
});