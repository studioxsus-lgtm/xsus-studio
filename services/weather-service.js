/**

* XSUS Weather Engine
* Version: 2.1.0
* 
* Mbështet:
* - Shqip (sq)
* - Anglisht (en)
* - Frëngjisht (fr)
* - Motin aktual dhe parashikimin për nesër
* - Zbulimin e qytetit nga pyetja
* - Gabime të kontrolluara dhe përgjigje të lokalizuara
* 
* Burimi i të dhënave: Open-Meteo
  */

const WEATHER_CONFIG = {
geocodingUrl: "https://geocoding-api.open-meteo.com/v1/search",
forecastUrl: "https://api.open-meteo.com/v1/forecast",
defaultCity: "Namur",
timeoutMs: 10000
};

const LANGUAGE_TEXT = {
sq: {
cityMissing: "Nuk arrita të përcaktoj qytetin. Provo, për shembull: «Moti në Bruksel».",
cityNotFound: (city) => "Nuk gjeta një qytet të përshtatshëm për «${city}». Kontrollo emrin e qytetit dhe provo përsëri.",
serviceError: "Shërbimi i motit nuk është përkohësisht i disponueshëm. Provo përsëri pas pak.",
currentTitle: (city) => "Moti aktual në ${city}",
tomorrowTitle: (city) => "Parashikimi i motit për nesër në ${city}",
temperature: "Temperatura",
feels: "Gjendja",
wind: "Shpejtësia e erës",
min: "Temperatura minimale",
max: "Temperatura maksimale",
noData: "Nuk u morën të dhëna të vlefshme për motin."
},
en: {
cityMissing: "I couldn't identify the city. Try, for example: “Weather in Brussels”.",
cityNotFound: (city) => "I couldn't find a matching city for “${city}”. Check the city name and try again.",
serviceError: "The weather service is temporarily unavailable. Please try again shortly.",
currentTitle: (city) => "Current weather in ${city}",
tomorrowTitle: (city) => "Weather forecast for tomorrow in ${city}",
temperature: "Temperature",
feels: "Conditions",
wind: "Wind speed",
min: "Minimum temperature",
max: "Maximum temperature",
noData: "No valid weather data was returned."
},
fr: {
cityMissing: "Je n’ai pas pu identifier la ville. Essayez, par exemple : « Météo à Bruxelles ».",
cityNotFound: (city) => "Je n’ai pas trouvé de ville correspondant à « ${city} ». Vérifiez son nom et réessayez.",
serviceError: "Le service météo est temporairement indisponible. Veuillez réessayer dans quelques instants.",
currentTitle: (city) => "Météo actuelle à ${city}",
tomorrowTitle: (city) => "Prévisions météo pour demain à ${city}",
temperature: "Température",
feels: "Conditions",
wind: "Vitesse du vent",
min: "Température minimale",
max: "Température maximale",
noData: "Aucune donnée météo valide n’a été reçue."
}
};

