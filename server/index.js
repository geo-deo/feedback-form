// server/index.js
import express from "express";
import cors from "cors";
import crypto from "crypto";
import db from "./db.js";
import "dotenv/config";

function requireAdmin(req, res, next) {
  const token = req.header("X-Admin-Token") || "";
  if (token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }
  next();
}

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(cors({
  origin: ["http://localhost:5500", "http://127.0.0.1:5500"],
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "X-Admin-Token", "Authorization"]
}));

// Healthcheck
app.get("/api/health", (req, res) => res.json({ ok: true }));

// CREATE: Приём сообщений формы
app.post("/api/feedback", (req, res) => {
  const { name, email, message } = req.body || {};
  if (!name || !email || !message) {
    return res.status(400).json({ ok: false, error: "Missing fields" });
  }
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const ip = req.ip;
  const userAgent = req.headers["user-agent"] || "";

  const sql = `
    INSERT INTO feedback (id, name, email, message, ip, userAgent, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  db.run(sql, [id, name, email, message, ip, userAgent, createdAt], function (err) {
    if (err) return res.status(500).json({ ok: false, error: "DB insert failed" });
    return res.json({ ok: true, id });
  });
});

// READ: Список сообщений
app.get("/api/feedback", requireAdmin, (req, res) => {
  const sql = `SELECT id, name, email, message, ip, userAgent, createdAt
               FROM feedback ORDER BY datetime(createdAt) DESC`;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ ok: false, error: "DB read failed" });
    return res.json({ ok: true, items: rows });
  });
});

// UPDATE: Редактирование сообщения (частично)
app.patch("/api/feedback/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  const { name, email, message } = req.body || {};
  // собираем динамический апдейт
  const fields = [];
  const params = [];
  if (name !== undefined) { fields.push("name = ?"); params.push(name); }
  if (email !== undefined) { fields.push("email = ?"); params.push(email); }
  if (message !== undefined) { fields.push("message = ?"); params.push(message); }
  if (fields.length === 0) return res.status(400).json({ ok: false, error: "Nothing to update" });

  const sql = `UPDATE feedback SET ${fields.join(", ")} WHERE id = ?`;
  params.push(id);
  db.run(sql, params, function (err) {
    if (err) return res.status(500).json({ ok: false, error: "DB update failed" });
    if (this.changes === 0) return res.status(404).json({ ok: false, error: "Not found" });
    return res.json({ ok: true });
  });
});

// DELETE: Удаление сообщения
app.delete("/api/feedback/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  const sql = `DELETE FROM feedback WHERE id = ?`;
  db.run(sql, [id], function (err) {
    if (err) return res.status(500).json({ ok: false, error: "DB delete failed" });
    if (this.changes === 0) return res.status(404).json({ ok: false, error: "Not found" });
    return res.json({ ok: true });
  });
});

app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));