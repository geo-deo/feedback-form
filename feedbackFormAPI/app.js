// server/app.js
import express from "express";
import cors from "cors";
import prisma from "./db.js"; // PrismaClient
import { v4 as uuidv4 } from "uuid";
import OpenAI from "openai";
import admin from "./firebase.js"; // 🔹 Firebase SDK

const app = express();
app.use(express.json());
// CORS — разрешаем запросы с фронтенда на Render
app.use(cors({
  origin: true,
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));app.options("*", cors());


// Инициализация OpenAI
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 🔹 Middleware для проверки токена Firebase
async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.split(" ")[1]; // "Bearer <token>"

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded; // { uid, email, ... }
    next();
  } catch (err) {
    console.error("Token verification error:", err);
    res.status(401).json({ error: "Invalid token" });
  }
}

// Healthcheck
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// ===== AI Chat Endpoint =====
app.post("/api/ai-chat", verifyToken, async (req, res) => {
  const { message } = req.body;
  if (!message || !String(message).trim()) {
    return res.status(400).json({ error: "No message provided" });
  }

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Ты — дружелюбный ассистент. ВСЕГДА отвечай на том же языке, на котором был задан вопрос пользователем.",
        },
        { role: "user", content: message },
      ],
    });

    const reply = completion.choices[0].message.content;

    // Log per-user chat history (best-effort)
    try {
      await prisma.chatLog.createMany({
        data: [
          {
            userId: req.user.uid,
            userEmail: req.user.email || null,
            role: "user",
            content: String(message),
          },
          {
            userId: req.user.uid,
            userEmail: req.user.email || null,
            role: "assistant",
            content: String(reply),
          },
        ],
      });
    } catch (e) {
      console.error("ChatLog error:", e);
    }

    res.json({ reply });
  } catch (err) {
    console.error("AI error:", err);
    res.status(500).json({ error: "AI request failed" });
  }
});

// Chat history for current user
app.get("/api/ai-chat/history", verifyToken, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const items = await prisma.chatLog.findMany({
      where: { userId: req.user.uid },
      orderBy: { createdAt: "asc" },
      take: limit,
    });
    res.json({ ok: true, items });
  } catch (error) {
    console.error("ChatLog fetch error:", error);
    res.status(500).json({ ok: false, error: "DB error" });
  }
});

// Public chat endpoint (no auth, no logging) to keep ChatUI working
app.post("/api/ai-chat-public", async (req, res) => {
  const { message } = req.body || {};
  if (!message || !String(message).trim()) {
    return res.status(400).json({ error: "No message provided" });
  }
  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Ты — краткий и вежливый помощник." },
        { role: "user", content: message },
      ],
    });
    res.json({ reply: completion.choices?.[0]?.message?.content || "" });
  } catch (err) {
    console.error("AI error:", err);
    res.status(500).json({ error: "AI request failed" });
  }
});

// ===== Feedback Endpoints =====

// POST /api/feedback — создать запись
app.post("/api/feedback", async (req, res) => {
  try {
    const { name, email, message } = req.body || {};
    if (!name || !email || !message) {
      return res
        .status(400)
        .json({ ok: false, error: "Missing required fields" });
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

// 🔹 Тестовый защищённый роут
app.get("/api/secure", verifyToken, (req, res) => {
  res.json({
    ok: true,
    uid: req.user.uid,
    email: req.user.email,
  });
});

// POST /api/login — авторизация
app.post("/api/login", (req, res) => {
  const { email, password } = req.body || {};

  // пока что захардкодим одного пользователя
  if (email === "admin@test.com" && password === "123456") {
    return res.json({ ok: true, token: "fake-jwt-token" });
  }

  res.status(401).json({ ok: false, error: "Invalid credentials" });
});


// Root
app.get("/", (_req, res) => {
  res.send("✅ Feedback API with PostgreSQL + Prisma + OpenAI is running 🚀");
});

export default app;

