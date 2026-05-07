import Anthropic from "@anthropic-ai/sdk";
import { getWeather } from "./weather.js";
import { supabase } from "../supabase.js";

const client = new Anthropic();

/**
 * Generates a full outfit recommendation for a child profile.
 * Fetches live weather + today's events, calls Claude, stores result.
 *
 * Returns the recommendation object.
 */
export async function generateRecommendation(profileId) {
  // 1. Load profile
  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", profileId)
    .single();

  if (profileErr || !profile) throw new Error("Profile not found");

  // 2. Get today's events
  const todayStr = new Date().toISOString().split("T")[0];
  const { data: events } = await supabase
    .from("events")
    .select("*")
    .eq("profile_id", profileId)
    .eq("date", todayStr);

  const spiritEvents = (events || []).filter((e) => e.type === "spirit");
  const sportsEvents = (events || []).filter((e) => e.type === "sports");
  const otherEvents = (events || []).filter((e) => e.type === "other");

  // 3. Get live weather
  let weather;
  try {
    weather = await getWeather(profile.city);
  } catch {
    // Fall back to a neutral default so we don't block the whole recommendation
    weather = { temp: 65, high: 70, low: 55, condition: "Partly Cloudy", rain: 10, wind: 8 };
  }

  // 4. Build Claude prompt
  const prompt = `You are a friendly morning outfit assistant helping a ${profile.age}-year-old child named ${profile.name} who goes to ${profile.school} in ${profile.city}.

Today is ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.

Today's context:
- Weather: ${weather.temp}°F (feels like ${weather.feelsLike}°F), ${weather.condition}
  High: ${weather.high}°F, Low: ${weather.low}°F
  Rain chance: ${weather.rain}%, Wind: ${weather.wind} mph
- School spirit events: ${spiritEvents.length > 0 ? spiritEvents.map((e) => `${e.label} (${e.detail})`).join(", ") : "None"}
- Sports today: ${sportsEvents.length > 0 ? sportsEvents.map((e) => `${e.label} — ${e.detail}`).join(", ") : "None"}
- Other events: ${otherEvents.length > 0 ? otherEvents.map((e) => e.label).join(", ") : "None"}
- ${profile.name}'s favorite colors: ${(profile.favorite_colors || []).join(", ")}

Rules:
- If there's a spirit day, the outfit MUST follow the theme
- If there's a sport later, prioritize athletic/comfortable clothing they can move in or change from easily
- Account for morning temperature (kids often walk to school) — suggest a jacket if below 60°F or rain is likely
- Keep it practical and age-appropriate
- Be encouraging and fun in tone

Respond ONLY with a valid JSON object (no markdown, no backticks):
{
  "title": "short catchy outfit title",
  "outfit": [
    {"icon": "single emoji", "label": "item name", "note": "optional short tip"},
    {"icon": "single emoji", "label": "item name", "note": "optional short tip"},
    {"icon": "single emoji", "label": "item name", "note": "optional short tip"},
    {"icon": "single emoji", "label": "item name", "note": "optional short tip"}
  ],
  "reasoning": "2-3 sentences explaining the choices, connecting weather + events in a kid-friendly way",
  "alexaScript": "A warm, upbeat 2-3 sentence morning briefing written for a child. Mention what to wear, why, and any exciting event today. End with encouragement.",
  "weatherSummary": "one short sentence about today's weather for display"
}`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = message.content[0].text.trim().replace(/```json|```/g, "");
  const recommendation = JSON.parse(raw);

  // 5. Store in Supabase so Alexa can retrieve it without re-generating
  const { data: saved } = await supabase
    .from("recommendations")
    .upsert({
      profile_id: profileId,
      date: todayStr,
      data: recommendation,
      weather,
      generated_at: new Date().toISOString(),
    }, { onConflict: "profile_id,date" })
    .select()
    .single();

  return { recommendation, weather, events: events || [], savedId: saved?.id };
}

/**
 * Retrieves today's stored recommendation without regenerating.
 * Returns null if none exists yet.
 */
export async function getTodayRecommendation(profileId) {
  const todayStr = new Date().toISOString().split("T")[0];
  const { data } = await supabase
    .from("recommendations")
    .select("*")
    .eq("profile_id", profileId)
    .eq("date", todayStr)
    .single();

  return data || null;
}
