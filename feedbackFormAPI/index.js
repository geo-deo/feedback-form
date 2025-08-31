import express from "express";
import cors from "cors";
import crypto from "crypto";
import db from "./db.js";
import "dotenv/config";
import { v4 as uuidv4 } from "uuid";
import OpenAI from "openai";

function requireAdmin(req, res, next) {
  const token = req.header("X-Admin-Token") || "";
  if (token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }
  next();
}

const app = express();
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

app.use(express.json());
app.use(cors({
  origin: ["http://localhost:5500", "http://127.0.0.1:5500"],
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "X-Admin-Token", "Authorization"]
}));

// OpenAI client
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const OPENAI_MODEL = "gpt-4.1-mini";

// Healthcheck
app.get("/api/health", (req, res) => res.json({ ok: true }));

// Chat route with history
app.post("/api/chat", (req, res) => {
  const { sessionId = uuidv4(), message } = req.body || {};
  if (!message || !message.trim()) {
    return res.status(400).json({ ok: false, error: "Message is required" });
  }

  const now = new Date().toISOString();
  const insertSql = `INSERT INTO chat_messages (id, sessionId, role, content, createdAt) VALUES (?, ?, ?, ?, ?)`;

  db.run(insertSql, [uuidv4(), sessionId, "user", message.trim(), now], (err) => {
    if (err) return res.status(500).json({ ok: false, error: "DB insert failed (user)" });

    const loadSql = `SELECT role, content FROM chat_messages WHERE sessionId = ? ORDER BY datetime(createdAt) DESC LIMIT 20`;
    db.all(loadSql, [sessionId], async (selErr, rows) => {
      if (selErr) return res.status(500).json({ ok: false, error: "DB read failed (history)" });

      const history = rows.reverse().map(r => ({ role: r.role, content: r.content }));
      const messages = [
        { role: "system", content: "Отвечай кратко и дружелюбно." },
        ...history
      ];

      try {
        const completion = await client.chat.completions.create({
          model: OPENAI_MODEL,
          messages,
          temperature: 0.7,
        });

        const answer = completion.choices?.[0]?.message?.content?.trim() || "🤖 (нет ответа)";

        db.run(insertSql, [uuidv4(), sessionId, "assistant", answer, new Date().toISOString()], (insErr) => {
          if (insErr) console.error("DB insert failed (assistant)", insErr);
        });

        return res.json({ ok: true, answer, reply: answer, sessionId });
      } catch (e) {
        console.error("OpenAI error", e);
        return res.status(500).json({
          ok: false,
          error: "OpenAI request failed",
          answer: "⚠️ Ошибка при запросе к модели",
          reply: "⚠️ Ошибка при запросе к модели",
          sessionId
        });
      }
    });
  });
});

// FEEDBACK CRUD
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

app.get("/api/feedback", requireAdmin, (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit ?? "10", 10)));
  const search   = (req.query.search ?? "").trim();
  const dateFrom = (req.query.dateFrom ?? "").trim();
  const dateTo   = (req.query.dateTo ?? "").trim();

  const where = [];
  const params = [];

  if (search) {
    where.push("(name LIKE ? OR email LIKE ? OR message LIKE ?)");
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (dateFrom) { where.push("datetime(createdAt) >= datetime(?)"); params.push(dateFrom); }
  if (dateTo)   { where.push("datetime(createdAt) <= datetime(?)"); params.push(dateTo); }

  const whereSQL = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const offset = (page - 1) * limit;

  const countSql = `SELECT COUNT(*) AS total FROM feedback ${whereSQL}`;
  const dataSql  = `
    SELECT id, name, email, message, ip, userAgent, createdAt
    FROM feedback
    ${whereSQL}
    ORDER BY datetime(createdAt) DESC
    LIMIT ? OFFSET ?
  `;

  db.get(countSql, params, (err, cRow) => {
    if (err) return res.status(500).json({ ok: false, error: "DB count failed" });
    const total = cRow?.total ?? 0;

    db.all(dataSql, [...params, limit, offset], (err2, rows) => {
      if (err2) return res.status(500).json({ ok: false, error: "DB read failed" });
      res.json({
        ok: true,
        data: rows,
        items: rows,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
    });
  });
});

app.patch("/api/feedback/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  const { name, email, message } = req.body || {};
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

app.delete("/api/feedback/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  const sql = `DELETE FROM feedback WHERE id = ?`;
  db.run(sql, [id], function (err) {
    if (err) return res.status(500).json({ ok: false, error: "DB delete failed" });
    if (this.changes === 0) return res.status(404).json({ ok: false, error: "Not found" });
    return res.json({ ok: true });
  });
});

// --- Новый эндпоинт /api/ask для простого вызова OpenAI ---
app.post("/api/ask", async (req, res) => {
  const { question } = req.body || {};
  if (!question) return res.status(400).json({ error: "Вопрос не передан" });

  try {
    const completion = await client.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [{ role: "user", content: question }],
    });

    const answer = completion.choices[0].message.content;
    res.json({ answer });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Ошибка при запросе к OpenAI" });
  }
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));