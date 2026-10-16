// services/sports-service.js

const FOOTBALL_API_BASE =
  process.env.SPORTS_API_BASE_URL || "https://api.football-data.org/v4";

const FOOTBALL_API_TOKEN = process.env.FOOTBALL_DATA_TOKEN;

const RSS2JSON_BASE = "https://api.rss2json.com/v1/api.json";

const REQUEST_TIMEOUT_MS = 12000;
const MAX_NEWS_ITEMS = 6;
const MAX_MATCHES = 10;

const LANG = {
  en: {
    live: "Live football matches",
    upcoming: "Upcoming football matches",
    standings: "League standings",
    news: "Sports news",
    noLive: "There are no live matches available right now.",
    noUpcoming: "No upcoming matches were found.",
    noStandings: "League standings are currently unavailable.",
    noNews: "No sports news was found.",
    unknownCompetition:
      "I couldn't identify the league. Try Premier League, La Liga, Serie A, Bundesliga or Champions League.",
    apiError:
      "I couldn't retrieve the football data right now. Please try again later.",
    home: "Home",
    away: "Away",
    date: "Date",
    position: "Pos",
    team: "Team",
    played: "P",
    won: "W",
    drawn: "D",
    lost: "L",
    points: "Pts",
    goalDifference: "GD",
    score: "Score",
    status: "Status",
    liveLabel: "LIVE",
    scheduled: "Scheduled",
    finished: "Finished",
    vs: "vs",
  },
  sq: {
    live: "Ndeshjet live",
    upcoming: "Ndeshjet e ardhshme",
    standings: "Renditja e ligës",
    news: "Lajmet sportive",
    noLive: "Nuk ka ndeshje live të disponueshme tani.",
    noUpcoming: "Nuk u gjetën ndeshje të ardhshme.",
    noStandings: "Renditja e ligës nuk është e disponueshme tani.",
    noNews: "Nuk u gjetën lajme sportive.",
    unknownCompetition:
      "Nuk e identifikova ligën. Provo Premier League, La Liga, Serie A, Bundesliga ose Champions League.",
    apiError:
      "Nuk arrita të marr të dhënat e futbollit. Provo përsëri më vonë.",
    home: "Vendas",
    away: "Mysafir",
    date: "Data",
    position: "Poz.",
    team: "Ekipi",
    played: "N",
    won: "F",
    drawn: "B",
    lost: "H",
    points: "Pikë",
    goalDifference: "GD",
    score: "Rezultati",
    status: "Statusi",
    liveLabel: "LIVE",
    scheduled: "E planifikuar",
    finished: "Përfunduar",
    vs: "kundër",
  },
  fr: {
    live: "Matchs en direct",
    upcoming: "Prochains matchs",
    standings: "Classement du championnat",
    news: "Actualités sportives",
    noLive: "Aucun match en direct disponible pour le moment.",
    noUpcoming: "Aucun prochain match trouvé.",
    noStandings: "Le classement est momentanément indisponible.",
    noNews: "Aucune actualité sportive trouvée.",
    unknownCompetition:
      "Championnat non identifié. Essayez Premier League, La Liga, Serie A, Bundesliga ou Champions League.",
    apiError:
      "Impossible de récupérer les données de football. Réessayez plus tard.",
    home: "Domicile",
    away: "Extérieur",
    date: "Date",
    position: "Pos.",
    team: "Équipe",
    played: "J",
    won: "G",
    drawn: "N",
    lost: "P",
    points: "Pts",
    goalDifference: "Diff.",
    score: "Score",
    status: "Statut",
    liveLabel: "EN DIRECT",
    scheduled: "Programmé",
    finished: "Terminé",
    vs: "contre",
  },
};

const COMPETITIONS = [
  {
    code: "PL",
    names: ["premier league", "premierliga", "angli", "england"],
  },
  {
    code: "PD",
    names: ["la liga", "laliga", "spanish league", "spanje", "spanja"],
  },
  {
    code: "SA",
    names: ["serie a", "italian league", "italia", "itali"],
  },
  {
    code: "BL1",
    names: ["bundesliga", "german league", "germany", "gjermani"],
  },
  {
    code: "FL1",
    names: ["ligue 1", "france", "franca", "france league"],
  },
  {
    code: "CL",
    names: [
      "champions league",
      "uefa champions league",
      "champions",
      "championet",
    ],
  },
  {
    code: "DED",
    names: ["eredivisie", "dutch league", "netherlands", "holanda"],
  },
  {
    code: "PPL",
    names: ["primeira liga", "portugal league", "portugali"],
  },
  {
    code: "ELC",
    names: [
      "championship",
      "english championship",
      "english second division",
    ],
  },
];

