# Deploying Tayylo to Vercel

The web app and its `/api` backend (also used by the mobile app) deploy as one
Vercel project. The database is Neon Postgres; photos for Explore go to Vercel
Blob.

## 1. Environment variables

Set these in Vercel → Project → Settings → Environment Variables.

| Variable | Required | What it is |
| --- | --- | --- |
| `DATABASE_URL` | yes | Neon **pooled** connection string. Used by the app at runtime. |
| `DIRECT_URL` | recommended | Neon **direct** (non-pooled) connection string. Used only by `prisma migrate deploy` during the build. Falls back to `DATABASE_URL`. |
| `AUTH_SECRET` | yes | Signs session cookies. Generate once (`npx auth secret`); changing it signs everyone out. |
| `AUTH_URL` | recommended | The production origin, e.g. `https://app.tayylo.com`. |
| `RESEND_API_KEY` | yes | Sends password-reset emails. |
| `EMAIL_FROM` | yes | Sender, e.g. `Tayylo <noreply@yourdomain>`. The domain must be verified in Resend. |
| `BLOB_READ_WRITE_TOKEN` | yes for Explore uploads | Created automatically when you connect a Vercel Blob store to the project. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | no | Enables "Continue with Google" on the web. Accounts are linked the same way as Apple. |
| `ADMIN_HOST` | for the admin portal | e.g. `admin.tayylo.com`. Add the domain to this same Vercel project. See [ADMIN.md](ADMIN.md). |
| `MODERATION_EMAIL` | recommended | Where Explore report alerts go. |
| `APPLE_TEAM_ID` / `APPLE_KEY_ID` / `APPLE_PRIVATE_KEY` / `APPLE_CLIENT_ID` (Services ID) / `APPLE_BUNDLE_ID` | for Sign in with Apple | Server-only. See [SIGN_IN_WITH_APPLE.md](SIGN_IN_WITH_APPLE.md). `APPLE_CLIENT_SECRET` is no longer used. |

Give Preview deployments their own Neon branch for `DATABASE_URL` / `DIRECT_URL`.
Otherwise every preview build runs migrations against production.

## 2. Build

Vercel runs the `vercel-build` script:

```
prisma generate && prisma migrate deploy && next build
```

`prisma migrate deploy` only applies migrations that haven't run yet. It never
resets data. Add schema changes with `npx prisma migrate dev` locally and commit
the generated folder in `prisma/migrations/`.

Seeding the starter measurement templates is a one-off per database:
`npx prisma db seed`, run locally with the target database's URL.

## 3. After deploying

- `GET /api/health` should return `{"ok":true,"db":"up"}`. Point an uptime monitor at it.
- Sign up, sign in, and request a password reset to confirm email delivery.
- Point the mobile app at the deployment: `EXPO_PUBLIC_API_URL=https://<your-domain>`
  in the mobile repo's build environment.

## 4. Tests

`npm test` runs the backend suite against a throwaway in-memory Postgres
(PGlite) with every migration applied. It needs no database URL or secrets and
refuses to run against a non-local database. GitHub Actions
(`.github/workflows/test.yml`) runs typecheck, lint and tests on every push.

## Not done yet

- **Rate limiting** on sign-in, sign-up and forgot-password. On Vercel this
  needs shared storage (e.g. Upstash Redis via the Vercel Marketplace).
- **Google sign-in in the iOS app.** The web flow works (same identity table
  as Apple); the app still needs a native Google client.
- **Photos stored inline.** Client and order photos are base64 data URLs in
  Postgres (capped at ~1.5 MB each). Moving them to Blob would keep the
  database small.
