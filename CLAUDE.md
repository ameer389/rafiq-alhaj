# رفيق الحاج — Rafiq Alhaj

Hackathon prototype for **Hajj Innovation Camp 2026** (team of 5). Deadline: **today**. Build fast, keep it demo-ready at every commit.

## The idea (read this first)
Rafiq Alhaj is **the link between a pilgrim and his campaign leader (قائد الحملة)**.
It is NOT "another AI chatbot for pilgrims" — the official Nusuk app already has Nusuk AI (180+ languages, voice). Our edge is everything Nusuk doesn't know: the pilgrim's campaign, leader, assembly point, and the leader ↔ pilgrim communication loop.

**Core feature to build first:** the leader writes one message in Arabic → it is auto-translated to each member's language → the leader reviews translations → sends → each pilgrim receives it in his language, can listen to it and view the original, then taps **"فهمت / Got it"** → the leader sees a live counter of who understood.

Demo moment: a judge types on the leader phone, and a second phone instantly shows the message in Urdu; the pilgrim taps "فهمت" and the leader's counter goes up.

## Tech stack
- **React + Vite** (JavaScript, `.jsx`), **Tailwind CSS**, **react-router-dom**
- **Supabase**: Postgres + Realtime (`postgres_changes`) + Anonymous Auth + Edge Functions
- **Translation**: Supabase Edge Function `translate` calling the **Google Gemini API free tier** (a free Flash / Flash-Lite model — check Google AI Studio for which models are currently free; key in Supabase secrets as `GEMINI_API_KEY`). Translate all target languages in ONE request (return JSON) to save quota. Never call the LLM from the browser. Optional fallback provider: OpenRouter `:free` models via the `models` array (key `OPENROUTER_API_KEY`). If both fail, return an error and let the leader type/edit translations manually — the send flow must never be blocked.
- **Text-to-speech**: browser `window.speechSynthesis` (no library). If no voice exists for a language (Urdu is often missing), hide/disable the Listen button gracefully with a small note.
- **Maps** (later features): Leaflet + react-leaflet, with static demo coordinates.
- **PWA / offline** (later): `vite-plugin-pwa`.
- **Hosting**: GitHub → Vercel (auto-deploy on push). HTTPS is required for PWA/service worker and geolocation on phones.

Env vars (`.env.local`, never commit): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Only the anon key goes in the frontend — never the service role key.

## Design — match the existing mockups closely
Reference screens are in `design/` — **open them and copy layout, spacing and components as closely as possible.** The team may tweak them today, so keep styles centralized (Tailwind theme tokens + a few shared components) so changes are cheap.

| file | screen |
|---|---|
| 01/02 | Trip preparation (offline download) — complete / downloading |
| 03/04 | Pilgrim home — Urdu offline / Arabic online |
| 05/06 | Assistant — no reliable answer / verified answer with source |
| 07/08 | "أنا ضائع" — map to assembly point / before location permission |
| 09/10/11 | **Leader message received** — English / Urdu / Arabic |
| 12 | Nearby services (map + list) |
| 13 | FAQ |
| 14 | Return to my camp |
| 15 | My campaign info |
| 16 | **Leader home** (members, confirmed, open requests, urgent) |
| 17 | Leader — members list with filters |
| 18 | **Leader — new message** (recipients, Arabic text, priority, auto-translation preview) |

Design tokens (sampled from mockups):
- `navy-900 #071724` (dark headers), `navy-800 #102D3F` (primary buttons)
- `danger #F05251` ("أنا ضائع" button, urgent)
- `gold #D9B15A` (icon circles, leader badge), `cream #F7EFD8` / `#FFF7D8` (leader-message card, assembly-point card)
- `mint #DDF6F3` (online chip, "verified/source" boxes), success green for check marks
- page `#F3F7F8`, cards white with subtle border, `rounded-2xl`, generous padding
- Font: **IBM Plex Sans Arabic** (Google Fonts) for Arabic/English; **Noto Nastaliq Urdu** for Urdu text
- **RTL** for Arabic and Urdu (`dir="rtl"`), LTR for English/Indonesian — set `dir` per language on `<html>`
- Mobile-first, max width ~430px centered on desktop. Bottom nav: الرئيسية / المساعد / حملتي / الإعدادات (pilgrim); الرئيسية / الطلبات / الأعضاء / الرسائل (leader)
- Status chip top-left on every screen: "متصل" (mint) or "دون اتصال" (grey) from `navigator.onLine`

