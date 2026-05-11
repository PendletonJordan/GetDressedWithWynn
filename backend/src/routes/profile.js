import { Router } from "express";
import { supabase } from "../supabase.js";

export const profileRouter = Router();

// GET /api/profile/:id
profileRouter.get("/:id", async (req, res) => {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", req.params.id)
    .single();

  if (error) return res.status(404).json({ error: "Profile not found" });
  res.json(data);
});

// POST /api/profile  — create new profile
profileRouter.post("/", async (req, res) => {
  const { name, age, school, city, favorite_colors, alexa_enabled, wake_time, parsing_notes } = req.body;

  if (!name || !school || !city) {
    return res.status(400).json({ error: "name, school, and city are required" });
  }

  const { data, error } = await supabase
    .from("profiles")
    .insert({ name, age, school, city, favorite_colors, alexa_enabled, wake_time, parsing_notes })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// PUT /api/profile/:id  — update profile
profileRouter.put("/:id", async (req, res) => {
  const { name, age, school, city, favorite_colors, alexa_enabled, wake_time, parsing_notes } = req.body;

  const { data, error } = await supabase
    .from("profiles")
    .update({ name, age, school, city, favorite_colors, alexa_enabled, wake_time, parsing_notes, updated_at: new Date().toISOString() })
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});
