# Subscriptions and marketing

## Subscriptions

Tailors are on a **plan**. Everyone without a paid subscription gets the
default plan (Free). Plans, prices, limits and selling points are edited in the
admin portal under **Subscriptions → Edit plans & prices** (owners only).

| | Free (starter defaults) | Pro |
| --- | --- | --- |
| Clients | up to 30 | unlimited |
| Studio logo on invoices and receipts | no | yes |
| Post to Explore | yes | yes |
| Price | free | ₦5,000/month, ₦50,000/year, $5/month, $50/year |

**Nothing is enforced until you switch on "Subscriptions and plan limits" in
App controls.** Do that once Paystack is set up and the prices are final.
Existing tailors over a limit keep everything they have; they just can't add
more. Logos already uploaded stay on their documents.

How people pay:

- **Web:** Paystack. Settings → Plan shows an Upgrade button. The tailor pays
  on Paystack's page, and the webhook switches them to the new plan. "Manage
  billing" opens Paystack's page for updating the card or cancelling.
- **iPhone / Android:** Apple and Google's in-app billing through RevenueCat.
  Apple and Google require this for subscriptions sold inside the app.
- **Given free by Tayylo:** on any user's page in the portal, "Give a plan for
  free" (for 1–12 months or until removed). Use it for partners, promotions,
  or to make up for a problem.

All three end up as one subscription per user, which is what the admin portal
reports and what the limits check.

### Paystack setup

1. Paystack dashboard → Settings → API Keys & Webhooks.
2. Set `PAYSTACK_SECRET_KEY` in Vercel. Use the test key first, then the live key.
3. Webhook URL: `https://<app domain>/api/billing/paystack/webhook`
4. Paystack plans are created automatically on the first checkout for each
   price. Changing a price creates a new Paystack plan; existing subscribers
   keep their old price.
5. Test with Paystack's test cards (test key), then switch to the live key.

### RevenueCat setup (mobile app, separate repo)

1. Create the subscription products in App Store Connect and Google Play
   Console (e.g. `pro_monthly`, `pro_yearly`).
2. In RevenueCat, attach them to an entitlement whose ID matches the plan's
   **RevenueCat entitlement ID** in the portal (Pro is `pro`).
3. In the app, configure RevenueCat with the **Tayylo user id** as
   `appUserID` (`Purchases.logIn(user.id)` after sign-in). That's how
   purchases are matched to accounts.
4. RevenueCat → Integrations → Webhooks: URL
   `https://<app domain>/api/billing/revenuecat/webhook`, Authorization header
   = any long random secret. Set the same value as `REVENUECAT_WEBHOOK_AUTH` in Vercel.
5. The app's upgrade screen can read `GET /api/billing` (plan, usage, plans
   on offer). A `402` from the API means "upgrade to do this"; show the
   upgrade screen.

## Marketing (Campaigns)

Admin portal → **Campaigns**: write a message, pick channels (email and/or
mobile push) and an audience (tailors/customers, plan, studio country, recent
activity), send yourself a test, then send. Sending happens in batches while
the page is open. If it's interrupted, open the campaign and press **Resume**;
nobody receives it twice. `{name}` becomes each person's first name.

**Templates → New template** publishes a measurement template to every tailor.
**Announce it** opens a campaign already written for that template.

- **Email** uses Resend (`RESEND_API_KEY`). Optional `MARKETING_EMAIL_FROM`
  sets a separate sender, e.g. `Tayylo <news@yourdomain>`. Every email has an
  unsubscribe link and one-click unsubscribe headers. Set `COMPANY_ADDRESS` to
  include your postal address in the footer (required by some anti-spam laws).
- **Push** uses Expo's push service. The mobile app must:
  1. ask for notification permission and get its Expo push token
     (`Notifications.getExpoPushTokenAsync()`);
  2. after sign-in (and on each launch) `POST /api/me/push-tokens`
     `{ "token": "ExponentPushToken[…]", "platform": "ios" | "android" }`;
  3. on sign-out `DELETE /api/me/push-tokens` with the same body;
  4. when a notification is opened, go to `data.url` if one is set.
  `EXPO_ACCESS_TOKEN` is only needed if you turn on "enhanced push security"
  in Expo.
- **Preferences:** people turn off news by email or push in Settings (tailors)
  or Account (customers). The app can use `GET`/`PATCH /api/me/preferences`.

**Consent.** Existing and new accounts start subscribed to product updates.
That's common for service updates to your own users, with an unsubscribe
in every email. If you'll send pure promotions in the EU/UK, or want to be
strict under Nigeria's NDPA, add a consent checkbox at sign-up. The
`marketingEmails` flag is already there to store it.

## Environment variables

| Variable | Needed for |
| --- | --- |
| `PAYSTACK_SECRET_KEY` | web checkout and webhook signatures |
| `REVENUECAT_WEBHOOK_AUTH` | app store purchases |
| `MARKETING_EMAIL_FROM` | optional: a separate sender for campaigns |
| `COMPANY_ADDRESS` | optional: postal address in the campaign email footer |
| `EXPO_ACCESS_TOKEN` | optional: Expo enhanced push security |
