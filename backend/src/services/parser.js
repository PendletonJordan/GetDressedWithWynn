import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

/**
 * Takes a PDF buffer, extracts its text, then asks Claude to
 * pull out structured events (date, type, label, detail).
 * Accepts optional parsingNotes to filter or contextualize results.
 *
 * Returns an array of event objects ready to insert into Supabase.
 */
export async function parsePdfEvents(buffer, profileId, parsingNotes = "") {
  // Step 1: Extract raw text from the PDF
  const { text } = await pdfParse(buffer);

  if (!text || text.trim().length < 20) {
    throw new Error("Could not extract readable text from this PDF");
  }

  // Step 2: Ask Claude to find and structure the events
  const message = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: `You are a helpful assistant that extracts school events and sports schedules from text.

${parsingNotes ? `Important context about this child:\n${parsingNotes}\n\nUse this context to filter results — for example if the child is on a specific team only include that team's games, ignore all other teams.` : ""}

Extract all relevant events from the following text. For each event, identify:
- date (in YYYY-MM-DD format, assume current year ${new Date().getFullYear()} if not specified)
- type: one of "spirit" (spirit days, dress-up days, themed days) or "sports" (games, practices, meets) or "other"
- label: short event name (e.g. "Pajama Day", "Soccer Game", "Tee Ball Game vs Tigers")
- detail: brief extra info like time, location, or dress requirement

Respond ONLY with a valid JSON array. No markdown, no explanation, just the array.
If you find no relevant events, return an empty array [].

Example format:
[
  {"date": "2026-05-21", "type": "spirit", "label": "Twin Day", "detail": "Dress like your best friend"},
  {"date": "2026-05-28", "type": "sports", "label": "Tee Ball Game vs Tigers", "detail": "9:00 AM - wear uniform"}
]

Text to parse:
---
${text.slice(0, 8000)}
---`,
      },
    ],
  });

  const raw = message.content[0].text.trim();

  try {
    const events = JSON.parse(raw);
    if (!Array.isArray(events)) throw new Error("Not an array");

    // Attach the profile id so they're scoped to this child
    return events.map((e) => ({
      profile_id: profileId,
      date: e.date,
      type: e.type || "other",
      label: e.label || "Untitled Event",
      detail: e.detail || "",
    }));
  } catch {
    throw new Error("Claude returned unexpected format when parsing PDF");
  }
}
