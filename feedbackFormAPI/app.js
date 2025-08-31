import express from "express";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(cors({ origin: "*" }));

// Healthcheck
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// Feedback endpoint
app.post("/api/feedback", (req, res) => {
  const { name, email, message } = req.body || {};

  if (!name || !email || !message) {
    return res
      .status(400)
      .json({ ok: false, error: "Missing required fields" });
  }

  const id = Date.now().toString();
  console.log("New feedback:", { id, name, email, message });

  res.json({
    ok: true,
    id,
    name,
    email,
    message,
  });
});

// Root route
app.get("/", (_req, res) => {
  res.send("✅ Feedback API is running on Render 🚀");
});

export default app;