const WEATHER_CODES = {
0:  { icon: "☀️", sq: "Qiell i kthjellët", en: "Clear sky", fr: "Ciel dégagé" },
1:  { icon: "🌤️", sq: "Kryesisht kthjellët", en: "Mainly clear", fr: "Généralement dégagé" },
2:  { icon: "⛅", sq: "Pjesërisht me vranësira", en: "Partly cloudy", fr: "Partiellement nuageux" },
3:  { icon: "☁️", sq: "Vranësira të dendura", en: "Overcast", fr: "Couvert" },
45: { icon: "🌫️", sq: "Mjegull", en: "Fog", fr: "Brouillard" },
48: { icon: "🌫️", sq: "Mjegull me ngricë", en: "Depositing rime fog", fr: "Brouillard givrant" },
51: { icon: "🌦️", sq: "Shi shumë i lehtë", en: "Light drizzle", fr: "Bruine légère" },
53: { icon: "🌦️", sq: "Shi i imët", en: "Moderate drizzle", fr: "Bruine modérée" },
55: { icon: "🌧️", sq: "Shi i imët i dendur", en: "Dense drizzle", fr: "Bruine dense" },
56: { icon: "🌧️", sq: "Shi i imët ngrirës", en: "Freezing drizzle", fr: "Bruine verglaçante" },
57: { icon: "🌧️", sq: "Shi i imët ngrirës i dendur", en: "Dense freezing drizzle", fr: "Bruine verglaçante dense" },
61: { icon: "🌧️", sq: "Shi i lehtë", en: "Slight rain", fr: "Pluie faible" },
63: { icon: "🌧️", sq: "Shi mesatar", en: "Moderate rain", fr: "Pluie modérée" },
65: { icon: "🌧️", sq: "Shi i fortë", en: "Heavy rain", fr: "Forte pluie" },
66: { icon: "🌧️", sq: "Shi ngrirës i lehtë", en: "Light freezing rain", fr: "Pluie verglaçante faible" },
67: { icon: "🌧️", sq: "Shi ngrirës i fortë", en: "Heavy freezing rain", fr: "Forte pluie verglaçante" },
71: { icon: "🌨️", sq: "Dëborë e lehtë", en: "Slight snowfall", fr: "Faibles chutes de neige" },
73: { icon: "❄️", sq: "Dëborë mesatare", en: "Moderate snowfall", fr: "Chutes de neige modérées" },
75: { icon: "❄️", sq: "Dëborë e dendur", en: "Heavy snowfall", fr: "Fortes chutes de neige" },
77: { icon: "❄️", sq: "Kokrra dëbore", en: "Snow grains", fr: "Grains de neige" },
80: { icon: "🌦️", sq: "Reshje të lehta shiu", en: "Slight rain showers", fr: "Averses faibles" },
81: { icon: "🌧️", sq: "Reshje mesatare shiu", en: "Moderate rain showers", fr: "Averses modérées" },
82: { icon: "⛈️", sq: "Reshje të forta shiu", en: "Violent rain showers", fr: "Averses violentes" },
85: { icon: "🌨️", sq: "Reshje të lehta dëbore", en: "Slight snow showers", fr: "Averses de neige faibles" },
86: { icon: "❄️", sq: "Reshje të forta dëbore", en: "Heavy snow showers", fr: "Fortes averses de neige" },
95: { icon: "⛈️", sq: "Stuhi me vetëtima", en: "Thunderstorm", fr: "Orage" },
96: { icon: "⛈️", sq: "Stuhi me breshër të lehtë", en: "Thunderstorm with slight hail", fr: "Orage avec grêle légère" },
99: { icon: "⛈️", sq: "Stuhi me breshër të fortë", en: "Thunderstorm with heavy hail", fr: "Orage avec forte grêle" }
};

