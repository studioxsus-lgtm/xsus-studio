// services/weather-service.js

export async function checkWeather(userQuery) {
    if (!userQuery) return null;
    const query = userQuery.toLowerCase().trim();

    // Kontrollojmë nëse pyetja përmban fjalë kyçe të motit ose temperaturës
    const hasWeatherWord = query.includes("moti") || query.includes("temperatura") || 
                           query.includes("temperaturat") || query.includes("weather") || 
                           query.includes("temperature") || query.includes("météo") || 
                           query.includes("meteo") || query.includes("température");

    if (!hasWeatherWord) return null;

    const isSq = query.includes("moti") || query.includes("temperatura") || query.includes("sot") || query.includes("neser") || query.includes("në") || query.includes("ne");
    const isFr = query.includes("météo") || query.includes("meteo") || query.includes("température") || query.includes("demain");
    const isTomorrow = query.includes("neser") || query.includes("nesër") || query.includes("tomorrow") || query.includes("demain");

    // Pastrojmë fjalët e tepërta për të izoluar emrin e qytetit
    let city = query
        .replace(/si është moti sot në|si eshte moti sot ne|si është moti nesër në|si eshte moti neser ne|si është moti në|si eshte moti ne|moti sot në|moti sot ne|moti nesër në|moti neser ne|moti në|moti ne|moti|temperatura në|temperatura ne|temperaturat në|temperaturat ne|temperatura|temperaturat/g, "")
        .replace(/weather today in|weather tomorrow in|weather in|weather today|weather tomorrow|weather|temperature in|temperature|forecast for/g, "")
        .replace(/météo aujourd'hui à|meteo aujourd'hui a|météo demain à|meteo demain a|météo à|meteo a|météo|meteo|température à|temperature/g, "")
        .replace(/sot|neser|nesër|today|tomorrow|demain|aujourd'hui|në|ne|a|à/g, "")
        .trim();

    // Nëse nuk është specifikuar asnjë qytet, përdorim Namur si default
    if (!city || city.length < 2) {
        city = "Namur";
    }

    try {
        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
        const geoRes = await fetch(geoUrl);
        const geoData = await geoRes.json();

        if (!geoData.results || geoData.results.length === 0) {
            return isSq ? `Nuk u gjet asnjë informacion për motin në qytetin "${city}".` :
                   isFr ? `Aucune information météo trouvée pour la ville "${city}".` :
                          `Could not find weather information for "${city}".`;
        }

        const location = geoData.results[0];
        const { latitude, longitude, name, country } = location;

        // Përdorim API-në me parashikim ditor për të mbuluar edhe të nesërmen
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&daily=weathercode,temperature_2m_max,temperature_2m_min,windspeed_10m_max&timezone=auto`;
        const weatherRes = await fetch(weatherUrl);
        const weatherData = await weatherRes.json();

        if (isTomorrow && weatherData.daily) {
            const tempMax = weatherData.daily.temperature_2m_max[1];
            const tempMin = weatherData.daily.temperature_2m_min[1];
            const wind = weatherData.daily.windspeed_10m_max[1];
            const code = weatherData.daily.weathercode[1];
            const weatherStatus = getWeatherStatus(code, isSq ? "sq" : isFr ? "fr" : "en");

            if (isSq) {
                return `🌤️ **Moti nesër në ${name}, ${country}:**\n\n` +
                       `- Temperaturat: Max ${tempMax}°C / Min ${tempMin}°C\n` +
                       `- Kushtet: ${weatherStatus.description} ${weatherStatus.icon}\n` +
                       `- Shpejtësia e erës: deri në ${wind} km/h`;
            } else if (isFr) {
                return `🌤️ **Météo demain à ${name}, ${country}:**\n\n` +
                       `- Températures: Max ${tempMax}°C / Min ${tempMin}°C\n` +
                       `- Conditions: ${weatherStatus.description} ${weatherStatus.icon}\n` +
                       `- Vent: jusqu'à ${wind} km/h`;
            } else {
                return `🌤️ **Weather tomorrow in ${name}, ${country}:**\n\n` +
                       `- Temperature: Max ${tempMax}°C / Min ${tempMin}°C\n` +
                       `- Conditions: ${weatherStatus.description} ${weatherStatus.icon}\n` +
                       `- Wind Speed: up to ${wind} km/h`;
            }
        }

        if (!weatherData.current_weather) return null;

        const { temperature, windspeed, weathercode } = weatherData.current_weather;
        const weatherStatus = getWeatherStatus(weathercode, isSq ? "sq" : isFr ? "fr" : "en");

        if (isSq) {
            return `☀️ **Moti sot në ${name}, ${country}:**\n\n` +
                   `- Temperatura aktuale: ${temperature}°C\n` +
                   `- Kushtet: ${weatherStatus.description} ${weatherStatus.icon}\n` +
                   `- Shpejtësia e erës: ${windspeed} km/h`;
        } else if (isFr) {
            return `☀️ **Météo aujourd'hui à ${name}, ${country}:**\n\n` +
                   `- Température actuelle: ${temperature}°C\n` +
                   `- Conditions: ${weatherStatus.description} ${weatherStatus.icon}\n` +
                   `- Vitesse du vent: ${windspeed} km/h`;
        } else {
            return `☀️ **Weather today in ${name}, ${country}:**\n\n` +
                   `- Current Temperature: ${temperature}°C\n` +
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