const TEAM_ALIASES = {
  "manchester united": ["man united", "man utd", "mufc"],
  "manchester city": ["man city", "mancity", "mcfc"],
  "tottenham hotspur": ["tottenham", "spurs"],
  "newcastle united": ["newcastle"],
  "west ham united": ["west ham"],
  "brighton and hove albion": ["brighton"],
  "nottingham forest": ["nottingham"],
  "wolverhampton wanderers": ["wolves", "wolverhampton"],
  "real madrid": ["madrid", "real"],
  "atletico madrid": ["atlético madrid", "atletico"],
  "fc barcelona": ["barcelona", "barca", "barça"],
  "athletic club": ["athletic bilbao"],
  "inter milan": ["inter", "internazionale"],
  "ac milan": ["milan"],
  "paris saint-germain": ["psg", "paris saint germain"],
  "bayern munich": ["bayern", "bayern münchen"],
  "borussia dortmund": ["dortmund", "bvb"],
  "bayer leverkusen": ["leverkusen"],
  "ajax": ["afc ajax"],
  "benfica": ["sl benfica"],
  "sporting cp": ["sporting lisbon", "sporting"],
};

function normalize(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function detectLanguage(query = "") {
  const text = normalize(query);

  const albanianWords = [
    "ndeshje",
    "neser",
    "sot",
    "ekipi",
    "rezultati",
    "renditja",
    "lajme",
    "futboll",
    "kampionati",
    "kush fitoi",
    "sa me sa",
  ];

  const frenchWords = [
    "match",
    "matches",
    "aujourd hui",
    "demain",
    "classement",
    "actualites",
    "football",
    "resultat",
    "prochain",
  ];

  if (albanianWords.some((word) => text.includes(normalize(word)))) {
    return "sq";
  }

  if (frenchWords.some((word) => text.includes(normalize(word)))) {
    return "fr";
  }

  return "en";
}

function getTranslations(language = "en") {
  return LANG[language] || LANG.en;
}

function detectIntent(query = "") {
  const text = normalize(query);

  if (
    /\b(news|lajme|actualites|transfer|transfers|transferime)\b/.test(text)
  ) {
    return "news";
  }

  if (
    /\b(standings|table|classification|classement|renditja|tabela|points table)\b/.test(
      text,
    )
  ) {
    return "standings";
  }

  if (
    /\b(upcoming|fixtures|schedule|next match|next matches|prochains|prochain match|ndeshjet e ardhshme|ndeshja e ardhshme|neser|tomorrow|demain)\b/.test(
      text,
    )
  ) {
    return "upcoming";
  }

  if (
    /\b(live|livescore|live score|scores|score en direct|en direct|rezultatet live|rezultati live|rezultatet|rezultati|sa me sa|ndeshje tani)\b/.test(
      text,
    )
  ) {
    return "live";
  }

  return "news";
}

function findCompetition(query = "") {
  const text = normalize(query);

  return (
    COMPETITIONS.find((competition) =>
      competition.names.some((name) => {
        const normalizedName = normalize(name);
        return (
          text === normalizedName ||
          text.includes(normalizedName)
        );
      }),
    ) || null
  );
}

function findTeam(query = "") {
  const text = normalize(query);

  for (const [team, aliases] of Object.entries(TEAM_ALIASES)) {
    const names = [team, ...aliases];

    if (
      names.some((name) => {
        const normalizedName = normalize(name);
        return (
          text === normalizedName ||
          text.includes(normalizedName)
        );
      })
    ) {
      return team;
    }
  }

  return null;
}

async function requestJson(url, { headers = {}, timeout = REQUEST_TIMEOUT_MS } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers,
      signal: controller.signal,
    });

    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}`);
      error.status = response.status;
      throw error;
    }

    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function footballRequest(path) {
  if (!FOOTBALL_API_TOKEN) {
    throw new Error(
      "FOOTBALL_DATA_TOKEN is missing from environment variables.",
    );
  }

  const url = `${FOOTBALL_API_BASE}${path}`;

  return requestJson(url, {
    headers: {
      "X-Auth-Token": FOOTBALL_API_TOKEN,
      Accept: "application/json",
    },
  });
}

function formatKickoff(dateValue, language = "en") {
  if (!dateValue) return "—";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) return "—";

  const locale =
    language === "sq"
      ? "sq-AL"
      : language === "fr"
        ? "fr-FR"
        : "en-GB";

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Brussels",
  }).format(date);
}

function getMatchStatus(match, t) {
  const status = match.status;

  if (["IN_PLAY", "PAUSED", "LIVE"].includes(status)) {
    return t.liveLabel;
  }

  if (status === "FINISHED") {
    return t.finished;
  }

  return t.scheduled;
}

function formatMatch(match, language = "en") {
  const t = getTranslations(language);

  const home = match.homeTeam?.name || t.home;
  const away = match.awayTeam?.name || t.away;

  const homeScore = match.score?.fullTime?.home;
  const awayScore = match.score?.fullTime?.away;

  const hasScore =
    homeScore !== null &&
    homeScore !== undefined &&
    awayScore !== null &&
    awayScore !== undefined;

  const score = hasScore
    ? `${homeScore} - ${awayScore}`
    : t.vs;

  const status = getMatchStatus(match, t);
  const kickoff = formatKickoff(match.utcDate, language);

  return `${home} ${score} ${away} | ${kickoff} | ${status}`;
}

function deduplicateMatches(matches = []) {
  const seen = new Set();

  return matches.filter((match) => {
    const key =
      match.id ??
      [
        match.utcDate,
        match.homeTeam?.name,
        match.awayTeam?.name,
      ].join("-");

    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}

function isLiveMatch(match) {
  return ["IN_PLAY", "PAUSED", "LIVE"].includes(match.status);
}

function isUpcomingMatch(match) {
  return (
    ["SCHEDULED", "TIMED"].includes(match.status) &&
    new Date(match.utcDate).getTime() >= Date.now()
  );
}

function getDateRange(days = 7) {
  const now = new Date();
  const end = new Date(now);

  end.setUTCDate(end.getUTCDate() + days);

  return {
    dateFrom: now.toISOString().slice(0, 10),
    dateTo: end.toISOString().slice(0, 10),
  };
}

async function getMatches({
  intent = "live",
  competition = null,
  team = null,
} = {}) {
  let path;

  if (competition) {
    path = `/competitions/${encodeURIComponent(competition.code)}/matches`;

    if (intent === "live") {
      path += "?status=LIVE";
    } else if (intent === "upcoming") {
      const { dateFrom, dateTo } = getDateRange(14);
      path += `?dateFrom=${dateFrom}&dateTo=${dateTo}`;
    }
  } else if (intent === "live") {
    path = "/matches?status=LIVE";
  } else {
    const { dateFrom, dateTo } = getDateRange(7);
    path = `/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`;
  }

  const data = await footballRequest(path);

  let matches = Array.isArray(data.matches) ? data.matches : [];

  if (intent === "live") {
    matches = matches.filter(isLiveMatch);
  } else if (intent === "upcoming") {
    matches = matches.filter(isUpcomingMatch);
  }

  if (team) {
    const normalizedTeam = normalize(team);
    const aliases = TEAM_ALIASES[team] || [];

    matches = matches.filter((match) => {
      const home = normalize(match.homeTeam?.name || "");
      const away = normalize(match.awayTeam?.name || "");
      const homeMatches =
        home.includes(normalizedTeam) ||
        aliases.some((alias) => home.includes(normalize(alias)));
      const awayMatches =
        away.includes(normalizedTeam) ||
        aliases.some((alias) => away.includes(normalize(alias)));

      return homeMatches || awayMatches;
    });
  }

  return deduplicateMatches(matches).slice(0, MAX_MATCHES);
}

async function getStandings(competition) {
  if (!competition) {
    throw new Error("A competition is required for standings.");
  }

  const data = await footballRequest(
    `/competitions/${encodeURIComponent(competition.code)}/standings`,
  );

  const table = data.standings?.find(
    (standing) => standing.type === "TOTAL",
  )?.table;

  return Array.isArray(table) ? table : [];
}

function formatStandings(table = [], language = "en") {
  const t = getTranslations(language);

  if (!table.length) return t.noStandings;

  const rows = table.slice(0, 20).map((entry) => {
    const team = entry.team?.shortName || entry.team?.name || "—";
    const position = entry.position ?? "—";
    const played = entry.playedGames ?? 0;
    const won = entry.won ?? 0;
    const drawn = entry.draw ?? 0;
    const lost = entry.lost ?? 0;
    const points = entry.points ?? 0;
    const goalDifference = entry.goalDifference ?? 0;

    return `${position}. ${team} — ${points} ${t.points} | ${t.played}: ${played} | ${t.won}: ${won} | ${t.drawn}: ${drawn} | ${t.lost}: ${lost} | ${t.goalDifference}: ${goalDifference}`;
  });

  return `${t.standings}\n\n${rows.join("\n")}`;
}

function buildNewsUrl(query, language = "en") {
  const languageConfig = {
    en: { hl: "en-GB", gl: "GB", ceid: "GB:en" },
    sq: { hl: "sq", gl: "AL", ceid: "AL:sq" },
    fr: { hl: "fr", gl: "FR", ceid: "FR:fr" },
  };

  const config = languageConfig[language] || languageConfig.en;
  const search = encodeURIComponent(query || "football");

  const rssUrl =
    `https://news.google.com/rss/search?q=${search}` +
    `&hl=${config.hl}&gl=${config.gl}&ceid=${config.ceid}`;

  return `${RSS2JSON_BASE}?rss_url=${encodeURIComponent(rssUrl)}`;
}

