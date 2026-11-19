# Auth emails (now sent directly via Resend — not Supabase)

These HTML files are kept as the design reference for Tayylo's branded
transactional emails. The app no longer goes through Supabase's
dashboard-configured SMTP/templates — it sends emails itself via the Resend
SDK, from `src/lib/email.ts`.

- `reset-password.html` → its markup (with Supabase's `{{ .ConfirmationURL }}`
  / `{{ .Email }}` / `{{ .SiteURL }}` tokens swapped for plain JS template
  interpolation) is inlined in `sendPasswordResetEmail()` in
  `src/lib/email.ts`.
- `confirm-signup.html` → not currently used. Tayylo doesn't require email
  verification before first sign-in (v1 decision); if that changes later,
  this template is ready to adapt the same way.

Required env vars (see `.env.local`): `RESEND_API_KEY`, `EMAIL_FROM`
(defaults to `Tayylo <noreply@cyberziktechnologies.online>` — the verified
Resend sending domain).
