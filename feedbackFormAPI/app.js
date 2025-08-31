import express from "express";
import cors from "cors";
import db from "./server/db.js";   // твоя SQLite

const app = express();
app.use(express.json());
app.use(cors({ origin: "*" }));

// Healthcheck
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// POST /api/feedback — создать запись
app.post("/api/feedback", (req, res) => {
  const { name, email, message } = req.body || {};
  if (!name || !email || !message) {
    return res.status(400).json({ ok: false, error: "Missing required fields" });
  }

  const id = Date.now().toString();
  const createdAt = new Date().toISOString();
  const ip = req.ip;
  const userAgent = req.get("User-Agent");

  db.run(
    `INSERT INTO feedback (id, name, email, message, ip, userAgent, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, name, email, message, ip, userAgent, createdAt],
    (err) => {
      if (err) return res.status(500).json({ ok: false, error: "DB error" });
      res.json({ ok: true, id, name, email, message, createdAt });
    }
  );
});

// GET /api/feedback — список с фильтрацией + пагинацией
app.get("/api/feedback", (req, res) => {
  const { page = 1, limit = 10, search = "", dateFrom, dateTo } = req.query;
  const offset = (page - 1) * limit;

  let where = [];
  let params = [];

  if (search) {
    where.push("(name LIKE ? OR email LIKE ? OR message LIKE ?)");
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (dateFrom) {
    where.push("datetime(createdAt) >= datetime(?)");
    params.push(dateFrom);
  }
  if (dateTo) {
    where.push("datetime(createdAt) <= datetime(?)");
    params.push(dateTo);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  db.all(
    `SELECT * FROM feedback ${whereSql} ORDER BY datetime(createdAt) DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset],
    (err, rows) => {
      if (err) return res.status(500).json({ ok: false, error: "DB error" });

      db.get(
        `SELECT COUNT(*) as count FROM feedback ${whereSql}`,
        params,
        (err2, row) => {
          if (err2) return res.status(500).json({ ok: false, error: "DB error" });

          const total = row.count;
          const totalPages = Math.ceil(total / limit);

          res.json({
            ok: true,
            items: rows,
            total,
            totalPages,
            page: Number(page),
          });
        }
      );
    }
  );
});

// PATCH /api/feedback/:id — обновить запись
app.patch("/api/feedback/:id", (req, res) => {
  const { id } = req.params;
  const { name, email, message } = req.body || {};

  db.run(
    `UPDATE feedback SET name=?, email=?, message=? WHERE id=?`,
    [name, email, message, id],
    function (err) {
      if (err) return res.status(500).json({ ok: false, error: "DB error" });
      if (this.changes === 0) return res.status(404).json({ ok: false, error: "Not found" });

      res.json({ ok: true, id, name, email, message });
    }
  );
});

// DELETE /api/feedback/:id — удалить запись
app.delete("/api/feedback/:id", (req, res) => {
  const { id } = req.params;
  db.run(`DELETE FROM feedback WHERE id=?`, [id], function (err) {
    if (err) return res.status(500).json({ ok: false, error: "DB error" });
    if (this.changes === 0) return res.status(404).json({ ok: false, error: "Not found" });
    res.json({ ok: true, id });
  });
});

// Root
app.get("/", (_req, res) => {
  res.send("✅ Feedback API with SQLite is running 🚀");
});

export default app;