async function getNews(query = "football", language = "en") {
  const t = getTranslations(language);

  try {
    const url = buildNewsUrl(query, language);
    const data = await requestJson(url);

    if (data.status !== "ok" || !Array.isArray(data.items)) {
      return t.noNews;
    }

    const items = data.items.slice(0, MAX_NEWS_ITEMS);

    if (!items.length) return t.noNews;

    return `${t.news}\n\n${items
      .map((item, index) => {
        const title = item.title || "Untitled";
        const link = item.link || "";
        const published = item.pubDate
          ? formatKickoff(item.pubDate, language)
          : "";

        return `${index + 1}. ${title}${published ? ` (${published})` : ""}${link ? `\n${link}` : ""}`;
      })
      .join("\n\n")}`;
  } catch {
    return t.noNews;
  }
}

/**
 * Main compatibility function.
 * Detects the user's language and intent, then returns a text response.
 */
export async function checkSports(userQuery = "") {
  const query = String(userQuery || "").trim();

  if (!query) {
    return "Please ask about football news, live scores, upcoming matches or league standings.";
  }

  const language = detectLanguage(query);
  const intent = detectIntent(query);
  const t = getTranslations(language);

  try {
    if (intent === "news") {
      const competition = findCompetition(query);
      const team = findTeam(query);

      const searchTerms = [
        team,
        competition?.names[0],
        "football",
      ].filter(Boolean);

      return await getNews(searchTerms.join(" "), language);
    }

    if (intent === "standings") {
      const competition = findCompetition(query);

      if (!competition) {
        return t.unknownCompetition;
      }

      const table = await getStandings(competition);
      return formatStandings(table, language);
    }

    const competition = findCompetition(query);
    const team = findTeam(query);

    const matches = await getMatches({
      intent,
      competition,
      team,
    });

    if (intent === "live") {
      if (!matches.length) return t.noLive;

      return `${t.live}\n\n${matches
        .map((match) => formatMatch(match, language))
        .join("\n")}`;
    }

    if (intent === "upcoming") {
      if (!matches.length) return t.noUpcoming;

      return `${t.upcoming}\n\n${matches
        .map((match) => formatMatch(match, language))
        .join("\n")}`;
    }

    return await getNews(query, language);
  } catch (error) {
    console.error("[sports-service] Error:", error.message);
    return t.apiError;
  }
}

