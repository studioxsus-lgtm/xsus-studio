/**

* XSUS Weather Engine
* Version: 2.3.0
* 
* Languages:
* - Albanian (sq)
* - English (en)
* - French (fr)
* 
* Features:
* - Current weather
* - Tomorrow's forecast
* - Multilingual city recognition
* - City aliases
* - Localized responses and errors
* - HTTP error handling and timeout
* 
* Data provider: Open-Meteo
  */

const WEATHER_CONFIG = {
geocodingUrl: "https://geocoding-api.open-meteo.com/v1/search",
forecastUrl: "https://api.open-meteo.com/v1/forecast",
defaultCity: "Namur",
timeoutMs: 10000
};

const LANGUAGE_TEXT = {
sq: {
cityMissing:
"Nuk arrita të përcaktoj qytetin. Provo: Moti në Bruksel.",
cityNotFound: (city) =>
"Nuk gjeta një qytet të përshtatshëm për "${city}". Kontrollo emrin dhe provo përsëri.",
serviceError:
"Shërbimi i motit nuk është përkohësisht i disponueshëm. Provo përsëri.",
currentTitle: (city) => "Moti aktual në ${city}",
tomorrowTitle: (city) =>
"Parashikimi i motit për nesër në ${city}",
conditions: "Gjendja",
temperature: "Temperatura",
min: "Temperatura minimale",
max: "Temperatura maksimale",
wind: "Shpejtësia e erës",
noData: "Nuk u morën të dhëna të vlefshme për motin."
},

en: {
    cityMissing:
        "I couldn't identify the city. Try: Weather in Brussels.",
    cityNotFound: (city) =>
        `I couldn't find a city matching "${city}". Check the name and try again.`,
    serviceError:
        "The weather service is temporarily unavailable. Please try again.",
    currentTitle: (city) => `Current weather in ${city}`,
    tomorrowTitle: (city) =>
        `Weather forecast for tomorrow in ${city}`,
    conditions: "Conditions",
    temperature: "Temperature",
    min: "Minimum temperature",
    max: "Maximum temperature",
    wind: "Wind speed",
    noData: "No valid weather data was returned."
},

fr: {
    cityMissing:
        "Je n’ai pas pu identifier la ville. Essayez : Météo à Bruxelles.",
    cityNotFound: (city) =>
        `Je n’ai pas trouvé de ville correspondant à "${city}". Vérifiez son nom et réessayez.`,
    serviceError:
        "Le service météo est temporairement indisponible. Veuillez réessayer.",
    currentTitle: (city) => `Météo actuelle à ${city}`,
    tomorrowTitle: (city) =>
        `Prévisions météo pour demain à ${city}`,
    conditions: "Conditions",
    temperature: "Température",
    min: "Température minimale",
    max: "Température maximale",
    wind: "Vitesse du vent",
    noData: "Aucune donnée météo valide n’a été reçue."
}

};

/**

* Emrat alternativë të qyteteve.

* 

* Çelësat normalizohen pa thekse dhe me shkronja të vogla.

* Vlerat përdoren për kërkimin në Open-Meteo.
  */
  const CITY_ALIASES = {
  bruksel: "Brussels",
  brukseli: "Brussels",
  brussels: "Brussels",
  brussel: "Brussels",
  bruxelles: "Brussels",
  
  londër: "London",
  londer: "London",
  londres: "London",
  london: "London",
  
  pariz: "Paris",
  paris: "Paris",
  
  romë: "Rome",
  rome: "Rome",
  roma: "Rome",
  
  milano: "Milan",
  milan: "Milan",
  
  munih: "Munich",
  munich: "Munich",
  munchen: "Munich",
  
  vienë: "Vienna",
  viene: "Vienna",
  vienna: "Vienna",
  wien: "Vienna",
  
  lisbonë: "Lisbon",
  lisbone: "Lisbon",
  lisboa: "Lisbon",
  lisbon: "Lisbon",
  
  pragë: "Prague",
  prage: "Prague",
  prague: "Prague",
  praha: "Prague",
  
  athinë: "Athens",
  athine: "Athens",
  athens: "Athens",
  athina: "Athens",
  
  beograd: "Belgrade",
  belgrade: "Belgrade",
  
  kopenhagë: "Copenhagen",
  kopenhage: "Copenhagen",
  copenhagen: "Copenhagen",
  kobenhavn: "Copenhagen",
  
  namur: "Namur",
  berlin: "Berlin"
  };

