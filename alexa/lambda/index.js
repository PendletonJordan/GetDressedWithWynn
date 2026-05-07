const https = require("https");

// ── Config ────────────────────────────────────────────────────────────────────
// Set these as Lambda environment variables — never hardcode them here
const API_BASE    = process.env.API_BASE    || "https://getdressedwithwynn.onrender.com";
const API_SECRET  = process.env.API_SECRET  || "";
const PROFILE_ID  = process.env.PROFILE_ID  || "";
const CHILD_NAME  = process.env.CHILD_NAME  || "Wynn";

// ── Helper: call your Render backend ─────────────────────────────────────────
function fetchRecommendation() {
  return new Promise((resolve, reject) => {
    const url = `${API_BASE}/api/recommendation/${PROFILE_ID}`;
    const options = {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${API_SECRET}`,
        "Content-Type": "application/json",
      },
    };

    const req = https.request(url, options, (res) => {
      let body = "";
      res.on("data", (chunk) => { body += chunk; });
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          reject(new Error("Failed to parse response"));
        }
      });
    });

    req.on("error", reject);
    req.end();
  });
}

function generateRecommendation() {
  return new Promise((resolve, reject) => {
    const url = `${API_BASE}/api/recommendation/${PROFILE_ID}/generate`;
    const options = {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_SECRET}`,
        "Content-Type": "application/json",
      },
    };

    const req = https.request(url, options, (res) => {
      let body = "";
      res.on("data", (chunk) => { body += chunk; });
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          reject(new Error("Failed to parse response"));
        }
      });
    });

    req.on("error", reject);
    req.end();
  });
}

// ── Alexa response builders ───────────────────────────────────────────────────
function buildResponse(speechText, shouldEndSession = true) {
  return {
    version: "1.0",
    response: {
      outputSpeech: {
        type: "SSML",
        ssml: `<speak>${speechText}</speak>`,
      },
      shouldEndSession,
    },
  };
}

// ── Main handler ──────────────────────────────────────────────────────────────
exports.handler = async (event) => {
  console.log("Alexa event:", JSON.stringify(event, null, 2));

  const requestType = event.request.type;

  // ── Launch request (Alexa, open Get Dressed With Wynn) ───────────────────
  if (requestType === "LaunchRequest") {
    return buildResponse(
      `Hi ${CHILD_NAME}! Let me check what you should wear today. <break time="1s"/> ` +
      await getOutfitSpeech(),
      true
    );
  }

  // ── Intent request ────────────────────────────────────────────────────────
  if (requestType === "IntentRequest") {
    const intentName = event.request.intent.name;

    if (intentName === "WhatToWearIntent" || intentName === "AMAZON.HelpIntent") {
      return buildResponse(await getOutfitSpeech());
    }

    if (intentName === "AMAZON.StopIntent" || intentName === "AMAZON.CancelIntent") {
      return buildResponse(`Have a great day ${CHILD_NAME}!`);
    }
  }

  // ── Session ended ─────────────────────────────────────────────────────────
  if (requestType === "SessionEndedRequest") {
    return { version: "1.0", response: {} };
  }

  return buildResponse("Sorry, I didn't understand that. Try asking what you should wear today.");
};

// ── Get outfit speech text ────────────────────────────────────────────────────
async function getOutfitSpeech() {
  try {
    // First try to get today's stored recommendation
    let result = await fetchRecommendation();

    // If none exists yet (404), generate one on the fly
    if (result.status === 404) {
      console.log("No recommendation found, generating now...");
      result = await generateRecommendation();

      if (result.status !== 200) {
        return `Sorry ${CHILD_NAME}, I had trouble figuring out your outfit today. Check the app for details.`;
      }

      const rec = result.data.recommendation;
      return rec?.alexaScript || fallbackSpeech(result.data);
    }

    if (result.status !== 200) {
      return `Sorry ${CHILD_NAME}, I couldn't get your outfit recommendation right now. Try again in a moment.`;
    }

    // Stored recommendation — data.data is the recommendation object
    const rec = result.data.data;
    return rec?.alexaScript || `Good morning ${CHILD_NAME}! Check the Get Dressed With Wynn app for today's outfit.`;

  } catch (err) {
    console.error("Error fetching recommendation:", err);
    return `Sorry ${CHILD_NAME}, I'm having trouble connecting right now. Check the app for your outfit.`;
  }
}

function fallbackSpeech(data) {
  if (!data?.outfit) return `Good morning! Check the app for today's outfit.`;
  const items = data.outfit.map((i) => i.label).join(", ");
  return `Good morning ${CHILD_NAME}! Today you should wear: ${items}. Have a great day!`;
}
