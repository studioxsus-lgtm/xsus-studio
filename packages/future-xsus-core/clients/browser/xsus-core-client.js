/** Small browser adapter for the independent Future XSUS Core HTTP API. */

export class XsusCoreApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = "XsusCoreApiError";
    this.status = status;
    this.code = code;
  }
}

function normalizeBaseUrl(value) {
  const parsed = new URL(value);
  const localHttp = parsed.protocol === "http:" &&
    ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname);
  if ((parsed.protocol !== "https:" && !localHttp) || parsed.username || parsed.password ||
      parsed.search || parsed.hash) {
    throw new TypeError("The XSUS Core API URL must use HTTPS (HTTP is allowed only for loopback)");
  }
  return parsed.href.replace(/\/$/, "");
}

/**
 * Create an API adapter. `getAccessToken` should return the current Supabase
 * access token; the adapter never stores the token or conversation history.
 */
export function createXsusCoreClient({ baseUrl, getAccessToken, fetchImpl = globalThis.fetch }) {
  const origin = normalizeBaseUrl(baseUrl);
  if (typeof getAccessToken !== "function") {
    throw new TypeError("getAccessToken must be a function");
  }
  if (typeof fetchImpl !== "function") {
    throw new TypeError("A Fetch API implementation is required");
  }

  async function request(path, { method = "GET", body } = {}) {
    const accessToken = await getAccessToken();
    if (typeof accessToken !== "string" || !accessToken.trim()) {
      throw new XsusCoreApiError(401, "unauthorized", "Sign in to use XSUS Core");
    }
    const headers = { Authorization: `Bearer ${accessToken}` };
    const options = {
      method,
      headers,
      credentials: "omit",
      cache: "no-store",
      redirect: "error",
      mode: "cors",
    };
    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(body);
    }
    const response = await fetchImpl(`${origin}${path}`, options);
    if (response.status === 204) return null;
    let payload;
    try {
      payload = await response.json();
    } catch {
      throw new XsusCoreApiError(response.status, "invalid_response", "XSUS Core returned an invalid response");
    }
    if (!response.ok) {
      const error = payload?.error;
      throw new XsusCoreApiError(
        response.status,
        typeof error?.code === "string" ? error.code : "request_failed",
        typeof error?.message === "string" ? error.message : "XSUS Core request failed",
      );
    }
    return payload;
  }

  return Object.freeze({
    reason: async ({ requestId, query, facts, rules } = {}) => {
      const result = await request("/v1/intelligence/reason", {
        method: "POST", body: { contractVersion: "1.0.0", requestId, query, facts, rules },
      });
      if (!result || result.contractVersion !== "1.0.0" || result.requestId !== requestId ||
          result.executionAuthorized !== false || typeof result.verifiedDerivation !== "boolean" ||
          !Array.isArray(result.limitations) ||
          !["resolved", "abstained"].includes(result.status) ||
          (result.status === "resolved" && (result.answer !== query || result.verifiedDerivation !== true)) ||
          (result.status === "abstained" && (result.answer !== null || result.verifiedDerivation !== false))) {
        throw new XsusCoreApiError(502, "invalid_response", "Invalid intelligence contract");
      }
      return result;
    },
    createSession: () => request("/v1/sessions", { method: "POST" }),
    listSessions: ({ limit = 20, after } = {}) => {
      const query = new URLSearchParams({ limit: String(limit) });
      if (after) query.set("after", after);
      return request(`/v1/sessions?${query}`);
    },
    getSession: (sessionId) => request(`/v1/sessions/${encodeURIComponent(sessionId)}`),
    sendMessage: (sessionId, { text, language = "en", expected_revision } = {}) =>
      request(`/v1/sessions/${encodeURIComponent(sessionId)}/messages`, {
        method: "POST", body: { text, language, ...(expected_revision === undefined ? {} : { expected_revision }) },
      }),
    deleteSession: (sessionId) => request(`/v1/sessions/${encodeURIComponent(sessionId)}`, { method: "DELETE" }),
    submitFeedback: ({ consent, prompt, response, history = [] } = {}) => {
      if (consent !== true) {
        throw new TypeError("Explicit consent is required before submitting learning feedback");
      }
      return request("/v1/learning/feedback", {
        method: "POST", body: { consent, prompt, response, history },
      });
    },
    getLearningStatus: () => request("/v1/learning/status"),
    listFeedback: () => request("/v1/learning/feedback"),
    getFeedback: (exampleId) => request(`/v1/learning/feedback/${encodeURIComponent(exampleId)}`),
    reviewFeedback: (exampleId, decision) => {
      if (decision !== "accept" && decision !== "reject") {
        throw new TypeError("Feedback decision must be accept or reject");
      }
      return request(`/v1/learning/feedback/${encodeURIComponent(exampleId)}/${decision}`, { method: "POST" });
    },
    deleteFeedback: (exampleId) => request(`/v1/learning/feedback/${encodeURIComponent(exampleId)}`, { method: "DELETE" }),
  });
}