const WEATHER_CODES = {
0: {
icon: "☀️",
sq: "Qiell i kthjellët",
en: "Clear sky",
fr: "Ciel dégagé"
},
1: {
icon: "🌤️",
sq: "Kryesisht kthjellët",
en: "Mainly clear",
fr: "Généralement dégagé"
},
2: {
icon: "⛅",
sq: "Pjesërisht me vranësira",
en: "Partly cloudy",
fr: "Partiellement nuageux"
},
3: {
icon: "☁️",
sq: "Vranësira të dendura",
en: "Overcast",
fr: "Couvert"
},
45: {
icon: "🌫️",
sq: "Mjegull",
en: "Fog",
fr: "Brouillard"
},
48: {
icon: "🌫️",
sq: "Mjegull me ngricë",
en: "Depositing rime fog",
fr: "Brouillard givrant"
},
51: {
icon: "🌦️",
sq: "Shi shumë i lehtë",
en: "Light drizzle",
fr: "Bruine légère"
},
53: {
icon: "🌦️",
sq: "Shi i imët",
en: "Moderate drizzle",
fr: "Bruine modérée"
},
55: {
icon: "🌧️",
sq: "Shi i imët i dendur",
en: "Dense drizzle",
fr: "Bruine dense"
},
56: {
icon: "🌧️",
sq: "Shi ngrirës i lehtë",
en: "Light freezing drizzle",
fr: "Bruine verglaçante légère"
},
57: {
icon: "🌧️",
sq: "Shi ngrirës i dendur",
en: "Dense freezing drizzle",
fr: "Bruine verglaçante dense"
},
61: {
icon: "🌧️",
sq: "Shi i lehtë",
en: "Slight rain",
fr: "Pluie faible"
},
63: {
icon: "🌧️",
sq: "Shi mesatar",
en: "Moderate rain",
fr: "Pluie modérée"
},
65: {
icon: "🌧️",
sq: "Shi i fortë",
en: "Heavy rain",
fr: "Forte pluie"
},
66: {
icon: "🌧️",
sq: "Shi ngrirës i lehtë",
en: "Light freezing rain",
fr: "Pluie verglaçante faible"
},
67: {
icon: "🌧️",
sq: "Shi ngrirës i fortë",
en: "Heavy freezing rain",
fr: "Forte pluie verglaçante"
},
71: {
icon: "🌨️",
sq: "Dëborë e lehtë",
en: "Slight snowfall",
fr: "Faibles chutes de neige"
},
73: {
icon: "❄️",
sq: "Dëborë mesatare",
en: "Moderate snowfall",
fr: "Chutes de neige modérées"
},
75: {
icon: "❄️",
sq: "Dëborë e dendur",
en: "Heavy snowfall",
fr: "Fortes chutes de neige"
},
77: {
icon: "❄️",
sq: "Kokrra dëbore",
en: "Snow grains",
fr: "Grains de neige"
},
80: {
icon: "🌦️",
sq: "Reshje të lehta shiu",
en: "Slight rain showers",
fr: "Averses faibles"
},
81: {
icon: "🌧️",
sq: "Reshje mesatare shiu",
en: "Moderate rain showers",
fr: "Averses modérées"
},
82: {
icon: "⛈️",
sq: "Reshje të forta shiu",
en: "Violent rain showers",
fr: "Averses violentes"
},
85: {
icon: "🌨️",
sq: "Reshje të lehta dëbore",
en: "Slight snow showers",
fr: "Averses de neige faibles"
},
86: {
icon: "❄️",
sq: "Reshje të forta dëbore",
en: "Heavy snow showers",
fr: "Fortes averses de neige"
},
95: {
icon: "⛈️",
sq: "Stuhi me vetëtima",
en: "Thunderstorm",
fr: "Orage"
},
96: {
icon: "⛈️",
sq: "Stuhi me breshër të lehtë",
en: "Thunderstorm with slight hail",
fr: "Orage avec grêle légère"
},
99: {
icon: "⛈️",
sq: "Stuhi me breshër të fortë",
en: "Thunderstorm with heavy hail",
fr: "Orage avec forte grêle"
}
};

