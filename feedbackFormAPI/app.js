import express from "express";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(cors({ origin: "*" }));

// Healthcheck
app.get("/api/health", (_req, res) => res.json({ ok: true }));

export default app;