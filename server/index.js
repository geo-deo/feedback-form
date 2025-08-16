import express from "express";
import cors from "cors";
import crypto from "crypto";
import db from "./db.js";
import "dotenv/config";
import fetch from "node-fetch";

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

// AI Chat route
app.post("/api/ask", async (req, res) => {
  const { question } = req.body;

  if (!question) {
    return res.status(400).json({ ok: false, error: "Question is required" });
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: question }],
      }),
    });

    const data = await response.json();

    if (!data.choices || !data.choices[0]) {
      throw new Error("No response from OpenAI");
    }

    res.json({ ok: true, answer: data.choices[0].message.content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "OpenAI request failed" });
  }
});

// CREATE
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

// READ with search/filter/pagination
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

// UPDATE
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

// DELETE
app.delete("/api/feedback/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  const sql = `DELETE FROM feedback WHERE id = ?`;
  db.run(sql, [id], function (err) {
    if (err) return res.status(500).json({ ok: false, error: "DB delete failed" });
    if (this.changes === 0) return res.status(404).json({ ok: false, error: "Not found" });
    return res.json({ ok: true });
  });
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));