// server/index.js (или ваш текущий файл сервера)

import express from "express";
import cors from "cors";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const app = express();
const PORT = process.env.PORT || 3001;

// --- Paths для файлового хранилища ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "feedback.jsonl");

// --- Middleware ---
app.use(express.json());
app.use(
  cors({
    origin: ["http://localhost:5500", "http://127.0.0.1:5500"],
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  })
);

// --- Healthcheck ---
app.get("/api/health", (req, res) => res.json({ ok: true }));

// --- Приём сообщений формы и сохранение в файл ---
app.post("/api/feedback", async (req, res) => {
  try {
    const { name, email, message } = req.body || {};
    if (!name || !email || !message) {
      return res.status(400).json({ ok: false, error: "Missing fields" });
    }

    // гарантируем наличие папки
    await fs.mkdir(DATA_DIR, { recursive: true });

    const item = {
      id: typeof randomUUID === "function"
        ? randomUUID()
        : `${Date.now()}-${Math.round(Math.random() * 1e6)}`,
      name,
      email,
      message,
      createdAt: new Date().toISOString(),
      ip: req.ip,
      userAgent: req.get("user-agent") || null,
    };

    // JSONL: по одной JSON-записи в строку
    await fs.appendFile(DATA_FILE, JSON.stringify(item) + "\n", "utf8");

    return res.status(201).json({ ok: true, item });
  } catch (err) {
    console.error("Failed to save feedback:", err);
    return res.status(500).json({ ok: false, error: "Failed to save" });
  }
});

// --- Просмотр сохранённых сообщений (в учебных целях) ---
app.get("/api/feedback", async (_req, res) => {
  try {
    // читаем файл, если его ещё нет — считаем, что пусто
    let raw = "";
    try {
      raw = await fs.readFile(DATA_FILE, "utf8");
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
    }

    const items =
      raw
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line)) || [];

    return res.json({ ok: true, items });
  } catch (err) {
    console.error("Failed to read feedback:", err);
    return res.status(500).json({ ok: false, error: "Failed to read" });
  }
});

// --- Запуск ---
app.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`);
});