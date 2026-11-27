# Admin portal (admin.tayylo.com)

The admin portal is part of this same Next.js app and Vercel project. Requests
to the admin host are rewritten into `src/app/admin/*` by `src/proxy.ts`, and
`/admin` returns 404 on every other host. The API under `/api` is shared, so
anything changed here applies to the web app and the mobile app at once.

## Setting it up

1. **Deploy** this branch. The `admin_portal` migration runs during the build
   (`prisma migrate deploy`). It only adds columns and tables.
2. **Domain:** in Vercel → Project → Settings → Domains, add `admin.tayylo.com`
   to the *same* project, then add the DNS record Vercel shows you (a CNAME to
   `cname.vercel-dns.com`).
3. **Env var:** set `ADMIN_HOST=admin.tayylo.com`. Any host starting with
   `admin.` already works without it; the variable is also used for the
   "Review it in the admin portal" link in moderation alert emails.
4. **Make yourself owner.** Your account must exist and have a password.
   Run this against the production database:
   ```
   npm run admin:grant -- you@example.com
   ```
   Then sign in at https://admin.tayylo.com with that email and password.
   Add everyone else from the **Team** page.

Local development: run `npm run dev` and open http://admin.localhost:3000
(Chrome and Firefox resolve `*.localhost` on their own).

## Access levels

| | Moderator | Admin | Owner |
| --- | :-: | :-: | :-: |
| Overview, users, insights, audit log (view) | ✓ | ✓ | ✓ |
| Moderate Explore (hide, restore, dismiss, remove) | ✓ | ✓ | ✓ |
| Suspend, change account type, password reset, delete account | | ✓ | ✓ |
| App controls (maintenance, sign-ups, posting, banner, min version) | view | ✓ | ✓ |
| Team (add or remove staff) | | | ✓ |

- Nobody can act on their own account, or on staff at or above their level.
- Owners can only be created or removed with `npm run admin:grant`.
- The staff role is read from the database on every request. Removing
  someone's access, or suspending them, takes effect immediately.
- The admin portal sets its own sign-in cookie, separate from the main app's.

## What each control does

- **Suspend:** the account is refused on its next API request (web and app),
  can't sign in again (any method), and its Explore posts are hidden. Nothing
  is deleted. Lifting the suspension restores everything.
- **Delete account:** the same as the user deleting it themselves. Sign in
  with Apple grants are revoked, then everything the account owns is removed.
- **Maintenance mode:** every non-staff API request returns 503 with your
  message, and the web app shows a maintenance screen.
- **New sign-ups off:** email registration returns 403, and new Apple/Google
  accounts get the code `signups_closed`. Existing users are unaffected.
- **Posting to Explore off:** new posts and uploads return 503. Browsing still works.

Every change is written to the audit log, along with who made it.

## Mobile app follow-ups (separate repo)

The API already enforces everything above. The app still needs the following
to show it nicely:

- On launch (and when the app is foregrounded), read `GET /api/app-config`:
  ```json
  {
    "maintenance": { "message": "..." } | null,
    "announcement": { "message": "...", "tone": "info" | "warning" } | null,
    "signupsEnabled": true,
    "explorePostingEnabled": true,
    "minAppVersion": { "ios": "1.2.0" | null, "android": null }
  }
  ```
  Show a maintenance screen, an announcement banner, or a forced-update
  prompt when the build is older than `minAppVersion`.
- Handle the new sign-in error codes `suspended` and `signups_closed`.
  Credentials sign-in returns them as `code`. Apple/Google forward them via
  `/api/auth/mobile/finish`.
- Optionally send `X-Tayylo-Client: app` on API requests. Web vs app activity
  is otherwise inferred from the user agent.

## Not included yet

- **Two-factor sign-in for staff.** Recommended before inviting more people;
  for now, use a strong, unique password.
- **Request-level performance metrics** (latency, error rates, Web Vitals).
  The overview shows database latency and service configuration only. For the
  rest, turn on Vercel Observability / Speed Insights.
- **Push notifications or email broadcasts** to users.