/**

* Normalizon tekstin për krahasime.
* Për shembull: "Météo à Bruxelles" -> "meteo a bruxelles".
  */
  function normalizeText(value = "") {
  return String(value)
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[’']/g, "'")
  .replace(/\s+/g, " ")
  .trim();
  }

/**

* Zbulon gjuhën e pyetjes.

* 

* Gjuha e pyetjes ka përparësi ndaj gjuhës së router-it,

* sepse router-i mund ta dërgojë gabimisht "en".
  */
  function resolveLanguage(query, requestedLanguage = "auto") {
  const original = String(query);
  const text = normalizeText(original);
  const requested = normalizeText(requestedLanguage);
  
  // Shqip
  if (
  /\b(moti|temperatura|temperaturat|neser|parashikimi|reshje|shiu|bore|era|shi|diell)\b/.test(text) ||
  /[ëç]/i.test(original)
  ) {
  return "sq";
  }
  
  // Frëngjisht
  if (
  /\b(meteo|demain|aujourd'hui|temperature|temperatures|pluie|neige|vent|previsions|ensoleille|nuageux|quel|quelle|temps|fait|aujourd'hui)\b/.test(text) ||
  /\b(quel temps|quelle est la meteo|est ce que)\b/.test(text)
  ) {
  return "fr";
  }
  
  // Anglisht
  if (
  /\b(weather|forecast|tomorrow|today|temperature|temperatures|rain|rainy|snow|snowy|sunny|cloudy|wind)\b/.test(text)
  ) {
  return "en";
  }
  
  if (["sq", "al", "albanian", "shqip"].includes(requested)) {
  return "sq";
  }
  
  if (["fr", "french", "francais"].includes(requested)) {
  return "fr";
  }
  
  if (["en", "english", "anglais"].includes(requested)) {
  return "en";
  }
  
  return "en";
  }

/**

* Kontrollon nëse pyetja ka të bëjë me motin.
  */
  function isWeatherQuery(query = "") {
  const text = normalizeText(query);
  
  return (
  /\b(moti|temperatura|temperaturat|parashikimi|reshje|shiu|bore|weather|forecast|temperature|temperatures|rain|rainy|snow|snowy|sunny|cloudy|wind|meteo|temps|pluie|neige|ensoleille|nuageux|previsions)\b/.test(text) ||
  /\b(what is the weather|how is the weather|quelle meteo|quel temps)\b/.test(text)
  );
  }

/**

* Kontrollon nëse përdoruesi kërkon parashikimin për nesër.
  */
  function isTomorrowQuery(query = "") {
  return /\b(neser|tomorrow|demain)\b/.test(normalizeText(query));
  }

/**

* Pastron emrin e qytetit pa hequr pjesë të emrit.
  */
  function cleanCityName(value = "") {
  return String(value)
  .replace(/\b(today|tomorrow|tonight|demain|aujourd'hui|neser|sot)\b/gi, "")
  .replace(/[?!.,;:]+/g, " ")
  .replace(/\s+/g, " ")
  .trim();
  }

/**

* Nxjerr qytetin nga pyetje si:

* 

* Moti në Bruksel

* Weather tomorrow in Berlin

* Quelle est la météo à Namur demain ?

* Météo à Bruxelles
  */
  function extractCity(query = "") {
  const original = String(query).trim();
  
  if (!original) {
  return "";
  }
  
  const normalized = normalizeText(original);
  
  // Kërkojmë qytetin pas parafjalëve tipike të secilës gjuhë.
  const locationPatterns = [
  /\b(?:in|at|for)\s+(.+)$/i,
  /\b(?:ne|per)\s+(.+)$/i,
  /\b(?:a|au|aux|dans)\s+(.+)$/i
  ];
  
  for (const pattern of locationPatterns) {
  const match = normalized.match(pattern);
  
   if (!match || !match[1]) {
     continue;
 }

 let candidate = cleanCityName(match[1]);

 candidate = candidate
     .replace(
         /\b(weather|forecast|meteo|moti|parashikimi|temperatura|temperature|temps|pluie|rain|snow|sot|neser|today|tomorrow|demain|please)\b/g,
         ""
     )
     .replace(/\s+/g, " ")
     .trim();

 if (candidate.length >= 2) {
     return candidate;
 }
  
  }
  
  // Mënyra rezervë për formulime pa parafjalë të qartë.
  let city = normalized
  .replace(/^(what is|what's|how is|show me|tell me)\s+/i, "")
  .replace(/^(quelle est|quel est|donne moi|affiche)\s+/i, "")
  .replace(/^(si est|si eshte|me trego|ma trego|me thuaj)\s+/i, "")
  .replace(
  /\b(the weather|weather|forecast|meteo|moti|parashikimi|temperaturat|temperatura|temperature|temperatures|temps|pluie|rain|snow|sot|neser|tomorrow|demain|today|please)\b/g,
  ""
  )
  .replace(/\s+/g, " ")
  .replace(/[?!.,;:]+/g, " ")
  .trim();
  
  return city.length >= 2 ? city : "";
  }

/**

* Kthen qytetin në emrin e preferuar për kërkimin.
  */
  function resolveCityAlias(city) {
  const normalized = normalizeText(city);
  
  return CITY_ALIASES[normalized] || city.trim();
  }

/**

* Përkthehet kodi meteorologjik WMO në përshkrim.
  */
  function getWeatherStatus(code, lang = "en") {
  const item = WEATHER_CODES[Number(code)];
  
  if (!item) {
  const fallback = {
  sq: "Gjendje e panjohur e motit",
  en: "Unknown weather conditions",
  fr: "Conditions météo inconnues"
  };
  
   return {
     icon: "🌡️",
     description: fallback[lang] || fallback.en
 };
  
  }
  
  return {
  icon: item.icon,
  description: item[lang] || item.en
  };
  }

/**

* Kërkesë HTTP me afat kohor dhe kontroll gabimesh.
  */
  async function fetchJSON(url) {
  const controller = new AbortController();
  
  const timeout = setTimeout(
  () => controller.abort(),
  WEATHER_CONFIG.timeoutMs
  );
  
  try {
  const response = await fetch(url, {
  method: "GET",
  headers: {
  Accept: "application/json"
  },
  signal: controller.signal
  });
  
   if (!response.ok) {
     throw new Error(`Weather API HTTP ${response.status}`);
 }

 const data = await response.json();

 if (!data || typeof data !== "object" || data.error) {
     throw new Error(
         data?.reason || "Invalid weather API response"
     );
 }

 return data;
  
  } finally {
  clearTimeout(timeout);
  }
  }

/**

* Gjen koordinatat e qytetit.

* 

* Nëse emri origjinal nuk jep rezultat, provohet edhe

* emri alternativ, për shembull Bruksel -> Brussels.
  */
  async function findCity(city) {
  const searchName = resolveCityAlias(city);
  
  const searchCandidates = [
  searchName,
  ...(searchName !== city ? [city] : [])
  ];
  
  for (const candidate of searchCandidates) {
  const url = new URL(WEATHER_CONFIG.geocodingUrl);
  
   url.searchParams.set("name", candidate);
 url.searchParams.set("count", "10");
 url.searchParams.set("language", "en");
 url.searchParams.set("format", "json");

 const data = await fetchJSON(url.toString());

 if (!Array.isArray(data.results) || data.results.length === 0) {
     continue;
 }

 const normalizedWanted = normalizeText(candidate);

 const location =
     data.results.find(
         (item) =>
             normalizeText(item.name) === normalizedWanted
     ) || data.results[0];

 if (
     typeof location.latitude !== "number" ||
     typeof location.longitude !== "number" ||
     !location.name
 ) {
     continue;
 }

 return {
     name: location.name,
     country: location.country || "",
     latitude: location.latitude,
     longitude: location.longitude
 };
  
  }
  
  return null;
  }

/**

* Merr motin aktual dhe parashikimin ditor.
  */
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

/**

* Formaton përgjigjen për motin aktual.
  */
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
  "🌍 **${t.currentTitle(location.name)}${location.country ? ", ${location.country}" : ""}**",
  "${status.icon} **${t.conditions}:** ${status.description}",
  "🌡️ **${t.temperature}:** ${Number(current.temperature_2m).toFixed(1)} °C"
  ];
  
  if (Number.isFinite(wind)) {
  lines.push("💨 **${t.wind}:** ${wind.toFixed(1)} km/h");
  }
  
  return lines.join("\n");
  }

/**

* Formaton parashikimin për nesër.
  */
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
  
  if (
  !Number.isFinite(min) ||
  !Number.isFinite(max) ||
  !Number.isFinite(code)
  ) {
  return t.noData;
  }
  
  const status = getWeatherStatus(code, lang);
  const wind = Number(daily.wind_speed_10m_max?.[index]);
  
  const lines = [
  "🌍 **${t.tomorrowTitle(location.name)}${location.country ? ", ${location.country}" : ""}**",
  "${status.icon} **${t.conditions}:** ${status.description}",
  "🌡️ **${t.min}:** ${min.toFixed(1)} °C",
  "🌡️ **${t.max}:** ${max.toFixed(1)} °C"
  ];
  
  if (Number.isFinite(wind)) {
  lines.push("💨 **${t.wind}:** ${wind.toFixed(1)} km/h");
  }
  
  return lines.join("\n");
  }

/**

* Funksioni kryesor.

* 

* Përputhet me router-in ekzistues:

* await checkWeather(userQuery, activeLang)
  */
  export async function checkWeather(userQuery, lang = "auto") {
  if (
  typeof userQuery !== "string" ||
  !userQuery.trim()
  ) {
  return null;
  }
  
  if (!isWeatherQuery(userQuery)) {
  return null;
  }
  
  const language = resolveLanguage(userQuery, lang);
  const t = LANGUAGE_TEXT[language];
  
  try {
  const extractedCity = extractCity(userQuery);
  const city = extractedCity || WEATHER_CONFIG.defaultCity;
  
   const location = await findCity(city);

 if (!location) {
     return t.cityNotFound(city);
 }

 const weatherData = await fetchWeather(location);

 if (isTomorrowQuery(userQuery)) {
     return formatTomorrowWeather(
         location,
         weatherData,
         language
     );
 }

 return formatCurrentWeather(
     location,
     weatherData,
     language
 );
  
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
resolveLanguage,
resolveCityAlias
};
