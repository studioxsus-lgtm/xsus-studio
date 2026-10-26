// services/weather-service.js
// XSUS Studio — Weather Engine
// Version: 2.0.0
//
// Features:
// - Current weather
// - Tomorrow's forecast
// - Albanian, English and French
// - City extraction and geocoding
// - HTTP and response validation
// - Request timeout protection
// - WMO weather-code descriptions
// - Backward-compatible checkWeather(userQuery, lang)

const WEATHER_CONFIG = Object.freeze({
    geocodingUrl: 'https://geocoding-api.open-meteo.com/v1/search',
    forecastUrl: 'https://api.open-meteo.com/v1/forecast',
    defaultCity: 'Namur',
    requestTimeoutMs: 10000
});

const SUPPORTED_LANGUAGES = new Set([
    'sq',
    'en',
    'fr'
]);

// -------------------------------------------------------------
// LANGUAGE UTILITIES
// -------------------------------------------------------------

function normalizeText(value) {
    return String(value ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ');
}

function resolveLanguage(query, requestedLanguage = 'auto') {
    if (
        typeof requestedLanguage === 'string' &&
        SUPPORTED_LANGUAGES.has(requestedLanguage.toLowerCase())
    ) {
        return requestedLanguage.toLowerCase();
    }

    const text = normalizeText(query);

    const frenchMarkers = [
        'meteo',
        'temperature',
        'demain',
        "aujourd'hui",
        'quel temps',
        'temps a',
        'temps a-t-il',
        'previsions',
        'pluie'
    ];

    if (
        frenchMarkers.some((word) => text.includes(word))
    ) {
        return 'fr';
    }

    const albanianMarkers = [
        'moti',
        'temperatura',
        'neser',
        'sot',
        'shiu',
        'reshje',
        'parashikimi',
        'sa grade',
        'gradë',
        'era'
    ];

    if (
        albanianMarkers.some((word) => text.includes(word))
    ) {
        return 'sq';
    }

    return 'en';
}

function localized(lang, sq, en, fr) {
    if (lang === 'sq') return sq;
    if (lang === 'fr') return fr;

    return en;
}

// -------------------------------------------------------------
// WEATHER INTENT DETECTION
// -------------------------------------------------------------

const WEATHER_INTENT_PATTERN =
    /\b(weather|forecast|temperature|temperatures|rain|raining|rainy|snow|snowing|snowy|sunny|cloudy|wind|winds|moti|temperatura|temperaturat|parashikimi|parashikim|shi|shiu|reshje|bore|debore|me diell|météo|meteo|température|pluie|pleut|neige|ensoleille|nuageux|vent|prévisions|previsions)\b/i;

function isWeatherQuery(query) {
    return WEATHER_INTENT_PATTERN.test(
        normalizeText(query)
    );
}

function isTomorrowQuery(query) {
    const text = normalizeText(query);

    return /\b(tomorrow|demain|neser|pasneser|day after tomorrow)\b/i
        .test(text);
}

// -------------------------------------------------------------
// CITY EXTRACTION
// -------------------------------------------------------------

function extractCity(query) {
    let city = String(query ?? '').trim();

    // Heqim shprehjet e zakonshme hyrëse pa ndryshuar
    // shkronjat e emrave të qyteteve.
    const leadingPhrases = [
        /^\s*what(?:'s| is) the weather(?: like)?\s*/i,
        /^\s*what is the temperature\s*/i,
        /^\s*what will the weather be like\s*/i,
        /^\s*how(?:'s| is) the weather\s*/i,
        /^\s*give me the weather\s*/i,
        /^\s*show me the weather\s*/i,
        /^\s*weather forecast\s*/i,
        /^\s*weather\s*/i,
        /^\s*forecast\s*/i,
        /^\s*quelle est la météo\s*/i,
        /^\s*quelle est la meteo\s*/i,
        /^\s*quel temps fait-il\s*/i,
        /^\s*quel temps fera-t-il\s*/i,
        /^\s*donne-moi la météo\s*/i,
        /^\s*donne moi la meteo\s*/i,
        /^\s*météo\s*/i,
        /^\s*meteo\s*/i,
        /^\s*prévisions météo\s*/i,
        /^\s*previsions meteo\s*/i,
        /^\s*si është moti\s*/i,
        /^\s*si eshte moti\s*/i,
        /^\s*si do të jetë moti\s*/i,
        /^\s*si do te jete moti\s*/i,
        /^\s*ma trego motin\s*/i,
        /^\s*më trego motin\s*/i,
        /^\s*moti\s*/i,
        /^\s*temperatura\s*/i,
        /^\s*parashikimi i motit\s*/i,
        /^\s*parashikim moti\s*/i
    ];

    for (const pattern of leadingPhrases) {
        city = city.replace(pattern, '');
    }

    // Heqim fjalët që shërbejnë si pjesë të pyetjes.
    // Nuk heqim shkronjën "a" në mënyrë globale, sepse
    // mund të jetë pjesë e një emri qyteti.
    const removableWords = [
        'today',
        'tomorrow',
        'demain',
        "aujourd'hui",
        'nesër',
        'neser',
        'sot',
        'pasneser',
        'pasnesër',
        'weather',
        'forecast',
        'temperature',
        'temperatures',
        'météo',
        'meteo',
        'température',
        'prévisions',
        'previsions',
        'moti',
        'temperatura',
        'temperaturat',
        'parashikimi',
        'parashikim',
        'raining',
        'rain',
        'rainy',
        'snowing',
        'snow',
        'snowy',
        'sunny',
        'cloudy',
        'windy',
        'pluie',
        'pleut',
        'neige',
        'ensoleillé',
        'nuageux',
        'shi',
        'shiu',
        'reshje',
        'borë',
        'bore',
        'dëborë',
        'debore',
        'diell',
        'si',
        'është',
        'eshte',
        'do',
        'jetë',
        'jete',
        'sa',
        'grade',
        'gradë',
        'degrees',
        'degrés',
        'degres',
        'what',
        'is',
        'the',
        'like',
        'how',
        'will',
        'be',
        'in',
        'at',
        'for',
        'and',
        'to',
        'please',
        'show',
        'me',
        'give',
        'quelle',
        'quel',
        'temps',
        'fait-il',
        'fera-t-il',
        'à',
        'au',
        'aux',
        'demain',
        'aujourd’hui',
        'quel'
    ];

    const escapedWords = removableWords
        .map((word) =>
            word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        )
        .sort((a, b) => b.length - a.length);

    const removalPattern = new RegExp(
        `\\b(?:${escapedWords.join('|')})\\b`,
        'giu'
    );

    city = city
        .replace(removalPattern, ' ')
        .replace(/[?!.,;:()[\]{}"'`]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    // Heqim parafjalë të mbetura në fillim ose fund.
    city = city
        .replace(/^(?:in|at|à|au|ne|në|en)\s+/i, '')
        .replace(/\s+(?:please|today|tomorrow|demain|sot|nesër|neser)$/i, '')
        .trim();

    // Kërkojmë vetëm emra qytetesh me gjatësi të arsyeshme.
    if (
        !city ||
        city.length < 2 ||
        city.length > 100
    ) {
        return WEATHER_CONFIG.defaultCity;
    }

    return city;
}

// -------------------------------------------------------------
// SAFE HTTP REQUESTS
// -------------------------------------------------------------

async function fetchJSON(url) {
    if (typeof fetch !== 'function') {
        throw new Error(
            'Fetch API nuk është i disponueshëm.'
        );
    }

    const controller =
        typeof AbortController !== 'undefined'
            ? new AbortController()
            : null;

    let timeoutId;

    try {
        const options = {};

        if (controller) {
            options.signal = controller.signal;

            timeoutId = setTimeout(() => {
                controller.abort();
            }, WEATHER_CONFIG.requestTimeoutMs);
        }

        const response = await fetch(url, options);

        if (!response.ok) {
            throw new Error(
                `Weather API returned HTTP ${response.status}.`
            );
        }

        const data = await response.json();

        if (
            !data ||
            typeof data !== 'object' ||
            Array.isArray(data)
        ) {
            throw new Error(
                'Weather API returned an invalid response.'
            );
        }

        if (data.error) {
            throw new Error(
                data.reason || 'Weather API request failed.'
            );
        }

        return data;
    } finally {
        if (timeoutId !== undefined) {
            clearTimeout(timeoutId);
        }
    }
}

// -------------------------------------------------------------
// GEOCODING
// -------------------------------------------------------------

async function findCity(city) {
    const params = new URLSearchParams({
        name: city,
        count: '1',
        language: 'en',
        format: 'json'
    });

    const url =
        `${WEATHER_CONFIG.geocodingUrl}?${params.toString()}`;

    const data = await fetchJSON(url);

    if (
        !Array.isArray(data.results) ||
        data.results.length === 0
    ) {
        return null;
    }

    const location = data.results[0];

    if (
        !Number.isFinite(location.latitude) ||
        !Number.isFinite(location.longitude) ||
        typeof location.name !== 'string'
    ) {
        return null;
    }

    return {
        latitude: location.latitude,
        longitude: location.longitude,
        name: location.name,
        country: location.country || ''
    };
}

// -------------------------------------------------------------
// WEATHER API
// -------------------------------------------------------------

async function fetchWeather(location) {
    const params = new URLSearchParams({
        latitude: String(location.latitude),
        longitude: String(location.longitude),
        current: 'temperature_2m,weather_code,wind_speed_10m',
        daily: 'weather_code,temperature_2m_max,temperature_2m_min,wind_speed_10m_max',
        timezone: 'auto',
        forecast_days: '2'
    });

    const url =
        `${WEATHER_CONFIG.forecastUrl}?${params.toString()}`;

    return fetchJSON(url);
}

// -------------------------------------------------------------
// WMO WEATHER CODE DESCRIPTIONS
// -------------------------------------------------------------

const WEATHER_CODES = {
    0: {
        icon: '☀️',
        sq: 'Kthjellët',
        en: 'Clear sky',
        fr: 'Ciel dégagé'
    },
    1: {
        icon: '🌤️',
        sq: 'Kryesisht kthjellët',
        en: 'Mainly clear',
        fr: 'Principalement dégagé'
    },
    2: {
        icon: '⛅',
        sq: 'Pjesërisht me vranësira',
        en: 'Partly cloudy',
        fr: 'Partiellement nuageux'
    },
    3: {
        icon: '☁️',
        sq: 'Vranësira të dendura',
        en: 'Overcast',
        fr: 'Couvert'
    },
    45: {
        icon: '🌫️',
        sq: 'Mjegull',
        en: 'Fog',
        fr: 'Brouillard'
    },
    48: {
        icon: '🌫️',
        sq: 'Mjegull me ngricë',
        en: 'Depositing rime fog',
        fr: 'Brouillard givrant'
    },
    51: {
        icon: '🌦️',
        sq: 'Reshje shumë të lehta shiu',
        en: 'Light drizzle',
        fr: 'Bruine légère'
    },
    53: {
        icon: '🌦️',
        sq: 'Reshje mesatare shiu',
        en: 'Moderate drizzle',
        fr: 'Bruine modérée'
    },
    55: {
        icon: '🌧️',
        sq: 'Reshje të dendura shiu',
        en: 'Dense drizzle',
        fr: 'Bruine dense'
    },
    56: {
        icon: '🌧️',
        sq: 'Shi i lehtë ngrirës',
        en: 'Light freezing drizzle',
        fr: 'Bruine verglaçante légère'
    },
    57: {
        icon: '🌧️',
        sq: 'Shi ngrirës',
        en: 'Freezing drizzle',
        fr: 'Bruine verglaçante'
    },
    61: {
        icon: '🌧️',
        sq: 'Shi i lehtë',
        en: 'Slight rain',
        fr: 'Pluie faible'
    },
    63: {
        icon: '🌧️',
        sq: 'Shi mesatar',
        en: 'Moderate rain',
        fr: 'Pluie modérée'
    },
    65: {
        icon: '🌧️',
        sq: 'Shi i fortë',
        en: 'Heavy rain',
        fr: 'Forte pluie'
    },
    66: {
        icon: '🌧️',
        sq: 'Shi ngrirës i lehtë',
        en: 'Light freezing rain',
        fr: 'Pluie verglaçante faible'
    },
    67: {
        icon: '🌧️',
        sq: 'Shi ngrirës i fortë',
        en: 'Heavy freezing rain',
        fr: 'Forte pluie verglaçante'
    },
    71: {
        icon: '🌨️',
        sq: 'Dëborë e lehtë',
        en: 'Slight snowfall',
        fr: 'Faibles chutes de neige'
    },
    73: {
        icon: '❄️',
        sq: 'Dëborë mesatare',
        en: 'Moderate snowfall',
        fr: 'Chutes de neige modérées'
    },
    75: {
        icon: '❄️',
        sq: 'Dëborë e dendur',
        en: 'Heavy snowfall',
        fr: 'Fortes chutes de neige'
    },
    77: {
        icon: '❄️',
        sq: 'Kokrra dëbore',
        en: 'Snow grains',
        fr: 'Neige en grains'
    },
    80: {
        icon: '🌦️',
        sq: 'Rrebeshe të lehta',
        en: 'Slight rain showers',
        fr: 'Averses faibles'
    },
    81: {
        icon: '🌧️',
        sq: 'Rrebeshe mesatare',
        en: 'Moderate rain showers',
        fr: 'Averses modérées'
    },
    82: {
        icon: '⛈️',
        sq: 'Rrebeshe të forta',
        en: 'Violent rain showers',
        fr: 'Averses violentes'
    },
    85: {
        icon: '🌨️',
        sq: 'Rrebeshe të lehta dëbore',
        en: 'Slight snow showers',
        fr: 'Averses de neige faibles'
    },
    86: {
        icon: '❄️',
        sq: 'Rrebeshe të forta dëbore',
        en: 'Heavy snow showers',
        fr: 'Fortes averses de neige'
    },
    95: {
        icon: '⛈️',
        sq: 'Stuhi me bubullima',
        en: 'Thunderstorm',
        fr: 'Orage'
    },
    96: {
        icon: '⛈️',
        sq: 'Stuhi me breshër të lehtë',
        en: 'Thunderstorm with slight hail',
        fr: 'Orage avec grêle légère'
    },
    99: {
        icon: '⛈️',
        sq: 'Stuhi me breshër të fortë',
        en: 'Thunderstorm with heavy hail',
        fr: 'Orage avec forte grêle'
    }
};

function getWeatherStatus(code, lang = 'en') {
    const status = WEATHER_CODES[code] || {
        icon: '🌡️',
        sq: 'Kushte të ndryshueshme',
        en: 'Variable conditions',
        fr: 'Conditions variables'
    };

    return {
        icon: status.icon,
        description: status[lang] || status.en
    };
}

// -------------------------------------------------------------
// RESPONSE FORMATTING
// -------------------------------------------------------------

function formatLocation(location) {
    return location.country
        ? `${location.name}, ${location.country}`
        : location.name;
}

function formatCurrentWeather(data, location, lang) {
    const current = data.current;

    if (
        !current ||
        !Number.isFinite(current.temperature_2m) ||
        !Number.isFinite(current.weather_code) ||
        !Number.isFinite(current.wind_speed_10m)
    ) {
        return null;
    }

    const status = getWeatherStatus(
        current.weather_code,
        lang
    );

    const place = formatLocation(location);

    return localized(
        lang,
        `☀️ **Moti aktual në ${place}:**\n\n` +
            `- Temperatura: ${current.temperature_2m}°C\n` +
            `- Kushtet: ${status.description} ${status.icon}\n` +
            `- Shpejtësia e erës: ${current.wind_speed_10m} km/h`,

        `☀️ **Current weather in ${place}:**\n\n` +
            `- Temperature: ${current.temperature_2m}°C\n` +
            `- Conditions: ${status.description} ${status.icon}\n` +
            `- Wind speed: ${current.wind_speed_10m} km/h`,

        `☀️ **Météo actuelle à ${place} :**\n\n` +
            `- Température : ${current.temperature_2m}°C\n` +
            `- Conditions : ${status.description} ${status.icon}\n` +
            `- Vitesse du vent : ${current.wind_speed_10m} km/h`
    );
}

function formatTomorrowWeather(data, location, lang) {
    const daily = data.daily;

    if (
        !daily ||
        !Array.isArray(daily.time) ||
        !Array.isArray(daily.temperature_2m_max) ||
        !Array.isArray(daily.temperature_2m_min) ||
        !Array.isArray(daily.weather_code) ||
        !Array.isArray(daily.wind_speed_10m_max) ||
        daily.time.length < 2
    ) {
        return null;
    }

    const index = 1;

    const max = daily.temperature_2m_max[index];
    const min = daily.temperature_2m_min[index];
    const code = daily.weather_code[index];
    const wind = daily.wind_speed_10m_max[index];

    if (
        !Number.isFinite(max) ||
        !Number.isFinite(min) ||
        !Number.isFinite(code) ||
        !Number.isFinite(wind)
    ) {
        return null;
    }

    const status = getWeatherStatus(code, lang);
    const place = formatLocation(location);

    return localized(
        lang,
        `🌤️ **Moti nesër në ${place}:**\n\n` +
            `- Temperatura maksimale: ${max}°C\n` +
            `- Temperatura minimale: ${min}°C\n` +
            `- Kushtet: ${status.description} ${status.icon}\n` +
            `- Shpejtësia maksimale e erës: ${wind} km/h`,

        `🌤️ **Weather tomorrow in ${place}:**\n\n` +
            `- Maximum temperature: ${max}°C\n` +
            `- Minimum temperature: ${min}°C\n` +
            `- Conditions: ${status.description} ${status.icon}\n` +
            `- Maximum wind speed: ${wind} km/h`,

        `🌤️ **Météo demain à ${place} :**\n\n` +
            `- Température maximale : ${max}°C\n` +
            `- Température minimale : ${min}°C\n` +
            `- Conditions : ${status.description} ${status.icon}\n` +
            `- Vitesse maximale du vent : ${wind} km/h`
    );
}

// -------------------------------------------------------------
// MAIN WEATHER SERVICE
// -------------------------------------------------------------

export async function checkWeather(
    userQuery,
    lang = 'auto'
) {
    if (
        typeof userQuery !== 'string' ||
        !userQuery.trim()
    ) {
        return null;
    }

    if (!isWeatherQuery(userQuery)) {
        return null;
    }

    const activeLang = resolveLanguage(
        userQuery,
        lang
    );

    const city = extractCity(userQuery);

    try {
        const location = await findCity(city);

        if (!location) {
            return localized(
                activeLang,
                `Nuk u gjet asnjë informacion për motin në qytetin "${city}". Kontrollo emrin e qytetit dhe provo përsëri.`,
                `No weather information was found for "${city}". Check the city name and try again.`,
                `Aucune information météo n'a été trouvée pour "${city}". Vérifiez le nom de la ville et réessayez.`
            );
        }

        const weatherData = await fetchWeather(location);

        const tomorrow = isTomorrowQuery(userQuery);

        const answer = tomorrow
            ? formatTomorrowWeather(
                weatherData,
                location,
                activeLang
            )
            : formatCurrentWeather(
                weatherData,
                location,
                activeLang
            );

        if (answer) {
            return answer;
        }

        return localized(
            activeLang,
            'Të dhënat e motit janë të paplota. Provo përsëri pas pak.',
            'The weather data is incomplete. Please try again shortly.',
            'Les données météo sont incomplètes. Veuillez réessayer dans quelques instants.'
        );
    } catch (error) {
        console.warn(
            'Gabim gjatë marrjes së motit:',
            error
        );

        return localized(
            activeLang,
            'Nuk mund të marr të dhënat e motit për momentin. Kontrollo lidhjen me internetin dhe provo përsëri.',
            'Weather information is temporarily unavailable. Check your internet connection and try again.',
            'Les informations météo sont temporairement indisponibles. Vérifiez votre connexion Internet et réessayez.'
        );
    }
}

// -------------------------------------------------------------
// OPTIONAL PUBLIC EXPORTS FOR TESTING
// -------------------------------------------------------------

export {
    extractCity,
    getWeatherStatus,
    isWeatherQuery,
    isTomorrowQuery
};
