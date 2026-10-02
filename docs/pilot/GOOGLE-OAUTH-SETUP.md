# Google sign-in — external configuration (NOT executed)

Status: documented only. Nothing below has been applied by the repository work. Do it in staging first.

## Code behaviour (already in the repo)
- `Continuar con Google` on `/login` and `/registro` calls `supabase.auth.signInWithOAuth({provider:'google', options:{redirectTo:<origin>/auth/callback}})`.
- No custom scopes: Supabase requests `openid email profile` only. `provider_token` / `provider_refresh_token` are never read or stored.
- The destination (`next`) is kept in `sessionStorage` and re-validated with `safeNext` on return (the redirect URL stays an exact allowlist match).
- Roles are never read from client or provider metadata. New accounts are site-less participants (migration `202609200001_oauth_display_name.sql`).
- Email/password is unchanged and remains available below the Google button.

## Required before the button works
1. **Migration** `202609200001_oauth_display_name.sql` must be applied (staging, then production) *before* enabling Google. Without it the `auth.users` trigger rejects Google signups (no `display_name` in provider metadata) and the user sees "Database error saving new user".
2. **Google Cloud Console** → APIs & Services → Credentials → OAuth client ID (type *Web application*):
   - Authorized redirect URI: `https://<PROJECT_REF>.supabase.co/auth/v1/callback` (the Supabase callback, not the app URL).
   - OAuth consent screen: app name BITIRO Lab, scopes limited to `openid`, `email`, `profile`; set *Publishing status* to In production (or add all pilot accounts as test users while in Testing). Pilot students on school Google Workspace domains may need the domain admin to allow the app.
3. **Supabase dashboard** → Authentication → Providers → Google: enable, paste Client ID and Client Secret (secret lives only in the dashboard, never in the repo or `.env*`). Leave "Skip nonce check" off.
4. **Supabase dashboard** → Authentication → URL Configuration: Site URL = the production origin; Redirect URLs (exact, no wildcards) must include `https://<origin>/auth/callback` (already used for email confirmation; `?recovery=1` variant is for password reset only).
5. Decide account-linking behaviour: Supabase links identities that share a *verified* email automatically. An existing email/password account with the same verified email will gain the Google identity. Confirm this is acceptable for the pilot; otherwise disable automatic linking.

## Verification checklist (staging)
- New Google user → lands on `/espacios`, profile row exists, membership role `participant`, `site_id` null.
- Existing email/password user signs in with Google (same verified email) → same `user_id`, workspaces intact.
- Cancel at the Google screen → `/auth/callback?error=...` shows the failure card with "Ir a ingresar".
- Open `/login` while signed in → redirected to `next`.
- `next` survives the round trip (e.g. a cohort session link) and an external `next` falls back to `/espacios`.
