# Sign in with Apple

One Tayylo account per Apple ID, on the web (app.tayylo.com) and in the iOS app.
Both platforms use the same backend (this repo's `/api`) and the same `User`
table, so an account created with Apple on one platform signs in on the other.

## How it works

| | Web | iOS app |
| --- | --- | --- |
| Flow | Auth.js Apple provider (OIDC, `response_mode=form_post`) | Native sheet (`expo-apple-authentication`) |
| Apple client id (token `aud`) | Services ID (`APPLE_CLIENT_ID`) | Bundle ID (`APPLE_BUNDLE_ID`, `com.tayylo.app`) |
| Checks | state, nonce, PKCE-less OIDC: signature (Apple JWKS), iss, aud, exp | server-issued nonce (signed HttpOnly cookie) + signature, iss, aud, exp |
| Code exchange | Auth.js, with our ES256 client secret | `/api/auth/callback/apple-native`, with our ES256 client secret |
| Session | Auth.js JWT session cookie (HttpOnly, Secure, SameSite=Lax) | The same cookie, kept in the app's Keychain-backed jar |

Key files:

- `src/lib/apple.ts`: client-secret JWT (ES256, 30-day life, renewed a day
  early, cached per client id); identity-token verification with Apple's JWKS
  (refetched when Apple rotates keys); code exchange; revocation; notification
  verification.
- `src/lib/identity.ts`: maps `(provider, sub)` to a Tayylo user. The same code
  serves web, iOS and Google.
- `src/lib/apple-native.ts`: the iOS sign-in (the `apple-native` Auth.js
  credentials provider).
- `src/lib/auth.ts`: providers, the cross-site cookie fix for Apple's
  `form_post`, and the `signIn` callback.
- `src/app/api/auth/apple/nonce`: issues the iOS nonce.
- `src/app/api/auth/oauth-intent`: carries the sign-up role or "link to my
  account" across the web redirect.
- `src/app/api/auth/apple/notifications`: receives Apple's server-to-server
  events.
- `src/app/api/me/identities`: Settings: list, connect (iOS) and disconnect.
- Database: `AuthIdentity` table; `User.passwordHash` is now nullable;
  `User.name` added (migration `20261125120000_auth_identities`).

### Account rules

1. Identities are matched on Apple's stable `sub`, never on email.
2. The first sign-in with an unknown Apple ID creates an account, with the
   role picked on "Create account" (tailor by default). The account has no
   password.
3. **No automatic merging.** If Apple's email already belongs to an account,
   sign-in stops with: "An account with this email already exists. Sign in with
   your email and password, then connect Apple in Settings." Connecting from
   Settings (web or app) links Apple to the signed-in account.
4. Apple sends the name only on the first authorization. It is saved then, used
   to prefill onboarding, and never overwritten or cleared later. The app keeps
   it in the Keychain until the server has confirmed it, so a dropped
   connection doesn't lose it.
5. Private relay emails (`…@privaterelay.appleid.com`) are normal account
   emails. See "Email relay" below.
6. Apple-only users can add a password with "Forgot password?". Disconnecting
   Apple is refused if it is the account's only way to sign in.
7. Deleting the account revokes the Apple grant first (App Store requirement).
   This is best effort, so an Apple outage never blocks deletion.

## Environment variables (server only)

Never put any of these in `NEXT_PUBLIC_*` or `EXPO_PUBLIC_*` variables.

| Variable | Value |
| --- | --- |
| `APPLE_TEAM_ID` | `7NK6J76ZRH` |
| `APPLE_KEY_ID` | The 10-character ID of the Sign in with Apple key |
| `APPLE_PRIVATE_KEY` | The `.p8` contents. On one line with `\n` escapes (`"-----BEGIN PRIVATE KEY-----\nMIGT…\n-----END PRIVATE KEY-----"`), with real newlines, or just the base64 body. All three work. |
| `APPLE_CLIENT_ID` | The **Services ID** (web), e.g. `com.tayylo.app.web` |
| `APPLE_BUNDLE_ID` | `com.tayylo.app` (this is the default if unset) |
| `AUTH_URL` | `https://app.tayylo.com`. Pins the callback URL. |

`APPLE_CLIENT_SECRET` is no longer used: Apple has no static client secret,
and the server signs one from the key. There is also no `APPLE_REDIRECT_URI`:
Auth.js always uses `${AUTH_URL}/api/auth/callback/apple`, and that must
match the Return URL registered with Apple.

Web Apple sign-in turns on when the first four are set. iOS sign-in needs
`APPLE_TEAM_ID`, `APPLE_KEY_ID` and `APPLE_PRIVATE_KEY`.

## Apple Developer portal

**Certificates, Identifiers & Profiles:**

1. **App ID `com.tayylo.app`**: enable **Sign In with Apple**, as a primary
   App ID. Under its Sign In with Apple settings, set **Server-to-Server
   Notification Endpoint** to
   `https://app.tayylo.com/api/auth/apple/notifications`.
2. **Services ID** (the value of `APPLE_CLIENT_ID`): enable **Sign In with
   Apple**, then Configure:
   - Primary App ID: `com.tayylo.app`
   - Domains and Subdomains: `app.tayylo.com`
   - Return URLs: **`https://app.tayylo.com/api/auth/callback/apple`**

   If the portal asks you to verify the domain, put the file it gives you at
   `public/.well-known/apple-developer-domain-association.txt` and deploy.
3. **Keys**: create a key with **Sign In with Apple** enabled and configure it
   with primary App ID `com.tayylo.app`. Download the `.p8` (Apple lets you do
   this only once), and note its Key ID. One key covers both the Services ID and
   the app.
4. **Email relay** (Services → Sign in with Apple for Email Communication):
   register the domain or address in `EMAIL_FROM` (your Resend domain). Without
   this, password-reset emails to `@privaterelay.appleid.com` addresses are
   dropped. Your Resend domain's SPF and DKIM must pass.

Apple doesn't accept `localhost` or plain-http Return URLs. To try the web flow
before production, add an HTTPS preview or tunnel domain to the Services ID's
domains and Return URLs, and set `AUTH_URL` to it. The iOS flow has no
redirect, so it works against a local `npm run dev` backend.

## Running

Web:

```bash
npm install
npx prisma migrate deploy   # applies 20261125120000_auth_identities (Vercel does this in vercel-build)
npm run dev
npm test                    # backend suite, includes tests/auth/apple.test.ts
```

iOS (in `../tayylo_mobile`):

```bash
npx expo prebuild --clean --platform ios   # ios/ is generated; picks up the new entitlement
npx expo run:ios --device                  # or: npx eas-cli@latest build --profile development --platform ios
```

`app.json` sets `ios.usesAppleSignIn: true` and the `expo-apple-authentication`
plugin. Together they add the `com.apple.developer.applesignin` entitlement.
EAS syncs the capability to the App ID. With local Xcode signing, use team
`7NK6J76ZRH`. Sign in with Apple needs a development build, not Expo Go. In
the Simulator it only works when an Apple ID is signed in.

## Test checklist (manual, on real accounts)

The backend suite covers token verification (bad signature, issuer, audience,
expiry and nonce), client-secret signing and renewal, account creation and
linking, the email-match refusal, relay emails, name handling, double submits,
revocation on deletion and on disconnect, and notifications. These still need
a person, on a device and on the deployed site:

1. New user, web: Create account → Continue with Apple → lands on onboarding with the name prefilled.
2. Same Apple ID, iOS: Continue with Apple → same account, no second user.
3. Hide My Email: the account email is the relay address. A password-reset email to it arrives (needs step 4 of the portal setup).
4. Sign out, then sign in again with Apple: Apple sends no name and the stored name is kept.
5. Existing email/password user taps Apple with the same email: gets the "connect in Settings" message. Settings → Connect works, and Apple sign-in then reaches that account.
6. Cancel the Apple sheet or page: no error on iOS; on web, "didn't finish".
7. iOS Settings → Apple ID → Sign in with Apple → Tayylo → Stop using: on next launch the app signs out.
8. Delete account: Tayylo disappears from the Apple ID's "Sign in with Apple" list.
9. Airplane mode during sign-in: the "Couldn't reach Tayylo" message, and a retry works.
