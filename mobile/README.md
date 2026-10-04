# TUGHE Huduma — Android & iOS app

One app for every TUGHE member and officer:

- **Members** sign in with their phone number. They report a workplace problem, get a reference number (e.g. `TGH-261004-K7QD`), follow its progress and chat with the officer handling it. Push notifications tell them when TUGHE replies.
- **Officers** see a back office (the *Dawati* tab). Every case has a reply deadline and a resolution deadline, and overdue cases come first. Officers can assign cases to themselves, change the stage, extend a deadline, use reply templates or an AI draft, keep internal notes and see an activity log. Every weekday morning they get a reminder about late cases.
- **The assistant (Msaidizi)** answers common questions instantly, even with no internet: leave days, joining TUGHE, contacts, and guidance for each problem type. It finds a case from its reference number and opens the right form. Harder questions go to AI (Claude). It replies in Kiswahili or English.

Everything is bilingual (Kiswahili by default) and works in light and dark mode. The colours and icons come from the TUGHE logo.

```
tughe-app/
├── app/                    ← screens (Expo Router)
│   ├── login.tsx, setup.tsx, new-case.tsx
│   ├── (tabs)/             ← Home, Cases, Assistant, Desk (officers), Guidance, Account
│   ├── case/[id].tsx       ← member's case + chat
│   └── desk/[id].tsx       ← officer's case workspace
├── components/ui.tsx       ← buttons, fields, chips, chat bubbles…
├── lib/                    ← Supabase client, login state, translations, deadlines, chat-bot rules
├── assets/                 ← icon, splash and notification icon made from the TUGHE logo
└── supabase/
    ├── migrations/         ← database: tables, security rules, deadlines, automatic replies
    └── functions/          ← assistant (AI), notify (push), sla-reminder (morning reminder)
```

**Tech:** React Native with Expo (one codebase for Android and iOS) and Supabase (Postgres database, phone login, live updates, server functions). Push notifications go through the Expo push service.

---

## What you need

| | Cost | Notes |
|---|---|---|
| A computer with **Node.js 20+** | free | Windows, Mac or Linux |
| **Supabase** account | free tier to start | supabase.com — hosts the database and login |
| **Expo** account | free tier to start | expo.dev — builds the Android and iOS apps in the cloud, so you don't need a Mac to build for iPhone |
| **SMS provider** for login codes | pay per SMS | Supabase supports Twilio, MessageBird, Vonage and Textlocal. Email login works without one |
| **Anthropic API key** (optional) | pay per use | Powers the AI answers and AI drafts. Without it the assistant still answers common questions |
| **Google Play Console** | US$25 once | Register as an **organization** (needs a D-U-N-S number). New *personal* accounts must first run a closed test with 12 testers for 14 days |
| **Apple Developer Program** | US$99 per year | Enrol as an organization, which also needs a D-U-N-S number |

---

## 1. Set up the server (Supabase), about 20 minutes

1. Create a project at **supabase.com**. Choose the region closest to Tanzania (e.g. *eu-central* or *ap-south*).
2. Install the CLI and link the project:
   ```bash
   npm install -g supabase
   supabase login
   supabase link --project-ref YOUR-PROJECT-REF
   ```
3. Create the database:
   ```bash
   supabase db push
   ```
   You can also paste `supabase/migrations/20261004000000_init.sql` into **SQL Editor → Run**.
4. Turn on login: **Authentication → Sign In / Providers**
   - **Phone**: enable it and enter your SMS provider's details. Members sign in with `07XX…` numbers, which the app turns into `+2557XX…`.
   - **Email**: enabled by default. Go to *Authentication → Email Templates → Magic Link* and make sure the template shows `{{ .Token }}`, so people receive a 6-digit code.
5. Deploy the server functions and set their secrets:
   ```bash
   supabase functions deploy assistant
   supabase functions deploy notify --no-verify-jwt
   supabase functions deploy sla-reminder --no-verify-jwt

   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...        # optional, for AI answers
   supabase secrets set WEBHOOK_SECRET=$(openssl rand -hex 24)
   ```
6. Turn on push notifications: **Database → Webhooks → Create a new hook**. Make three hooks, all of type *Supabase Edge Function* → `notify`, each with the HTTP header `x-webhook-secret: <your WEBHOOK_SECRET>`:
   - table `messages`, event **Insert**
   - table `cases`, event **Insert**
   - table `cases`, event **Update**
7. **Daily deadline reminder** (optional). In **SQL Editor**, run the following. It uses the `pg_cron` and `pg_net` extensions, which you can enable under *Database → Extensions*:
   ```sql
   select cron.schedule('tughe-sla-reminder', '30 4 * * 1-5', $$
     select net.http_post(
       url := 'https://YOUR-PROJECT-REF.supabase.co/functions/v1/sla-reminder',
       headers := jsonb_build_object('x-webhook-secret', 'YOUR-WEBHOOK-SECRET', 'Content-Type', 'application/json'),
       body := '{}'::jsonb);
   $$);
   ```
   (04:30 UTC is 07:30 in Tanzania, Monday to Friday.)

