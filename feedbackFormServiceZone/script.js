// === Настройка: укажи URL твоего API ===
const API_URL = "http://localhost:3000/api/feedback"; 
// ⚠️ Когда задеплоим на Render — заменишь на свой внешний URL, например:
// const API_URL = "https://feedback-api.onrender.com/api/feedback";

async function fetchFeedback() {
  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error(`Ошибка API: ${res.status}`);
    const data = await res.json();

    if (!data.ok) throw new Error(data.error || "Ошибка ответа API");
    renderTable(data.items || []);
  } catch (err) {
    console.error("Ошибка при загрузке:", err);
    document.getElementById("feedbackTable").innerHTML =
      `<tr><td colspan="5" style="color:red;">Ошибка загрузки данных</td></tr>`;
  }
}

function renderTable(items) {
  const tbody = document.getElementById("feedbackTable");
  tbody.innerHTML = "";

  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="5">Нет данных</td></tr>`;
    return;
  }

  for (const fb of items) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${fb.name}</td>
      <td>${fb.email}</td>
      <td>${fb.message}</td>
      <td>${new Date(fb.createdAt).toLocaleString()}</td>
      <td>${fb.ip || "-"}</td>
    `;
    tbody.appendChild(tr);
  }
}

// Запуск при загрузке страницы
document.addEventListener("DOMContentLoaded", fetchFeedback);