export async function getSportsNews(
  query = "football",
  language = detectLanguage(query),
) {
  return getNews(query, language);
}

export async function getLiveScores(
  query = "",
  language = detectLanguage(query),
) {
  const competition = findCompetition(query);
  const team = findTeam(query);
  const t = getTranslations(language);

  try {
    const matches = await getMatches({
      intent: "live",
      competition,
      team,
    });

    if (!matches.length) return t.noLive;

    return `${t.live}\n\n${matches
      .map((match) => formatMatch(match, language))
      .join("\n")}`;
  } catch (error) {
    console.error("[sports-service] Live scores error:", error.message);
    return t.apiError;
  }
}

export async function getUpcomingMatches(
  query = "",
  language = detectLanguage(query),
) {
  const competition = findCompetition(query);
  const team = findTeam(query);
  const t = getTranslations(language);

  try {
    const matches = await getMatches({
      intent: "upcoming",
      competition,
      team,
    });

    if (!matches.length) return t.noUpcoming;

    return `${t.upcoming}\n\n${matches
      .map((match) => formatMatch(match, language))
      .join("\n")}`;
  } catch (error) {
    console.error("[sports-service] Upcoming matches error:", error.message);
    return t.apiError;
  }
}

export async function getLeagueStandings(
  query = "",
  language = detectLanguage(query),
) {
  const competition = findCompetition(query);
  const t = getTranslations(language);

  if (!competition) return t.unknownCompetition;

  try {
    const table = await getStandings(competition);
    return formatStandings(table, language);
  } catch (error) {
    console.error("[sports-service] Standings error:", error.message);
    return t.apiError;
  }
}
