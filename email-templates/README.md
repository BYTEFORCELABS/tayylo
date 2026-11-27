# Emails

Every email Tayylo sends is built from one design system in
`src/lib/email-templates.ts`. Preview them all in the admin portal under
**Emails** (desktop and phone widths, plus the plain-text version).

| Email | Sent when |
| --- | --- |
| Welcome (tailor / customer) | an account is created (email, Apple or Google) |
| Password reset | someone uses "Forgot password" |
| Admin sign-in code | staff sign in to admin.tayylo.com |
| Plan upgraded / plan given free | a subscription starts, or staff give a plan |
| Payment failed | a renewal payment fails (first time only) |
| Campaign | staff send a campaign |
| Moderation alert | an Explore post is reported (to `MODERATION_EMAIL`) |

Artwork (garment rail, seal icons, list ticks) is PNG, because Gmail and
Outlook don't show SVG. Rebuild it from the garment icon set with:

    node design/email/build-email-assets.mjs

Images load from `EMAIL_ASSETS_URL`, else `AUTH_URL`, else
`https://app.tayylo.com`, so new artwork only shows once it's deployed.

The two `.html` files here are the old Supabase-era designs, kept for reference.
