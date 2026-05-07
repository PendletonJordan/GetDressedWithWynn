import { Router } from "express";
import { generateRecommendation, getTodayRecommendation } from "../services/recommendation.js";

export const recommendationRouter = Router();

// GET /api/recommendation/:profileId
// Returns today's stored recommendation without regenerating (fast — used by Alexa)
recommendationRouter.get("/:profileId", async (req, res) => {
  try {
    const existing = await getTodayRecommendation(req.params.profileId);
    if (!existing) {
      return res.status(404).json({ error: "No recommendation generated yet for today" });
    }
    res.json(existing);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/recommendation/:profileId/generate
// Fetches weather + events, calls Claude, stores and returns the recommendation
recommendationRouter.post("/:profileId/generate", async (req, res) => {
  try {
    const result = await generateRecommendation(req.params.profileId);
    res.json(result);
  } catch (err) {
    console.error("Recommendation generation failed:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/recommendation/cron
// Called by the cron job each morning — generates for ALL profiles
// Requires the same API_SECRET auth as other endpoints
recommendationRouter.post("/cron/all", async (req, res) => {
  const { supabase } = await import("../supabase.js");

  const { data: profiles, error } = await supabase.from("profiles").select("id, name");
  if (error) return res.status(500).json({ error: error.message });

  const results = await Promise.allSettled(
    profiles.map((p) => generateRecommendation(p.id))
  );

  const summary = results.map((r, i) => ({
    profileId: profiles[i].id,
    name: profiles[i].name,
    status: r.status,
    error: r.reason?.message,
  }));

  res.json({ generated: summary.filter((s) => s.status === "fulfilled").length, summary });
});
