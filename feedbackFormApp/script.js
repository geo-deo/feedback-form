const form = document.getElementById("contactForm");
const success = document.getElementById("success");
const btnSpinner = document.getElementById("btnSpinner");
const btnLabel = document.getElementById("btnLabel");

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const API_URL = "http://localhost:3001/api/feedback"; // твой backend

function setError(id, hasError) {
  const input = document.getElementById(id);
  const hint = document.querySelector(`[data-error-for="${id}"]`);
  if (!input || !hint) return;

  if (hasError) {
    hint.classList.remove("hidden");
    input.classList.remove("border-gray-300");
    input.classList.add("border-red-500", "focus:ring-red-500", "focus:border-red-500");
    input.setAttribute("aria-invalid", "true");
  } else {
    hint.classList.add("hidden");
    input.classList.remove("border-red-500", "focus:ring-red-500", "focus:border-red-500");
    input.classList.add("border-gray-300");
    input.removeAttribute("aria-invalid");
  }
}

function validate() {
  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const message = document.getElementById("message").value.trim();

  let valid = true;

  setError("name", name.length < 2);
  if (name.length < 2) valid = false;

  setError("email", !emailRe.test(email));
  if (!emailRe.test(email)) valid = false;

  setError("message", message.length < 5);
  if (message.length < 5) valid = false;

  return valid;
}

function setLoading(isLoading) {
  if (isLoading) {
    btnSpinner.classList.remove("hidden");
    btnLabel.textContent = "Отправка...";
    form.querySelector("button").disabled = true;
  } else {
    btnSpinner.classList.add("hidden");
    btnLabel.textContent = "Отправить";
    form.querySelector("button").disabled = false;
  }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  success.classList.add("hidden");

  if (!validate()) return;

  setLoading(true);

  const formData = new FormData(form);
  const payload = {
    name: formData.get("name").trim(),
    email: formData.get("email").trim(),
    message: formData.get("message").trim(),
  };

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok || !data.ok) {
      throw new Error(data?.error || "Ошибка при отправке");
    }

    // Успех
    form.reset();
    success.textContent = `🎉 Спасибо! Ваше сообщение отправлено (ID: ${data.id})`;
    success.classList.remove("hidden");
    success.scrollIntoView({ behavior: "smooth", block: "center" });
  } catch (err) {
    alert(`Ошибка: ${err.message}`);
  } finally {
    setLoading(false);
  }
});

// live-валидация при вводе
["name", "email", "message"].forEach((id) => {
  document.getElementById(id).addEventListener("input", () => validate());
});