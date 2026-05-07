import "dotenv/config";
import express from "express";
import cors from "cors";

import { requireAuth } from "./middleware/auth.js";
import { profileRouter } from "./routes/profile.js";
import { eventsRouter } from "./routes/events.js";
import { recommendationRouter } from "./routes/recommendation.js";
import { uploadRouter } from "./routes/upload.js";

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ────────────────────────────────────────────────────────────────

app.use(cors({
  origin: process.env.FRONTEND_URL || "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json());

// ── Health check (no auth — used by Render to confirm service is up) ─────────

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Protected API routes ──────────────────────────────────────────────────────

app.use("/api", requireAuth);
app.use("/api/profile", profileRouter);
app.use("/api/events", eventsRouter);
app.use("/api/recommendation", recommendationRouter);
app.use("/api/upload", uploadRouter);

// ── 404 + error handlers ──────────────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || "Internal server error" });
});

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`🚀 Morning Outfit Agent API running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
});
