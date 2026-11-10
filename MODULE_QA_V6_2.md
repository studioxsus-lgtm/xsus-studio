# XSUS App V6.2 — XSUS Studio Login Link and Session Status

Source inspected: `studioxsus-lgtm/xsus-studio`, `auth.html` on the default branch. Existing Studio auth uses Supabase JS v2, `signInWithPassword`, `signUp`, `resetPasswordForEmail`, `updateUser`, `signOut`, `getSession`, and auth state changes. The Supabase URL and publishable key in the adapter match that public client configuration. No service-role secret is included.

## Changes
- Landing and Builder headers: Login / Sign Up / account link.
- Links target the existing hosted `https://www.xsusstudio.com/auth.html`.
- `studio-auth-bridge.js`: when running on the Studio origin, calls `auth.getUser()` to verify the current user and subscribes to auth state changes; otherwise displays signed-out links. This is UI status only, not authorization or protected storage.
- Responsive CSS and EN/SQ/FR labels.

## Verified
- 11/11 new static auth checks passed.
- 14/14 full V6.0 QA checks passed.
- JS syntax: 19/19 passed.
- Existing i18n/static suite passed.

## Limits and pending tests
- Browser login/signup, cookie/storage sharing and deployed domain behavior not exercised.
- Current `auth.html` reads `reset` but does not automatically switch to Sign Up from `?mode=signup`; user can select its Sign Up tab. That needs a separate Studio auth.html change.
- Hosted auth may be unavailable or have different canonical origin; must verify after deployment.
- No authorization gate, project data isolation, or backend account integration is claimed.
- No GitHub changes made.
