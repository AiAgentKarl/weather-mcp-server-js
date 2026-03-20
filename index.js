#!/usr/bin/env node

// Weather MCP Server — Open-Meteo API (kostenlos, kein API-Key nötig)
// Bietet Wetter, Vorhersagen und Luftqualität für AI-Agents

const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const {
  StdioServerTransport,
} = require("@modelcontextprotocol/sdk/server/stdio.js");
const { z } = require("zod");

// --- API-Basis-URLs ---
const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const WEATHER_URL = "https://api.open-meteo.com/v1/forecast";
const AIR_QUALITY_URL =
  "https://air-quality-api.open-meteo.com/v1/air-quality";

// --- Wetter-Codes zu Beschreibungen ---
const WEATHER_DESCRIPTIONS = {
  0: "Klar",
  1: "Überwiegend klar",
  2: "Teilweise bewölkt",
  3: "Bewölkt",
  45: "Nebel",
  48: "Raunebel",
  51: "Leichter Nieselregen",
  53: "Mäßiger Nieselregen",
  55: "Starker Nieselregen",
  56: "Leichter Gefrierender Nieselregen",
  57: "Starker Gefrierender Nieselregen",
  61: "Leichter Regen",
  63: "Mäßiger Regen",
  65: "Starker Regen",
  66: "Leichter Gefrierender Regen",
  67: "Starker Gefrierender Regen",
  71: "Leichter Schneefall",
  73: "Mäßiger Schneefall",
  75: "Starker Schneefall",
  77: "Schneekörner",
  80: "Leichte Regenschauer",
  81: "Mäßige Regenschauer",
  82: "Starke Regenschauer",
  85: "Leichte Schneeschauer",
  86: "Starke Schneeschauer",
  95: "Gewitter",
  96: "Gewitter mit leichtem Hagel",
  99: "Gewitter mit starkem Hagel",
};

// --- Luftqualitäts-Bewertung nach EU AQI ---
function getAqiLabel(aqi) {
  if (aqi <= 20) return "Gut";
  if (aqi <= 40) return "Befriedigend";
  if (aqi <= 60) return "Mäßig";
  if (aqi <= 80) return "Schlecht";
  if (aqi <= 100) return "Sehr schlecht";
  return "Extrem schlecht";
}

// --- Hilfsfunktion: Ort zu Koordinaten auflösen ---
async function resolveLocation(location) {
  // Prüfe ob direkte Koordinaten übergeben wurden (z.B. "48.1,11.5")
  const coordMatch = location.match(
    /^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/
  );
  if (coordMatch) {
    return {
      latitude: parseFloat(coordMatch[1]),
      longitude: parseFloat(coordMatch[2]),
      name: `${coordMatch[1]}, ${coordMatch[2]}`,
      country: "",
    };
  }

  // Geocoding über Open-Meteo
  const url = `${GEOCODING_URL}?name=${encodeURIComponent(location)}&count=1&language=de`;
  const response = await fetch(url);
  const data = await response.json();

  if (!data.results || data.results.length === 0) {
    throw new Error(`Ort "${location}" nicht gefunden`);
  }

  const result = data.results[0];
  return {
    latitude: result.latitude,
    longitude: result.longitude,
    name: result.name,
    country: result.country || "",
    admin1: result.admin1 || "",
  };
}

// --- Server erstellen ---
const server = new McpServer({
  name: "weather-mcp-server",
  version: "0.1.0",
});

// --- Tool: geocode ---
server.tool(
  "geocode",
  "Stadtname zu Koordinaten auflösen. Gibt Breitengrad, Längengrad und Ortsinformationen zurück.",
  {
    name: z.string().describe("Stadtname (z.B. 'Berlin', 'New York', 'Tokyo')"),
  },
  async ({ name }) => {
    try {
      const url = `${GEOCODING_URL}?name=${encodeURIComponent(name)}&count=5&language=de`;
      const response = await fetch(url);
      const data = await response.json();

      if (!data.results || data.results.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `Keine Ergebnisse für "${name}" gefunden.`,
            },
          ],
        };
      }

      const results = data.results.map((r) => ({
        name: r.name,
        country: r.country || "Unbekannt",
        admin1: r.admin1 || "",
        latitude: r.latitude,
        longitude: r.longitude,
        elevation: r.elevation,
        population: r.population || 0,
        timezone: r.timezone || "",
      }));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(results, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          { type: "text", text: `Fehler bei Geocoding: ${error.message}` },
        ],
        isError: true,
      };
    }
  }
);

