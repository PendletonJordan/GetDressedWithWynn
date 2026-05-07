import { Router } from "express";
import { supabase } from "../supabase.js";

export const eventsRouter = Router();

// GET /api/events/:profileId  — all events for a profile
// Optional ?month=2026-05 to filter by month
eventsRouter.get("/:profileId", async (req, res) => {
  let query = supabase
    .from("events")
    .select("*")
    .eq("profile_id", req.params.profileId)
    .order("date", { ascending: true });

  if (req.query.month) {
    // e.g. ?month=2026-05
    query = query
      .gte("date", `${req.query.month}-01`)
      .lte("date", `${req.query.month}-31`);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /api/events/:profileId/today
eventsRouter.get("/:profileId/today", async (req, res) => {
  const today = new Date().toISOString().split("T")[0];
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("profile_id", req.params.profileId)
    .eq("date", today);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/events/:profileId  — add one event
eventsRouter.post("/:profileId", async (req, res) => {
  const { date, type, label, detail } = req.body;

  if (!date || !label) {
    return res.status(400).json({ error: "date and label are required" });
  }

  const { data, error } = await supabase
    .from("events")
    .insert({ profile_id: req.params.profileId, date, type: type || "other", label, detail: detail || "" })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// POST /api/events/:profileId/bulk  — import many events (from PDF parse)
eventsRouter.post("/:profileId/bulk", async (req, res) => {
  const { events } = req.body;

  if (!Array.isArray(events) || events.length === 0) {
    return res.status(400).json({ error: "events must be a non-empty array" });
  }

  const rows = events.map((e) => ({
    profile_id: req.params.profileId,
    date: e.date,
    type: e.type || "other",
    label: e.label,
    detail: e.detail || "",
  }));

  const { data, error } = await supabase.from("events").insert(rows).select();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ imported: data.length, events: data });
});

// DELETE /api/events/:profileId/:eventId
eventsRouter.delete("/:profileId/:eventId", async (req, res) => {
  const { error } = await supabase
    .from("events")
    .delete()
    .eq("id", req.params.eventId)
    .eq("profile_id", req.params.profileId);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ deleted: true });
});
