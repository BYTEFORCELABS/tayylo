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
4. **Sign in** at https://admin.tayylo.com: enter your email, then type in
   the 6-digit code it sends you. There are no admin passwords.

## Super admins

`isaacchukwuka67@gmail.com` and `cyberzikk1@gmail.com` are permanent super
admins (`src/lib/admin/super-admins.ts`). They are always owners, whatever the
database says, and they keep access during maintenance mode. Nobody can
suspend them, delete them, or remove their access from the portal, not even
each other. If a super admin email has no Tayylo account yet, one is created
the first time a code is requested for it. Changing the list takes a code
change and a deploy.

Super admins add and remove everyone else from the **Team** page, including
other owners. Owners can add and remove admins and moderators.

## Signing in

1. Enter your email. If it belongs to staff, a 6-digit code is emailed from
   `EMAIL_FROM` through Resend. The page says the same thing either way, so it
   can't be used to find out who is staff.
2. Enter the code. It lasts 10 minutes, works once, and locks after 5 wrong
   tries. Requesting a new code cancels the old one. You can request one every
   30 seconds, up to 6 an hour.

Without `RESEND_API_KEY` (local development), the code is printed in the
server log instead of being emailed.

Local development: run `npm run dev` and open http://admin.localhost:3000
(Chrome and Firefox resolve `*.localhost` on their own).

## Access levels

| | Moderator | Admin | Owner |
| --- | :-: | :-: | :-: |
| Overview, users, insights, audit log (view) | ✓ | ✓ | ✓ |
| Moderate Explore (hide, restore, dismiss, remove) | ✓ | ✓ | ✓ |
| Suspend, change account type, password reset, delete account | | ✓ | ✓ |
| App controls (maintenance, sign-ups, posting, banner, min version) | view | ✓ | ✓ |
| Team (add or remove admins and moderators) | | | ✓ |
| Make or remove owners | | | super admins only |

- Nobody can act on their own account, or on staff at or above their level.
- `npm run admin:grant -- <email> [owner|admin|moderator|none]` changes access
  from the command line, if you ever need it.
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

- **Sign-in is only as safe as the staff member's email account.** Make sure
  staff turn on two-step verification for their email.
- **Request-level performance metrics** (latency, error rates, Web Vitals).
  The overview shows database latency and service configuration only. For the
  rest, turn on Vercel Observability / Speed Insights.
- **Push notifications or email broadcasts** to users.