// --- Tool: get_current_weather ---
server.tool(
  "get_current_weather",
  "Aktuelles Wetter für einen Ort abrufen. Gibt Temperatur, Wetterlage, Wind und mehr zurück.",
  {
    location: z
      .string()
      .describe(
        "Ortsname (z.B. 'München') oder Koordinaten (z.B. '48.14,11.58')"
      ),
  },
  async ({ location }) => {
    try {
      const loc = await resolveLocation(location);

      const url =
        `${WEATHER_URL}?latitude=${loc.latitude}&longitude=${loc.longitude}` +
        `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,pressure_msl` +
        `&timezone=auto`;

      const response = await fetch(url);
      const data = await response.json();

      if (!data.current) {
        throw new Error("Keine Wetterdaten erhalten");
      }

      const current = data.current;
      const weatherDesc =
        WEATHER_DESCRIPTIONS[current.weather_code] || "Unbekannt";

      const result = {
        ort: loc.name + (loc.country ? `, ${loc.country}` : ""),
        koordinaten: {
          breitengrad: loc.latitude,
          laengengrad: loc.longitude,
        },
        zeitzone: data.timezone,
        aktuell: {
          temperatur_celsius: current.temperature_2m,
          gefuehlte_temperatur_celsius: current.apparent_temperature,
          luftfeuchtigkeit_prozent: current.relative_humidity_2m,
          wetterlage: weatherDesc,
          wetter_code: current.weather_code,
          wind_kmh: current.wind_speed_10m,
          windrichtung_grad: current.wind_direction_10m,
          luftdruck_hpa: current.pressure_msl,
        },
      };

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Fehler beim Abrufen des Wetters: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// --- Tool: get_forecast ---
server.tool(
  "get_forecast",
  "Wettervorhersage für einen Ort abrufen. Bis zu 16 Tage, mit Temperatur, Niederschlag und Wetterlage pro Tag.",
  {
    location: z
      .string()
      .describe(
        "Ortsname (z.B. 'Hamburg') oder Koordinaten (z.B. '53.55,9.99')"
      ),
    days: z
      .number()
      .min(1)
      .max(16)
      .default(7)
      .describe("Anzahl Vorhersagetage (1–16, Standard: 7)"),
  },
  async ({ location, days }) => {
    try {
      const loc = await resolveLocation(location);

      const url =
        `${WEATHER_URL}?latitude=${loc.latitude}&longitude=${loc.longitude}` +
        `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,weather_code,wind_speed_10m_max` +
        `&forecast_days=${days}&timezone=auto`;

      const response = await fetch(url);
      const data = await response.json();

      if (!data.daily) {
        throw new Error("Keine Vorhersagedaten erhalten");
      }

      const daily = data.daily;
      const vorhersage = daily.time.map((date, i) => ({
        datum: date,
        temperatur_max_celsius: daily.temperature_2m_max[i],
        temperatur_min_celsius: daily.temperature_2m_min[i],
        niederschlag_mm: daily.precipitation_sum[i],
        niederschlag_wahrscheinlichkeit_prozent:
          daily.precipitation_probability_max[i],
        wetterlage:
          WEATHER_DESCRIPTIONS[daily.weather_code[i]] || "Unbekannt",
        wind_max_kmh: daily.wind_speed_10m_max[i],
      }));

      const result = {
        ort: loc.name + (loc.country ? `, ${loc.country}` : ""),
        koordinaten: {
          breitengrad: loc.latitude,
          laengengrad: loc.longitude,
        },
        zeitzone: data.timezone,
        vorhersage,
      };

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Fehler bei Vorhersage: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// --- Tool: get_air_quality ---
server.tool(
  "get_air_quality",
  "Aktuelle Luftqualität für einen Ort abrufen. European AQI, Feinstaub (PM2.5/PM10) und Bewertung.",
  {
    location: z
      .string()
      .describe(
        "Ortsname (z.B. 'Stuttgart') oder Koordinaten (z.B. '48.78,9.18')"
      ),
  },
  async ({ location }) => {
    try {
      const loc = await resolveLocation(location);

      const url =
        `${AIR_QUALITY_URL}?latitude=${loc.latitude}&longitude=${loc.longitude}` +
        `&current=european_aqi,pm2_5,pm10,nitrogen_dioxide,ozone`;

      const response = await fetch(url);
      const data = await response.json();

      if (!data.current) {
        throw new Error("Keine Luftqualitätsdaten erhalten");
      }

      const current = data.current;
      const aqi = current.european_aqi;

      const result = {
        ort: loc.name + (loc.country ? `, ${loc.country}` : ""),
        koordinaten: {
          breitengrad: loc.latitude,
          laengengrad: loc.longitude,
        },
        luftqualitaet: {
          european_aqi: aqi,
          bewertung: getAqiLabel(aqi),
          pm2_5_ugm3: current.pm2_5,
          pm10_ugm3: current.pm10,
          stickstoffdioxid_ugm3: current.nitrogen_dioxide,
          ozon_ugm3: current.ozone,
        },
      };

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Fehler bei Luftqualität: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// --- Server starten ---
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Server-Fehler:", error);
  process.exit(1);
});