## ✅ Backend is ALREADY SET UP — do not recreate it
Supabase project `rafiq-alhaj` (ref `ohnkxcvrgumhvcstmemj`, Frankfurt) already has: all tables below, RLS policies (tested), Realtime enabled, demo seed data, and the `translate` edge function deployed. Anonymous sign-ins are ON. `GEMINI_API_KEY` secret is set. **Frontend work only** unless a schema change is truly needed — if so, write the SQL in `supabase/migrations/` and tell the user; don't drop/recreate tables.

How the frontend talks to it:
```js
// 1) on first open
await supabase.auth.signInAnonymously();
// 2) join (pilgrim code NOOR24, leader code NOOR24-L) — returns the member row; role is decided by the code
const { data: me } = await supabase.rpc('join_campaign', { p_code, p_name, p_lang });
// 3) translate (leader) — returns { translations: { ar, ur, en, id }, model } or { error }
const { data, error } = await supabase.functions.invoke('translate', { body: { text, targets: ['ur','en','id'] } });
// 4) send (leader): insert into messages { campaign_id: me.campaign_id, sender_id: me.id, original_text, translations, priority, kind }
// 5) confirm (pilgrim): insert into acknowledgements { message_id, member_id: me.id }   (PK prevents duplicates; ignore 23505)
// 6) live updates: supabase.channel('c').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `campaign_id=eq.${id}` }, cb)
```
RLS rules to know: pilgrims see their campaign, all its messages, **only themselves + leaders** in `members`, and only their own acks/help requests. Leaders see everything in their campaign and are the only ones who can insert `messages` or update `help_requests`. A query that returns empty (no error) usually means RLS — check you're joined.
Extra columns not in the sketch below: `campaigns.leader_code`, `campaigns.camp_lat/camp_lng`, `members.shared_lat/shared_lng/location_shared_at` (pilgrim updates own row when he consents to share location), `help_requests.received_at`.
Seed: campaign "حملة النور" (NOOR24 / NOOR24-L), leader أحمد محمد, 8 pilgrims (ar/ur/en/id), 1 message with 5/8 acks, 1 open "lost" help request.

## Data model (Supabase SQL — reference only, already applied)
```sql
create table campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,                 -- e.g. 'حملة النور'
  join_code text unique not null,     -- e.g. 'NOOR24'
  leader_name text, leader_phone text,
  camp text, hotel text,
  assembly_point text, assembly_time timestamptz,
  assembly_lat double precision, assembly_lng double precision,
  updated_at timestamptz default now()
);

create table members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id),
  campaign_id uuid references campaigns(id) on delete cascade,
  name text not null,
  role text not null check (role in ('pilgrim','leader')),
  lang text not null default 'ar',    -- 'ar' | 'ur' | 'en' | 'id'
  last_seen timestamptz default now()
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id) on delete cascade,
  sender_id uuid references members(id),
  original_text text not null,        -- Arabic
  translations jsonb not null,        -- {"ur": "...", "en": "...", "id": "..."}
  priority text default 'normal' check (priority in ('normal','important','urgent')),
  kind text default 'announcement' check (kind in ('announcement','arrival_check')),
  created_at timestamptz default now()
);

create table acknowledgements (
  message_id uuid references messages(id) on delete cascade,
  member_id uuid references members(id) on delete cascade,
  acked_at timestamptz default now(),
  primary key (message_id, member_id)
);

create table help_requests (           -- feature 7
  id uuid primary key default gen_random_uuid(),
  client_id text unique,              -- generated on device, makes offline retries idempotent
  campaign_id uuid references campaigns(id) on delete cascade,
  member_id uuid references members(id),
  type text,                          -- 'lost' | 'medical' | 'other'
  note text, lat double precision, lng double precision,
  location_shared boolean default false,
  status text default 'open' check (status in ('open','in_progress','resolved')),
  created_at timestamptz default now()   -- time created on device
);
```
- Seed messages should include ready translations so the demo works even if the translation API is rate-limited.
- Enable Realtime on `messages`, `acknowledgements`, `help_requests`, `members`.
- Auth: `supabase.auth.signInAnonymously()` on first open, then the user joins a campaign by `join_code`, picks name + language (leader joins with a separate leader code, e.g. `NOOR24-L`, for the demo).
- RLS: enable on all tables; a member can read/write rows of their own campaign only (helper `my_campaign_id()` = campaign of `auth.uid()`). Leader-only: insert messages, update help_requests. Keep policies simple — demo first.
- Seed: one campaign "حملة النور" (البوابة ٣, 4:30 PM, مخيم منى 24, فندق الصفوة) with a few fake members in ar/ur/en/id so the leader dashboard looks alive.

