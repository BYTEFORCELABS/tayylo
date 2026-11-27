/**
 * Ready-made campaigns. Text in [square brackets] is for you to fill in;
 * the editor won't send while any is left. {name} becomes each person's
 * first name. Lines starting "- " become a ticked list in the email.
 */
export interface Preset {
  key: string;
  name: string;
  description: string;
  group: "Product" | "Service" | "Growth" | "Community";
  draft: {
    title: string;
    subject: string;
    body: string;
    ctaLabel: string | null;
    /** Path on the app, turned into a full link. */
    ctaPath: string | null;
    sendEmail: boolean;
    sendPush: boolean;
    pushTitle: string | null;
    pushBody: string | null;
    audience: { roles: string[]; plans: string[]; countries: string[]; activeWithinDays: number | null; inactiveForDays?: number | null };
  };
}

const everyone = { roles: [], plans: [], countries: [], activeWithinDays: null };
const tailors = { roles: ["tailor"], plans: [], countries: [], activeWithinDays: null };

export const PRESETS: Preset[] = [
  {
    key: "new-feature",
    name: "New feature",
    description: "Announce something new, with a short list of what it does.",
    group: "Product",
    draft: {
      title: "Feature launch: [feature]",
      subject: "New in Tayylo: [feature name]",
      body: "Hi {name},\n\nWe've just added **[feature name]** to Tayylo. [One sentence on the problem it solves, e.g. “Sending a client their invoice now takes one tap.”]\n\n- [What it does, benefit one]\n- [Benefit two]\n- [Benefit three]\n\nIt's live now on the web and in the app. We'd love to hear what you think, just reply to this email.",
      ctaLabel: "Try it now",
      ctaPath: "/today",
      sendEmail: true,
      sendPush: true,
      pushTitle: "New: [feature name]",
      pushBody: "[One line on what it does]. Tap to try it.",
      audience: tailors,
    },
  },
  {
    key: "new-templates",
    name: "New measurement templates",
    description: "Tell tailors about templates you've added. (Or use “Announce it” on a template.)",
    group: "Product",
    draft: {
      title: "New templates",
      subject: "Fresh measurement templates are in",
      body: "Hi {name},\n\nWe've added new measurement templates to Tayylo, ready for your next client:\n\n- **[Template one]**: [what it's for]\n- **[Template two]**: [what it's for]\n\nEach one comes with the right fields in the right order, plus sensible ranges that catch typos as you measure. Pick them in Record measurements.",
      ctaLabel: "Record measurements",
      ctaPath: "/measure",
      sendEmail: true,
      sendPush: true,
      pushTitle: "New measurement templates",
      pushBody: "[Template one], [template two] and more are ready in Record measurements.",
      audience: tailors,
    },
  },
  {
    key: "maintenance-scheduled",
    name: "Scheduled maintenance",
    description: "Warn people before planned downtime.",
    group: "Service",
    draft: {
      title: "Maintenance notice [date]",
      subject: "Planned maintenance on [day, date]",
      body: "Hi {name},\n\nWe're upgrading Tayylo on **[day, date] from [start time] to [end time] ([timezone])**. During that window the web app and the mobile app will be unavailable.\n\nYour clients, measurements and orders are safe and nothing needs to be done on your side. If you have a fitting in that window, it's worth noting the measurements you'll need beforehand.\n\nThanks for your patience. We'll let you know as soon as we're back.",
      ctaLabel: null,
      ctaPath: null,
      sendEmail: true,
      sendPush: true,
      pushTitle: "Planned maintenance [day]",
      pushBody: "Tayylo will be unavailable [start]–[end] while we upgrade. Your data is safe.",
      audience: everyone,
    },
  },
  {
    key: "maintenance-done",
    name: "We're back",
    description: "Maintenance is over, everything's working.",
    group: "Service",
    draft: {
      title: "Maintenance complete",
      subject: "Tayylo is back, and better",
      body: "Hi {name},\n\nOur maintenance is finished and Tayylo is fully back up. Thanks for bearing with us.\n\n[Optional: one line on what's improved, e.g. “Pages now load up to twice as fast.”]\n\nIf anything looks off, reply to this email and we'll sort it out quickly.",
      ctaLabel: "Open Tayylo",
      ctaPath: "/today",
      sendEmail: true,
      sendPush: true,
      pushTitle: "We're back",
      pushBody: "Maintenance is done and everything's running. Thanks for your patience.",
      audience: everyone,
    },
  },
  {
    key: "offer",
    name: "Special offer",
    description: "A time-limited discount on a paid plan.",
    group: "Growth",
    draft: {
      title: "Offer: [discount] off Pro",
      subject: "{name}, [discount] off Tayylo Pro until [end date]",
      body: "Hi {name},\n\nFor a limited time, Tayylo Pro is **[discount] off** for your first [period]. It's the perfect moment to give your studio room to grow:\n\n- Unlimited clients\n- Your studio logo on every invoice and receipt\n- Priority support when you need a hand\n\nThe offer ends on **[end date]**.",
      ctaLabel: "Upgrade to Pro",
      ctaPath: "/settings",
      sendEmail: true,
      sendPush: true,
      pushTitle: "[discount] off Pro, this week only",
      pushBody: "Unlimited clients and your logo on invoices. Ends [end date].",
      audience: { roles: ["tailor"], plans: ["free"], countries: [], activeWithinDays: null },
    },
  },
  {
    key: "upgrade",
    name: "Upgrade to Pro",
    description: "A friendly nudge for busy studios on the free plan.",
    group: "Growth",
    draft: {
      title: "Pro nudge",
      subject: "Your studio is growing, and Pro grows with it",
      body: "Hi {name},\n\nYou've been busy, and it shows. When your client list outgrows the free plan, Pro keeps everything in one place:\n\n- **Unlimited clients**, so no one gets left in a notebook\n- **Your logo on invoices and receipts**, so every document looks like your brand\n- **Priority support** from the Tayylo team\n\nUpgrade in a minute from Settings, and switch back any time.",
      ctaLabel: "See Pro",
      ctaPath: "/settings",
      sendEmail: true,
      sendPush: false,
      pushTitle: null,
      pushBody: null,
      audience: { roles: ["tailor"], plans: ["free"], countries: [], activeWithinDays: 30 },
    },
  },
  {
    key: "app-update",
    name: "Update the app",
    description: "A new app version is out (pair with the minimum version in App controls).",
    group: "Service",
    draft: {
      title: "App update [version]",
      subject: "A new Tayylo app is ready",
      body: "Hi {name},\n\nVersion **[version]** of the Tayylo app is now in the App Store and Google Play. It brings:\n\n- [Improvement one]\n- [Improvement two]\n- Fixes and speed-ups throughout\n\nUpdate from your app store to get it.",
      ctaLabel: null,
      ctaPath: null,
      sendEmail: false,
      sendPush: true,
      pushTitle: "Update Tayylo",
      pushBody: "Version [version] is here with [headline improvement]. Update from your app store.",
      audience: everyone,
    },
  },
  {
    key: "tips",
    name: "Tips & tricks",
    description: "Help people get more out of Tayylo.",
    group: "Community",
    draft: {
      title: "Tips: measure faster",
      subject: "3 ways to measure faster in Tayylo",
      body: "Hi {name},\n\nA few small habits that save tailors real time every week:\n\n- **Use the keypad fractions.** Tap ¼, ½ or ¾ instead of typing decimals.\n- **Compare with last time.** Every new measurement shows the change from the previous set, so you'll spot a typo before it becomes a re-cut.\n- **Search from anywhere.** Find any client in two seconds from the search bar.\n\nHave a tip of your own? Reply and we might share it with other tailors.",
      ctaLabel: "Open Tayylo",
      ctaPath: "/today",
      sendEmail: true,
      sendPush: false,
      pushTitle: null,
      pushBody: null,
      audience: tailors,
    },
  },
  {
    key: "explore",
    name: "New on Explore",
    description: "Invite customers and tailors to fresh styles.",
    group: "Community",
    draft: {
      title: "Explore: [theme]",
      subject: "New styles to inspire your next outfit",
      body: "Hi {name},\n\nTailors have been sharing beautiful work on Explore this week, from [style one] to [style two].\n\nSave the looks you love and show them to your tailor when it's time to make something.",
      ctaLabel: "Browse Explore",
      ctaPath: "/explore",
      sendEmail: true,
      sendPush: true,
      pushTitle: "New styles on Explore",
      pushBody: "Fresh [style one] and [style two] looks from tailors. Tap to browse.",
      audience: everyone,
    },
  },
  {
    key: "come-back",
    name: "We've missed you",
    description: "Bring back people who haven't opened Tayylo in a while.",
    group: "Growth",
    draft: {
      title: "Win-back",
      subject: "Your clients' measurements are waiting for you",
      body: "Hi {name},\n\nIt's been a little while. Everything you saved in Tayylo is right where you left it: your clients, their measurements and your orders.\n\nHere's what's new since your last visit:\n\n- [Something new]\n- [Something else new]\n\nPick up where you left off. It only takes a tap.",
      ctaLabel: "Open my studio",
      ctaPath: "/today",
      sendEmail: true,
      sendPush: true,
      pushTitle: "Your studio is waiting",
      pushBody: "Your clients and measurements are right where you left them.",
      audience: { roles: ["tailor"], plans: [], countries: [], activeWithinDays: null, inactiveForDays: 30 },
    },
  },
  {
    key: "season",
    name: "Season's greetings",
    description: "A warm note for a holiday or season.",
    group: "Community",
    draft: {
      title: "Greetings: [occasion]",
      subject: "Happy [occasion] from all of us at Tayylo",
      body: "Hi {name},\n\nThe [occasion] season is one of the busiest of the year for tailors, with fittings, last-minute alterations and outfits that have to be perfect.\n\nThank you for trusting Tayylo with your studio. We hope this season brings you happy clients, full order books and a moment to rest.\n\nHappy [occasion]!",
      ctaLabel: null,
      ctaPath: null,
      sendEmail: true,
      sendPush: false,
      pushTitle: null,
      pushBody: null,
      audience: everyone,
    },
  },
];

/** Text left in [brackets] that still needs filling in. */
export const unfilled = (...texts: (string | null | undefined)[]) =>
  [...new Set(texts.flatMap(t => (t ?? "").match(/\[[^\]\n]{1,60}\]/g) ?? []))];
