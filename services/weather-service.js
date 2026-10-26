/**
 * XSUS Weather Engine
 * Version: 2.4.0
 *
 * Languages: Albanian (sq), English (en), French (fr)
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
    geocodingUrl: 'https://geocoding-api.open-meteo.com/v1/search',
    forecastUrl: 'https://api.open-meteo.com/v1/forecast',
    defaultCity: 'Namur',
    timeoutMs: 10000
};

// -------------------------------------------------------------
// TEKSTET E PËRKTHYERA
// -------------------------------------------------------------

const LANGUAGE_TEXT = {
    sq: {
        cityMissing: 'Nuk arrita të përcaktoj qytetin. Provo: Moti në Bruksel.',
        cityNotFound: (city) =>
            `Nuk gjeta qytetin "${city}". Kontrollo emrin dhe provo përsëri.`,
        serviceError: 'Shërbimi i motit nuk është përkohësisht i disponueshëm. Provo përsëri.',
        currentTitle: (city) => `Moti aktual në ${city}`,
        tomorrowTitle: (city) => `Parashikimi i motit për nesër në ${city}`,
        conditions: 'Gjendja',
        temperature: 'Temperatura',
        min: 'Temperatura minimale',
        max: 'Temperatura maksimale',
        wind: 'Shpejtësia e erës',
        noData: 'Nuk u morën të dhëna të vlefshme për motin.'
    },

    en: {
        cityMissing: "I couldn't identify the city. Try: Weather in Brussels.",
        cityNotFound: (city) =>
            `I couldn't find the city "${city}". Check the name and try again.`,
        serviceError: 'The weather service is temporarily unavailable. Please try again.',
        currentTitle: (city) => `Current weather in ${city}`,
        tomorrowTitle: (city) => `Weather forecast for tomorrow in ${city}`,
        conditions: 'Conditions',
        temperature: 'Temperature',
        min: 'Minimum temperature',
        max: 'Maximum temperature',
        wind: 'Wind speed',
        noData: 'No valid weather data was returned.'
    },

    fr: {
        cityMissing: "Je n'ai pas pu identifier la ville. Essayez : Météo à Bruxelles.",
        cityNotFound: (city) =>
            `Je n'ai pas trouvé la ville "${city}". Vérifiez son nom et réessayez.`,
        serviceError: 'Le service météo est temporairement indisponible. Veuillez réessayer.',
        currentTitle: (city) => `Météo actuelle à ${city}`,
        tomorrowTitle: (city) => `Prévisions météo pour demain à ${city}`,
        conditions: 'Conditions',
        temperature: 'Température',
        min: 'Température minimale',
        max: 'Température maximale',
        wind: 'Vitesse du vent',
        noData: "Aucune donnée météo valide n'a été reçue."
    }
};

// -------------------------------------------------------------
// ALIASET E QYTETEVE
// Çelësat normalizohen pa thekse dhe me shkronja të vogla.
// -------------------------------------------------------------

const CITY_ALIASES = {
    // Belgjikë
    bruksel: 'Brussels',
    brukseli: 'Brussels',
    brussels: 'Brussels',
    brussel: 'Brussels',
    bruxelles: 'Brussels',

    namur: 'Namur',
    liege: 'Liège',
    lieja: 'Liège',
    antwerp: 'Antwerp',
    antwerpen: 'Antwerp',
    anvers: 'Antwerp',
    gent: 'Ghent',
    ghent: 'Ghent',
    gand: 'Ghent',
    charleroi: 'Charleroi',
    bruges: 'Bruges',
    brugge: 'Bruges',

    // Gjermani
    berlin: 'Berlin',
    munih: 'Munich',
    munich: 'Munich',
    munchen: 'Munich',
    frankfurt: 'Frankfurt',
    hamburg: 'Hamburg',
    kolonja: 'Cologne',
    cologne: 'Cologne',
    koln: 'Cologne',

    // Mbretëria e Bashkuar
    londer: 'London',
    londres: 'London',
    london: 'London',
    manchester: 'Manchester',
    edinburgh: 'Edinburgh',

    // Francë
    pariz: 'Paris',
    paris: 'Paris',
    lion: 'Lyon',
    lyon: 'Lyon',
    marseille: 'Marseille',
    bordo: 'Bordeaux',
    bordeaux: 'Bordeaux',
    nice: 'Nice',
    nica: 'Nice',

    // Itali
    rome: 'Rome',
    roma: 'Rome',
    rome: 'Rome',
    milano: 'Milan',
    milan: 'Milan',
    venice: 'Venice',
    venecia: 'Venice',
    naples: 'Naples',
    napoli: 'Naples',

    // Spanjë
    madrid: 'Madrid',
    barcelona: 'Barcelona',
    sevilla: 'Seville',
    seville: 'Seville',

    // Austri dhe Zvicër
    viene: 'Vienna',
    vienna: 'Vienna',
    wien: 'Vienna',
    zurich: 'Zurich',
    geneva: 'Geneva',
    geneve: 'Geneva',

    // Portugali
    lisbone: 'Lisbon',
    lisboa: 'Lisbon',
    lisbon: 'Lisbon',

    // Çeki dhe Greqi
    prage: 'Prague',
    prague: 'Prague',
    praha: 'Prague',
    athine: 'Athens',
    athens: 'Athens',
    athina: 'Athens',

    // Danimarkë dhe Serbi
    kopenhage: 'Copenhagen',
    copenhagen: 'Copenhagen',
    kobenhavn: 'Copenhagen',
    beograd: 'Belgrade',
    belgrade: 'Belgrade',

    // Holandë
    amsterdam: 'Amsterdam',
    rotterdam: 'Rotterdam',
    hage: 'The Hague',
    hague: 'The Hague',
    den haag: 'The Hague',

    // Luksemburg
    luksemburg: 'Luxembourg',
    luxembourg: 'Luxembourg'
};

// -------------------------------------------------------------
// KODET METEOROLOGJIKE WMO
// -------------------------------------------------------------

const WEATHER_CODES = {
    0: {
        icon: '☀️',
        sq: 'Qiell i kthjellët',
        en: 'Clear sky',
        fr: 'Ciel dégagé'
    },
    1: {
        icon: '🌤️',
        sq: 'Kryesisht kthjellët',
        en: 'Mainly clear',
        fr: 'Généralement dégagé'
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
        sq: 'Shi shumë i lehtë',
        en: 'Light drizzle',
        fr: 'Bruine légère'
    },
    53: {
        icon: '🌦️',
        sq: 'Shi i imët mesatar',
        en: 'Moderate drizzle',
        fr: 'Bruine modérée'
    },
    55: {
        icon: '🌧️',
        sq: 'Shi i imët i dendur',
        en: 'Dense drizzle',
        fr: 'Bruine dense'
    },
    56: {
        icon: '🌧️',
        sq: 'Shi ngrirës i lehtë',
        en: 'Light freezing drizzle',
        fr: 'Bruine verglaçante légère'
    },
    57: {
        icon: '🌧️',
        sq: 'Shi ngrirës i dendur',
        en: 'Dense freezing drizzle',
        fr: 'Bruine verglaçante dense'
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
        fr: 'Grains de neige'
    },
    80: {
        icon: '🌦️',
        sq: 'Reshje të lehta shiu',
        en: 'Slight rain showers',
        fr: 'Averses faibles'
    },
    81: {
        icon: '🌧️',
        sq: 'Reshje mesatare shiu',
        en: 'Moderate rain showers',
        fr: 'Averses modérées'
    },
    82: {
        icon: '⛈️',
        sq: 'Reshje të forta shiu',
        en: 'Violent rain showers',
        fr: 'Averses violentes'
    },
    85: {
        icon: '🌨️',
        sq: 'Reshje të lehta dëbore',
        en: 'Slight snow showers',
        fr: 'Averses de neige faibles'
    },
    86: {
        icon: '❄️',
        sq: 'Reshje të forta dëbore',
        en: 'Heavy snow showers',
        fr: 'Fortes averses de neige'
    },
    95: {
        icon: '⛈️',
        sq: 'Stuhi me vetëtima',
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

// -------------------------------------------------------------
// NORMALIZIMI
// -------------------------------------------------------------

function normalizeText(value = '') {
    return String(value)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[’']/g, "'")
        .replace(/[?!,;:()[\]{}"]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

// -------------------------------------------------------------
// ZBULIMI I GJUHËS
// -------------------------------------------------------------

function resolveLanguage(query, requestedLanguage = 'auto') {
    const text = normalizeText(query);
    const requested = normalizeText(requestedLanguage);

    // Fjalët specifike të motit në shqip.
    if (
        /\b(moti|temperatura|temperaturat|neser|parashikimi|reshje|shiu|bore|era|shi|diell)\b/.test(text) ||
        /\b(si eshte|si do te jete|me trego motin)\b/.test(text)
    ) {
        return 'sq';
    }

    // Formulime të zakonshme në frëngjisht.
    if (
        /\b(meteo|demain|aujourd hui|temperature|temperatures|pluie|neige|vent|previsions|ensoleille|nuageux|quel|quelle|temps|fait|aujourd'hui)\b/.test(text) ||
        /\b(quel temps|quelle est la meteo|est ce que)\b/.test(text)
    ) {
        return 'fr';
    }

    // Formulime të zakonshme në anglisht.
    if (
        /\b(weather|forecast|tomorrow|today|temperature|temperatures|rain|rainy|snow|snowy|sunny|cloudy|wind)\b/.test(text) ||
        /\b(what is the weather|how is the weather)\b/.test(text)
    ) {
        return 'en';
    }

    if (['sq', 'al', 'albanian', 'shqip'].includes(requested)) {
        return 'sq';
    }

    if (['fr', 'french', 'francais'].includes(requested)) {
        return 'fr';
    }

    if (['en', 'english', 'anglais'].includes(requested)) {
        return 'en';
    }

    return 'en';
}

// -------------------------------------------------------------
// IDENTIFIKIMI I KËRKESËS PËR MOTIN
// -------------------------------------------------------------

function isWeatherQuery(query = '') {
    const text = normalizeText(query);

    return (
        /\b(moti|temperatura|temperaturat|parashikimi|reshje|shiu|bore|weather|forecast|temperature|temperatures|rain|rainy|snow|snowy|sunny|cloudy|wind|meteo|temps|pluie|neige|ensoleille|nuageux|previsions)\b/.test(text) ||
        /\b(what is the weather|how is the weather|quelle meteo|quel temps|si eshte moti|si do te jete moti)\b/.test(text)
    );
}

function isTomorrowQuery(query = '') {
    return /\b(neser|tomorrow|demain)\b/.test(normalizeText(query));
}

// -------------------------------------------------------------
// PASTRIMI DHE NXJERRJA E QYTETIT
// -------------------------------------------------------------

function cleanCityName(value = '') {
    return normalizeText(value)
        .replace(/\b(today|tomorrow|tonight|demain|aujourd hui|neser|sot|sonte)\b/g, ' ')
        .replace(/\b(weather|forecast|meteo|moti|parashikimi|temperatura|temperaturat|temperature|temps|pluie|rain|snow|shiu|reshje)\b/g, ' ')
        .replace(/\b(please|svp|ju lutem)\b/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function extractCity(query = '') {
    const text = normalizeText(query);

    if (!text) {
        return '';
    }

    // Qyteti pas parafjalëve të zakonshme në shqip,
    // anglisht dhe frëngjisht.
    const patterns = [
        /\b(?:in|at|for)\s+(.+)$/i,
        /\b(?:ne|per)\s+(.+)$/i,
        /\b(?:a|au|aux|dans)\s+(.+)$/i
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);

        if (!match?.[1]) {
            continue;
        }

        const city = cleanCityName(match[1]);

        if (city.length >= 2) {
            return city;
        }
    }

    // Formulime si "Si është moti Bruksel?"
    const fallback = cleanCityName(
        text
            .replace(/\b(what is|what s|how is|show me|tell me)\b/g, ' ')
            .replace(/\b(quelle est|quel est|donne moi|affiche)\b/g, ' ')
            .replace(/\b(si est|si eshte|si do te jete|me trego|ma trego|me thuaj)\b/g, ' ')
    );

    return fallback.length >= 2 ? fallback : '';
}

// -------------------------------------------------------------
// ALIASET E QYTETEVE
// -------------------------------------------------------------

function resolveCityAlias(city) {
    const normalized = normalizeText(city);

    return CITY_ALIASES[normalized] || city.trim();
}

// -------------------------------------------------------------
// PËRKTHIMI I KUSHTEVE METEOROLOGJIKE
// -------------------------------------------------------------

function getWeatherStatus(code, lang = 'en') {
    const item = WEATHER_CODES[Number(code)];

    if (!item) {
        const fallback = {
            sq: 'Gjendje e panjohur e motit',
            en: 'Unknown weather conditions',
            fr: 'Conditions météo inconnues'
        };

        return {
            icon: '🌡️',
            description: fallback[lang] || fallback.en
        };
    }

    return {
        icon: item.icon,
        description: item[lang] || item.en
    };
}

// -------------------------------------------------------------
// KËRKESA HTTP ME TIMEOUT
// -------------------------------------------------------------

async function fetchJSON(url) {
    const controller = new AbortController();

    const timeout = setTimeout(
        () => controller.abort(),
        WEATHER_CONFIG.timeoutMs
    );

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                Accept: 'application/json'
            },
            signal: controller.signal
        });

        if (!response.ok) {
            throw new Error(`Weather API HTTP ${response.status}`);
        }

        const data = await response.json();

        if (!data || typeof data !== 'object' || data.error) {
            throw new Error(
                data?.reason || 'Invalid weather API response'
            );
        }

        return data;
    } finally {
        clearTimeout(timeout);
    }
}

// -------------------------------------------------------------
// GJEOKODIMI I QYTETIT
// -------------------------------------------------------------

async function findCity(city) {
    const searchName = resolveCityAlias(city);

    const candidates = [
        searchName,
        ...(searchName !== city ? [city] : [])
    ];

    for (const candidate of candidates) {
        const url = new URL(WEATHER_CONFIG.geocodingUrl);

        url.searchParams.set('name', candidate);
        url.searchParams.set('count', '10');
        url.searchParams.set('language', 'en');
        url.searchParams.set('format', 'json');

        const data = await fetchJSON(url.toString());

        if (!Array.isArray(data.results) || data.results.length === 0) {
            continue;
        }

        const wanted = normalizeText(candidate);

        const location =
            data.results.find(
                (item) => normalizeText(item.name) === wanted
            ) || data.results[0];

        if (
            typeof location.latitude !== 'number' ||
            typeof location.longitude !== 'number' ||
            !location.name
        ) {
            continue;
        }

        return {
            name: location.name,
            country: location.country || '',
            latitude: location.latitude,
            longitude: location.longitude
        };
    }

    return null;
}

// -------------------------------------------------------------
// MARRJA E TË DHËNAVE TË MOTIT
// -------------------------------------------------------------

async function fetchWeather(location) {
    const url = new URL(WEATHER_CONFIG.forecastUrl);

    url.searchParams.set('latitude', String(location.latitude));
    url.searchParams.set('longitude', String(location.longitude));

    url.searchParams.set(
        'current',
        'temperature_2m,weather_code,wind_speed_10m'
    );

    url.searchParams.set(
        'daily',
        'weather_code,temperature_2m_max,temperature_2m_min,wind_speed_10m_max'
    );

    url.searchParams.set('timezone', 'auto');
    url.searchParams.set('forecast_days', '2');

    return fetchJSON(url.toString());
}

// -------------------------------------------------------------
// FORMATIMI I MOTIT AKTUAL
// -------------------------------------------------------------

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
    const place = location.country
        ? `${location.name}, ${location.country}`
        : location.name;

    const lines = [
        `🌍 **${t.currentTitle(place)}**`,
        `${status.icon} **${t.conditions}:** ${status.description}`,
        `🌡️ **${t.temperature}:** ${Number(current.temperature_2m).toFixed(1)} °C`
    ];

    if (Number.isFinite(wind)) {
        lines.push(`💨 **${t.wind}:** ${wind.toFixed(1)} km/h`);
    }

    return lines.join('\n');
}

// -------------------------------------------------------------
// FORMATIMI I PARASHIKIMIT PËR NESËR
// -------------------------------------------------------------

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
    const place = location.country
        ? `${location.name}, ${location.country}`
        : location.name;

    const lines = [
        `🌍 **${t.tomorrowTitle(place)}**`,
        `${status.icon} **${t.conditions}:** ${status.description}`,
        `🌡️ **${t.min}:** ${min.toFixed(1)} °C`,
        `🌡️ **${t.max}:** ${max.toFixed(1)} °C`
    ];

    if (Number.isFinite(wind)) {
        lines.push(`💨 **${t.wind}:** ${wind.toFixed(1)} km/h`);
    }

    return lines.join('\n');
}

// -------------------------------------------------------------
// FUNKSIONI KRYESOR
// Përdoret nga router.js: await checkWeather(query, activeLang)
// -------------------------------------------------------------

export async function checkWeather(userQuery, lang = 'auto') {
    if (
        typeof userQuery !== 'string' ||
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
        console.error('[XSUS Weather Engine]', error);
        return t.serviceError;
    }
}

// -------------------------------------------------------------
// EKSPORTET PËR TESTIM DHE PËRDORIM NGA MODUlet E TJERA
// -------------------------------------------------------------

export {
    extractCity,
    getWeatherStatus,
    isWeatherQuery,
    isTomorrowQuery,
    resolveLanguage,
    resolveCityAlias
};
