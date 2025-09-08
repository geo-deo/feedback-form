// server/app.js
import express from "express";
import cors from "cors";
import prisma from "./db.js"; // теперь это PrismaClient
import { v4 as uuidv4 } from "uuid";

const app = express();
app.use(express.json());
app.use(cors({ origin: "*" }));

// Healthcheck
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// POST /api/feedback — создать запись
app.post("/api/feedback", async (req, res) => {
  try {
    const { name, email, message } = req.body || {};
    if (!name || !email || !message) {
      return res.status(400).json({ ok: false, error: "Missing required fields" });
    }

    const feedback = await prisma.feedback.create({
      data: {
        id: uuidv4(),
        name,
        email,
        message,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
      },
    });

    res.json({ ok: true, feedback });
  } catch (error) {
    console.error("DB error:", error);
    res.status(500).json({ ok: false, error: "DB error" });
  }
});

// GET /api/feedback — список с фильтрацией + пагинацией
app.get("/api/feedback", async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", dateFrom, dateTo } = req.query;
    const skip = (page - 1) * limit;

    const where = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { message: { contains: search, mode: "insensitive" } },
      ];
    }
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const [items, total] = await Promise.all([
      prisma.feedback.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: Number(skip),
        take: Number(limit),
      }),
      prisma.feedback.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({
      ok: true,
      items,
      total,
      totalPages,
      page: Number(page),
    });
  } catch (error) {
    console.error("DB error:", error);
    res.status(500).json({ ok: false, error: "DB error" });
  }
});

// PATCH /api/feedback/:id — обновить запись
app.patch("/api/feedback/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, message } = req.body || {};

    const feedback = await prisma.feedback.update({
      where: { id },
      data: { name, email, message },
    });

    res.json({ ok: true, feedback });
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ ok: false, error: "Not found" });
    }
    console.error("DB error:", error);
    res.status(500).json({ ok: false, error: "DB error" });
  }
});

// DELETE /api/feedback/:id — удалить запись
app.delete("/api/feedback/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.feedback.delete({ where: { id } });

    res.json({ ok: true, id });
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ ok: false, error: "Not found" });
    }
    console.error("DB error:", error);
    res.status(500).json({ ok: false, error: "DB error" });
  }
});

// Root
app.get("/", (_req, res) => {
  res.send("✅ Feedback API with PostgreSQL + Prisma is running 🚀");
});

export default app;