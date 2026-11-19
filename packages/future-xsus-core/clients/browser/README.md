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

Run its standalone tests from this directory with `npm test` (Node.js 20+).
