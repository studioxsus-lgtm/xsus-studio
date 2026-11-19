# Future XSUS Core browser adapter

This small JavaScript client is an HTTP adapter. It does not import or bundle
the English model, session store, or learning worker. The calling application
provides its API URL and a function that returns the current Supabase access
token.

```js
import { createXsusCoreClient } from "./xsus-core-client.js";

const core = createXsusCoreClient({
  baseUrl: "https://your-core-api.example",
  getAccessToken: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  },
});

const session = await core.createSession();
const answer = await core.sendMessage(session.session_id, {
  text: "Please make this sentence clearer.",
  language: "en",
});
```

The adapter requests a fresh access token for each call, omits cookies, disables
HTTP caching, and never stores conversation text or tokens. It submits learning
feedback only when the caller explicitly passes `consent: true`; the product
must show its own clear consent control before calling `submitFeedback`.
Feedback remains pending until its owner reviews it. The API origin must be
HTTPS except for loopback development, and the server must allow the frontend's
exact origin through `XSUS_API_ALLOWED_ORIGINS`.

## Learning feedback panel

The standalone panel connects the consent form, private review queue and
owner-scoped learning status. Import its stylesheet separately so the host
product can place it in an account or learning-settings view:

```js
import { createXsusCoreClient } from "./xsus-core-client.js";
import { mountLearningPanel } from "./learning-panel.js";

const core = createXsusCoreClient({
  baseUrl: "https://future-xsus-core-api.onrender.com",
  getAccessToken: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  },
});

const panel = mountLearningPanel(document.querySelector("#learning-settings"), {
  client: core,
});
```

Add `learning-panel.css` with a `<link rel="stylesheet">` in the host page.

The form sends only the prompt and preferred response entered into it after the
user checks the consent box. The user reviews each pending item before it can
enter training. The panel displays the approved-example count and the latest
worker state; the server returns `candidate_ready` only after its quality gate
passes, and every candidate still requires a separate human release.

The host application must configure the exact HTTPS website origin in
`XSUS_API_ALLOWED_ORIGINS`. Supabase's publishable key belongs in the host
application's public client configuration; the browser sends only the signed-in
user's short-lived access token to Future XSUS Core. Never put a Supabase
secret/service-role key in browser code.

Run its standalone tests from this directory with `npm test` (Node.js 20+).
