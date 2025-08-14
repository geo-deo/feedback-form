import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(cors({
  origin: ["http://localhost:5500", "http://127.0.0.1:5500"],
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));

// Простой healthcheck
app.get("/api/health", (req, res) => res.json({ ok: true }));

// Приём сообщений формы
app.post("/api/feedback", (req, res) => {
  const { name, email, message } = req.body || {};

  if (!name || !email || !message) {
    return res.status(400).json({ ok: false, error: "Missing fields" });
  }

  // Логируем полученные данные в терминал
  console.log("📩 Новое сообщение из формы:", {
    name,
    email,
    message,
    time: new Date().toLocaleString(),
    ip: req.ip
  });

  // Эхо-ответ
  return res.status(201).json({
    ok: true,
    received: { name, email, message },
    id: Date.now()
  });
});

app.listen(PORT, () => console.log(`API on http://localhost:${PORT}`));
