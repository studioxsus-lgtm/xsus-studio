// services/weather-service.js

export async function checkWeather(userQuery) {
    const query = userQuery.toLowerCase().trim();

    // Kontrollojmë nëse pyetja përmban fjalë kyçe të motit
    const hasWeatherWord = query.includes("moti") || query.includes("temperatura") || 
                           query.includes("weather") || query.includes("temperature") || 
                           query.includes("météo") || query.includes("meteo");

    if (!hasWeatherWord) return null;

    const isSq = query.includes("moti") || query.includes("temperatura") || query.includes("sot") || query.includes("në") || query.includes("ne");
    const isFr = query.includes("météo") || query.includes("meteo") || query.includes("température");

    // Nxjerrim çdo gjë pas fjalëve kyçe si emër qyteti (p.sh. "në kukes", "ne tirana")
    let city = query
        .replace(/si është moti sot në|si eshte moti sot ne|si është moti në|si eshte moti ne|moti sot në|moti sot ne|moti në|moti ne|moti|temperatura në|temperatura ne|temperatura/g, "")
        .replace(/weather today in|weather in|weather today|weather|temperature in|temperature|forecast for/g, "")
        .replace(/météo aujourd'hui à|meteo aujourd'hui a|météo à|meteo a|météo|meteo|température à|temperature/g, "")
        .replace(/sot|today|aujourd'hui|në|ne|a|à/g, "")
        .trim();

    // Nëse nuk mbetet qytet pas pastrimit, marrim fjalën e fundit të shkruar nga përdoruesi (p.sh. "kukes")
    if (!city || city.length < 2) {
        const words = query.split(" ");
        city = words[words.length - 1]; // Merr fjalën e fundit, si p.sh. "kukes"
    }

    try {
        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
        const geoRes = await fetch(geoUrl);
        const geoData = await geoRes.json();

        if (!geoData.results || geoData.results.length === 0) {
            return isSq ? `Nuk u gjet asnjë informacion për motin në qytetin "${city}".` :
                   isFr ? `Aucune information météo trouvée pour la ville "${city}" vag.` :
                          `Could not find weather information for "${city}".`;
        }

        const location = geoData.results[0];
        const { latitude, longitude, name, country } = location;

        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`;
        const weatherRes = await fetch(weatherUrl);
        const weatherData = await weatherRes.json();

        if (!weatherData.current_weather) return null;

        const { temperature, windspeed, weathercode } = weatherData.current_weather;
        const weatherStatus = getWeatherStatus(weathercode, isSq ? "sq" : isFr ? "fr" : "en");

        if (isSq) {
            return `Moti në ${name}, ${country}:\n\n` +
                   `- Temperatura: ${temperature}°C\n` +
                   `- Kushtet: ${weatherStatus.description} ${weatherStatus.icon}\n` +
                   `- Shpejtësia e erës: ${windspeed} km/h`;
        } else if (isFr) {
            return `Météo à ${name}, ${country}:\n\n` +
                   `- Température: ${temperature}°C\n` +
                   `- Conditions: ${weatherStatus.description} ${weatherStatus.icon}\n` +
                   `- Vitesse du vent: ${windspeed} km/h`;
        } else {
            return `Weather in ${name}, ${country}:\n\n` +
                   `- Temperature: ${temperature}°C\n` +
                   `- Conditions: ${weatherStatus.description} ${weatherStatus.icon}\n` +
                   `- Wind Speed: ${windspeed} km/h`;
        }

    } catch (error) {
        console.warn("Gabim gjatë marrjes së motit:", error);
        return null;
    }
}

function getWeatherStatus(code, lang) {
    const map = {
        0: { icon: "☀️", sq: "Kjelltë", en: "Clear sky", fr: "Ciel dégagé" },
        1: { icon: "🌤️", sq: "Kryesisht kthjellët", en: "Mainly clear", fr: "Ensoleillé" },
        2: { icon: "⛅", sq: "Pjesërisht me vranësira", en: "Partly cloudy", fr: "Partiellement nuageux" },
        3: { icon: "☁️", sq: "Vrenjtur", en: "Overcast", fr: "Couvert" },
        45: { icon: "🌫️", sq: "Mjegull", en: "Foggy", fr: "Brouillard" },
        61: { icon: "🌧️", sq: "Shi i lehtë", en: "Slight rain", fr: "Pluie légère" },
        63: { icon: "🌧️", sq: "Shi mesatar", en: "Moderate rain", fr: "Pluie modérée" },
        65: { icon: "🌧️", sq: "Shi i fortë", en: "Heavy rain", fr: "Forte pluie" },
        71: { icon: "❄️", sq: "Dëborë e lehtë", en: "Slight snow", fr: "Neige légère" },
        95: { icon: "⛈️", sq: "Shtrëngatë me rrufe", en: "Thunderstorm", fr: "Orage" }
    };

    const status = map[code] || { icon: "🌡️", sq: "E ndryshueshme", en: "Variable", fr: "Variable" };
    return {
        icon: status.icon,
        description: status[lang] || status.en
    };
}
