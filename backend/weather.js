import axios from "axios";

const BASE = "https://api.openweathermap.org/data/2.5";

/**
 * Fetch current weather for a city string like "Raleigh, NC".
 * Returns a clean object ready to pass into the Claude prompt.
 */
export async function getWeather(city) {
  const key = process.env.OPENWEATHER_API_KEY;
  if (!key) throw new Error("Missing OPENWEATHER_API_KEY");

  const url = `${BASE}/weather`;
  const { data } = await axios.get(url, {
    params: {
      q: city,
      appid: key,
      units: "imperial", // Fahrenheit
    },
  });

  // Also fetch the forecast so we can get today's high/low
  const forecastUrl = `${BASE}/forecast`;
  const { data: forecast } = await axios.get(forecastUrl, {
    params: {
      q: city,
      appid: key,
      units: "imperial",
      cnt: 8, // next 24h in 3-hour blocks
    },
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