function normalizeText(value = "") {
return String(value)
.normalize("NFD")
.replace(/[\u0300-\u036f]/g, "")
.toLowerCase()
.replace(/[’']/g, "'")
.replace(/\s+/g, " ")
.trim();
}

function resolveLanguage(query, requestedLanguage = "auto") {
const requested = normalizeText(requestedLanguage);

if (["sq", "al", "albanian", "shqip"].includes(requested)) return "sq";
if (["fr", "french", "francais"].includes(requested)) return "fr";
if (["en", "english", "anglais"].includes(requested)) return "en";

const text = normalizeText(query);

// Shqip: përdor fjalë karakteristike, jo vetëm fjalë të zakonshme si "ne".
if (
    /\b(moti|temperatura|temperaturat|neser|parashikimi|reshje|shiu|bore|era)\b/.test(text) ||
    /[ëç]/i.test(String(query))
) {
    return "sq";
}

if (
    /\b(meteo|demain|aujourd'hui|temperature|temperatures|pluie|neige|vent|previsions)\b/.test(text) ||
    /\b(quel temps|temps fait|est la meteo)\b/.test(text)
) {
    return "fr";
}

return "en";

}

function isWeatherQuery(query = "") {
const text = normalizeText(query);

return /\b(moti|temperatura|temperaturat|parashikimi|reshje|shiu|bore|weather|forecast|temperature|temperatures|rain|rainy|snow|snowy|sunny|cloudy|wind|meteo|temps|pluie|neige|ensoleille|nuageux|previsions)\b/.test(text) ||
    /\b(what is the weather|how is the weather|quelle meteo|quel temps)\b/.test(text);

}

function isTomorrowQuery(query = "") {
const text = normalizeText(query);

return /\b(neser|tomorrow|demain)\b/.test(text);

}

function cleanCityName(value = "") {
return String(value)
.replace(/[?!.,;:]+$/g, "")
.replace(/\b(today|tomorrow|tonight|demain|aujourd'hui|neser|sot)\b/gi, "")
.replace(/\s+/g, " ")
.trim()
.replace(/^[,;:\s]+|[,;:\s]+$/g, "");
}

function extractCity(query = "") {
const original = String(query).trim();

if (!original) return "";

// Fillimisht kërkojmë qytetin pas parafjalëve të vendit.
// Kjo ruan emrat e qyteteve dhe funksionon me ë/ç/à.
const locationPatterns = [
    /(?:\bin\b|\bat\b|\bfor\b)\s+(.+)$/i,
    /(?:në|ne|për|per)\s+(.+)$/i,
    /(?:\sà\s|\sa\s|\sau\s|\saux\s|\sde\s|\sdu\s)\s*(.+)$/i
];

for (const pattern of locationPatterns) {
    const match = original.match(pattern);

    if (match && match[1]) {
        const candidate = cleanCityName(match[1]);

        if (candidate) {
            const normalizedCandidate = normalizeText(candidate);

            const stripped = cleanCityName(
                normalizedCandidate.replace(
                    /\b(today|tomorrow|tonight|demain|aujourd'hui|neser|sot|weather|forecast|meteo|moti|temperatura|temperature|temps|pluie|rain|please)\b/g,
                    ""
                )
            );

            if (stripped.length >= 2) return stripped;
        }
    }
}

// Heq formulimet e zakonshme në fillim të pyetjes.
let city = normalizeText(original)
    .replace(/^(what is|what's|how is|show me|tell me)\s+/i, "")
    .replace(/^(quelle est|quel est|donne[- ]moi|affiche)\s+/i, "")
    .replace(/^(si eshte|si është|me trego|ma trego|me thuaj)\s+/i, "")
    .replace(/\b(the weather|weather|forecast|meteo|moti|parashikimi|temperaturat|temperatura|temperature|temperatures|temps|pluie|rain|snow|sot|neser|tomorrow|demain|today|aujourd'hui|please|s'il vous plait)\b/g, "")
    .replace(/\b(in|at|for|a|the|is|it|në|ne|per|për|à|au|aux|de|du|le|la|les)\b/g, "")
    .replace(/[?!.,;:]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// Nuk supozojmë qytet kur mbetet vetëm një pyetje pa vendndodhje.
if (city.length < 2) return "";

return city;

}

function getWeatherStatus(code, lang = "en") {
const entry = WEATHER_CODES[Number(code)];

if (!entry) {
    const fallback = {
        sq: "Gjendja e motit nuk njihet",
        en: "Unknown weather conditions",
        fr: "Conditions météo inconnues"
    };

    return {
        icon: "🌡️",
        description: fallback[lang] || fallback.en
    };
}

return {
    icon: entry.icon,
    description: entry[lang] || entry.en
};

}

async function fetchJSON(url) {
const controller = new AbortController();
const timeout = setTimeout(
() => controller.abort(),
WEATHER_CONFIG.timeoutMs
);

try {
    const response = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: controller.signal
    });

    if (!response.ok) {
        throw new Error(`Weather API HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!data || typeof data !== "object") {
        throw new Error("Weather API returned invalid JSON");
    }

    if (data.error) {
        throw new Error(data.reason || "Weather API error");
    }

    return data;
} finally {
    clearTimeout(timeout);
}

}

async function findCity(city) {
const url = new URL(WEATHER_CONFIG.geocodingUrl);

url.searchParams.set("name", city);
url.searchParams.set("count", "5");
url.searchParams.set("language", "en");
url.searchParams.set("format", "json");

const data = await fetchJSON(url.toString());

if (!Array.isArray(data.results) || data.results.length === 0) {
    return null;
}

const normalizedWanted = normalizeText(city);

const exactMatch = data.results.find(
    (item) => normalizeText(item.name) === normalizedWanted
);

const location = exactMatch || data.results[0];

if (
    typeof location.latitude !== "number" ||
    typeof location.longitude !== "number" ||
    !location.name
) {
    return null;
}

return {
    name: location.name,
    country: location.country || "",
    latitude: location.latitude,
    longitude: location.longitude
};

}

async function fetchWeather(location) {
const url = new URL(WEATHER_CONFIG.forecastUrl);

url.searchParams.set("latitude", String(location.latitude));
url.searchParams.set("longitude", String(location.longitude));
url.searchParams.set(
    "current",
    "temperature_2m,weather_code,wind_speed_10m"
);
url.searchParams.set(
    "daily",
    "weather_code,temperature_2m_max,temperature_2m_min,wind_speed_10m_max"
);
url.searchParams.set("timezone", "auto");
url.searchParams.set("forecast_days", "2");

return fetchJSON(url.toString());

}

function formatCurrentWeather(location, data, lang) {
const t = LANGUAGE_TEXT[lang];
const current = data.current;

if (
    !current ||
    !Number.isFinite(Number(current.temperature_2m)) ||
    !Number.isFinite(Number(current.weather_code))
) {
    return t.noData;
}

const status = getWeatherStatus(current.weather_code, lang);
const wind = Number(current.wind_speed_10m);

const lines = [
    `🌍 **${t.currentTitle(location.name)}${location.country ? `, ${location.country}` : ""}**`,
    `${status.icon} ${t.feels}: ${status.description}`,
    `🌡️ ${t.temperature}: ${Number(current.temperature_2m).toFixed(1)} °C`
];

if (Number.isFinite(wind)) {
    lines.push(`💨 ${t.wind}: ${wind.toFixed(1)} km/h`);
}

return lines.join("\n");

}

function formatTomorrowWeather(location, data, lang) {
const t = LANGUAGE_TEXT[lang];
const daily = data.daily;

if (
    !daily ||
    !Array.isArray(daily.time) ||
    daily.time.length < 2 ||
    !Array.isArray(daily.weather_code) ||
    !Array.isArray(daily.temperature_2m_min) ||
    !Array.isArray(daily.temperature_2m_max)
) {
    return t.noData;
}

const index = 1;
const min = Number(daily.temperature_2m_min[index]);
const max = Number(daily.temperature_2m_max[index]);
const code = Number(daily.weather_code[index]);

if (!Number.isFinite(min) || !Number.isFinite(max) || !Number.isFinite(code)) {
    return t.noData;
}

const status = getWeatherStatus(code, lang);
const maxWind = Array.isArray(daily.wind_speed_10m_max)
    ? Number(daily.wind_speed_10m_max[index])
    : NaN;

const lines = [
    `🌍 **${t.tomorrowTitle(location.name)}${location.country ? `, ${location.country}` : ""}**`,
    `${status.icon} ${t.feels}: ${status.description}`,
    `🌡️ ${t.min}: ${min.toFixed(1)} °C`,
    `🌡️ ${t.max}: ${max.toFixed(1)} °C`
];

if (Number.isFinite(maxWind)) {
    lines.push(`💨 ${t.wind}: deri në ${maxWind.toFixed(1)} km/h`);
}

return lines.join("\n");

}

/**

* Funksioni kryesor i motit.

* Përputhet me router-in: checkWeather(query, activeLang).
  */
  export async function checkWeather(userQuery, lang = "auto") {
  if (!userQuery || typeof userQuery !== "string") {
  return null;
  }
  
  if (!isWeatherQuery(userQuery)) {
  return null;
  }
  
  const language = resolveLanguage(userQuery, lang);
  const t = LANGUAGE_TEXT[language];
  
  try {
  const city = extractCity(userQuery) || WEATHER_CONFIG.defaultCity;
  const location = await findCity(city);
  
   if (!location) {
     return t.cityNotFound(city);
 }

 const weatherData = await fetchWeather(location);

 if (isTomorrowQuery(userQuery)) {
     return formatTomorrowWeather(location, weatherData, language);
 }

 return formatCurrentWeather(location, weatherData, language);
  
  } catch (error) {
  console.error("[XSUS Weather Engine]", error);
  
   return t.serviceError;
  
  }
  }

// Eksporte ndihmëse për testet.
export {
extractCity,
getWeatherStatus,
isWeatherQuery,
isTomorrowQuery,
resolveLanguage
};
