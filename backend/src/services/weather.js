import axios from "axios";

const BASE = "https://api.openweathermap.org/data/2.5";

/**
 * Fetch current weather for a city string or US zip code.
 * Accepts: "Raleigh", "Raleigh, NC", "27601", "27601,US"
 * Returns a clean object ready to pass into the Claude prompt.
 */
export async function getWeather(location) {
  const key = process.env.OPENWEATHER_API_KEY;
  if (!key) throw new Error("Missing OPENWEATHER_API_KEY");

  // Detect if location is a zip code (5 digits, optionally followed by ,US)
  const isZip = /^\d{5}(,\w{2})?$/.test(location.trim());

  // Build query params based on whether it's a zip or city name
  const locationParam = isZip
    ? { zip: `${location.trim().split(",")[0]},US` }
    : { q: location.split(",")[0].trim() };

  const sharedParams = { appid: key, units: "imperial" };

  // Fetch current conditions
  const { data } = await axios.get(`${BASE}/weather`, {
    params: { ...locationParam, ...sharedParams },
  });

  // Fetch forecast for today's high/low
  const { data: forecast } = await axios.get(`${BASE}/forecast`, {
    params: { ...locationParam, ...sharedParams, cnt: 8 },
  });

  const temps = forecast.list.map((f) => f.main.temp);
  const high = Math.round(Math.max(...temps));
  const low = Math.round(Math.min(...temps));

  return {
    temp: Math.round(data.main.temp),
    feelsLike: Math.round(data.main.feels_like),
    high,
    low,
    condition: mapCondition(data.weather[0].main),
    description: data.weather[0].description,
    rain: data.rain ? Math.round((data.rain["1h"] || 0) * 10) : getRainChance(forecast),
    wind: Math.round(data.wind.speed),
    humidity: data.main.humidity,
    city: data.name,
    country: data.sys.country,
  };
}

/** Map OWM condition codes to our simple labels */
function mapCondition(main) {
  const map = {
    Clear: "Sunny",
    Clouds: "Cloudy",
    Rain: "Rain",
    Drizzle: "Rain",
    Thunderstorm: "Storm",
    Snow: "Snow",
    Mist: "Cloudy",
    Fog: "Cloudy",
  };
  return map[main] || "Partly Cloudy";
}

/** Estimate rain chance from forecast pop (probability of precipitation) */
function getRainChance(forecast) {
  const pops = forecast.list.slice(0, 4).map((f) => (f.pop || 0) * 100);
  return Math.round(Math.max(...pops));
}