### Make someone an officer

People sign up as members. To give a TUGHE staff member the officers' desk, have them sign in to the app once, then run this in the SQL Editor:

```sql
update public.profiles set role = 'officer' where phone = '+255754000111';   -- or: where email = 'name@tughe.or.tz'
-- 'admin' can also change service times and problem types:
update public.profiles set role = 'admin'   where email = 'ict@tughe.or.tz';
```

### Change the service times

The defaults are: normal cases get a reply within 3 working days and are resolved within 21; urgent cases get a reply within 1 working day and are resolved within 7. To change them:

```sql
update public.sla_settings set respond_days = 2, resolve_days = 14 where urgency = 'normal';
```

The home screen text that states these times is in `lib/i18n.tsx` (`home.promise`), so update it to match.

---

## 2. Run the app on your phone, about 10 minutes

```bash
cd tughe-app
npm install
npx expo install --fix         # aligns package versions with your Expo SDK
cp .env.example .env           # then paste your Supabase URL and anon key into .env
npx expo start
```

Scan the QR code with **Expo Go** (Android) or the Camera app (iPhone).

Remote push notifications don't work inside Expo Go on Android. Use a development build to test them (`eas build --profile development`), or test them with the preview APK below. Everything else works in Expo Go.

---

## 3. Build the real apps

```bash
npm install -g eas-cli
eas login
eas init                       # creates the Expo project and writes its ID into app.json
eas env:create --name EXPO_PUBLIC_SUPABASE_URL --value https://YOUR-PROJECT-REF.supabase.co --environment production --environment preview
eas env:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value YOUR-ANON-KEY --environment production --environment preview
```

| Goal | Command | Result |
|---|---|---|
| Android test file to share with staff | `npm run build:apk` | An `.apk` file you can install on Android phones |
| Android for Google Play | `npm run build:android` | An `.aab` file for the Play Console |
| iPhone for the App Store | `npm run build:ios` | Builds in the cloud; EAS walks you through Apple certificates |

Push notifications on iPhone need an Apple push key. `eas build` offers to create one for you.

## 4. Publish to the stores

```bash
eas submit --platform android    # upload to Google Play (first time: create the app in Play Console)
eas submit --platform ios        # upload to App Store Connect / TestFlight
```

Before you submit, prepare the following:

- **Privacy policy URL.** Both stores require one, because the app stores names, phone numbers, employers and complaints. You could host it at `https://tughe.or.tz/privacy`.
- **Account deletion.** Apple and Google both require a way to delete an account. Add a "delete my account" request through TUGHE ICT, or an in-app button that calls an admin function.
- **Data safety / privacy forms.** Declare that you collect name, phone, email, employment details and messages, all used to provide the service and not shared with third parties.
- **Screenshots.** You need phone screenshots: at least 2 for Android and 3 for iPhone at the 6.7-inch size.
- **App identifiers.** Android uses `tz.or.tughe.huduma`, and iOS uses the bundle ID `tz.or.tughe.huduma`. Change them in `app.json` before the first build if TUGHE prefers different ones. They can't be changed later.

## 5. Updating the app later

- **Text or screen changes:** run `eas update`. Published phones receive it the next time the app opens, with no store review.
- **New native features or a new Expo SDK:** bump `version` in `app.json` and build again.

---

## Security model

The database enforces every rule, so even a modified app can't get around them:

- A member can read only **their own** cases and messages, can't change a case's stage, and can't post in someone else's case.
- Only officers can see every case, update cases, and read internal notes and the activity log.
- Nobody can give themselves the officer role inside the app.
- A case can't be marked resolved or closed without a written resolution, and that resolution is sent to the member automatically.
- The AI key stays on the server. The app never sees it, and only signed-in users can use the assistant.

These rules were tested against PostgreSQL 16: member isolation, blocked self-promotion, the officer workflow, the resolution requirement, hidden notes, deadlines that skip weekends, and acknowledgements in both languages.

## Customising

| What | Where |
|---|---|
| Colours | `lib/theme.ts` (`BRAND` is the logo blue `#2D3597`) |
| Wording, both languages | `lib/i18n.tsx` |
| Problem types, guidance, documents checklist | `lib/content.ts` (app) and the `categories` table (acknowledgement messages) |
| Chat-bot instant answers | `lib/bot.ts` |
| Contacts | `lib/content.ts` → `CONTACTS` |
| App icon | `assets/icon.png` (1024×1024). The current icon is made from a small 144-pixel logo; replace it with a high-resolution logo before publishing |