## Translation edge function `translate` (already deployed — reference only)
- Input `{ text: string, targets: string[] }` → output `{ translations: { ur, en, id, ... } }` as strict JSON.
- System prompt: translate a short instruction from a Hajj campaign leader to pilgrims; simple, clear words for elderly readers; keep times, numbers, gate numbers exact; **do not translate Hajj place/ritual names — transliterate them**: منى Mina, عرفات Arafat, مزدلفة Muzdalifah, الجمرات Jamarat, الحرم Haram, الطواف Tawaf, السعي Sa'i, النفرة Nafrah, المخيم camp, البوابة gate. Urdu output in Urdu script.
- Called when the leader taps "ترجمة/معاينة"; the leader can edit any translation before sending. Store final translations in `messages.translations`.

## Features — build strictly in this order
Commit after each one with a working app. Mark ✅ here when done.

**P0 — must ship today**
0. [x] ✅ Onboarding: anonymous sign-in → join by code (`join_campaign` RPC) → name + language. Persist session (supabase-js does it).
1. [x] ✅ Leader "new message" screen (design 18): recipients (all / not arrived), Arabic text, priority, translate preview per language (editable), send.
2. [x] ✅ Pilgrim message view (designs 09–11): message in his language, Listen (speechSynthesis), "Show original", big "فهمت ✓" button → insert acknowledgement. New messages appear live (Realtime) and as a banner on home.
3. [x] ✅ Leader live counter: on leader home (design 16) and per message — "32/40 فهموا" + list of who hasn't confirmed.

**P1 — if time allows (in order)**
4. [x] ✅ Arrival check: leader taps "طلب تأكيد الوصول" → message with `kind='arrival_check'` → pilgrim taps "وصلت" → leader sees "39/48 وصلوا".
5. [x] ✅ My campaign (design 15): leader name/phone (tap to call `tel:`), hotel, camp, assembly point + time, last updated. Cache in localStorage so it opens offline.
6. [ ] Connection status chip on every screen (`online`/`offline` events).
7. [ ] Offline help request: pilgrim creates a request → saved in a localStorage queue with status "لم يُرسل بعد" → auto-sent on `online` event (idempotent via `client_id`) → status "تم الإرسال". Leader sees it live under الطلبات.
8. [ ] "أنا ضائع" (designs 07/08): ask location permission → Leaflet map with user + assembly point, distance & walking minutes (haversine, ~80 m/min) → call leader, show card, share location with leader only after a separate explicit consent.
9. [ ] Leader members list (design 17): search, filters (all / urgent / needs help / not arrived), language, online, last seen.

**P2 — vision (only if everything above is solid)**
10. [ ] PWA offline package with progress UI (designs 01/02).
11. [ ] FAQ from a local JSON with source + date (design 13).
12. [ ] Return to my camp (design 14).
13. [ ] Nearby services with demo points (design 12).
14. [ ] Assistant (designs 05/06) — overlaps with Nusuk AI; show as vision, build last if at all.

## Working rules
- Small commits, app must run after every commit; push often (Vercel deploys).
- UI strings live in `src/i18n/{ar,ur,en,id}.json` — no hard-coded text in components.
- Test the core flow with **two browsers side by side** (leader + pilgrim) before moving on.
- Don't over-engineer: no state library, no TypeScript migration, no tests beyond a quick manual checklist. Speed matters.
- Keep a short `DEMO.md`: live URL, demo join codes, and the 60-second demo script.
