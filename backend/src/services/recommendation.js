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
  // Strip state from city string — OpenWeatherMap prefers "Raleigh" over "Raleigh, NC"
  const cityForWeather = profile.city.split(",")[0].trim();
  let weather;
  try {
    weather = await getWeather(cityForWeather);
  } catch {
    // Fall back to a neutral default so we don't block the whole recommendation
    weather = { temp: 65, high: 70, low: 55, condition: "Partly Cloudy", rain: 10, wind: 8 };
  }

  // 4. Build Claude prompt
  const prompt = `You are a practical morning outfit assistant helping a ${profile.age}-year-old child named ${profile.name} who goes to ${profile.school}.

Today is ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.

Today's context:
- Weather: ${weather.temp}°F (feels like ${weather.feelsLike}°F), ${weather.condition}
  High: ${weather.high}°F, Low: ${weather.low}°F
  Rain chance: ${weather.rain}%, Wind: ${weather.wind} mph
- School spirit events: ${spiritEvents.length > 0 ? spiritEvents.map((e) => `${e.label} (${e.detail})`).join(", ") : "None"}
- Sports today: ${sportsEvents.length > 0 ? sportsEvents.map((e) => `${e.label} — ${e.detail}`).join(", ") : "None"}
- Other events: ${otherEvents.length > 0 ? otherEvents.map((e) => e.label).join(", ") : "None"}
- ${profile.name}'s favorite colors: ${(profile.favorite_colors || []).join(", ")}

Clothing rules — always use these generic categories, never specific brands or styles:
- Top: "short sleeve shirt" (65°F+), "long sleeve shirt" (50–65°F), or "sweatshirt" (below 50°F)
- Bottom: "shorts" (70°F+), "pants" (below 70°F)
- Outerwear (only include if needed):
    - "light jacket" if 50–60°F or windy
    - "cold weather jacket" if below 50°F
    - "rain jacket" if rain chance is 40%+ regardless of temp
- Footwear: "sneakers" normally, "rain boots" if rain chance is 60%+
- If there's a spirit day the outfit MUST follow the theme — mention the color or theme in the label (e.g. "blue long sleeve shirt")
- If there's a sport, recommend bottoms they can move in (always "athletic shorts" or "athletic pants" for sports days regardless of temp — they can change)
- Always recommend exactly 3 or 4 items total — no more
- Never recommend both a light jacket AND a cold weather jacket
- Never recommend both shorts AND pants

Respond ONLY with a valid JSON object (no markdown, no backticks):
{
  "title": "short catchy outfit title",
  "outfit": [
    {"icon": "single emoji", "label": "generic item name", "note": "one short practical tip"},
    {"icon": "single emoji", "label": "generic item name", "note": "one short practical tip"},
    {"icon": "single emoji", "label": "generic item name", "note": "one short practical tip"},
    {"icon": "single emoji", "label": "generic item name", "note": "one short practical tip"}
  ],
  "reasoning": "2-3 sentences explaining the choices based on the weather and events, written for a parent",
  "alexaScript": "A warm friendly 2-3 sentence morning briefing for a child. Say what to wear and why in simple terms. Mention any exciting event today. End with encouragement.",
  "weatherSummary": "one short sentence summarizing today's weather"
}`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-5",
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
