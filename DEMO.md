# Rafiq Alhaj — Demo

**Live URL:** _(add after connecting the GitHub repo to Vercel)_
**Repo:** https://github.com/ameer389/rafiq-alhaj

## Join codes
| Role | Code |
|---|---|
| Pilgrim | `NOOR24` |
| Campaign leader | `NOOR24-L` |

To reset a phone: pilgrim → الإعدادات → "الخروج من الحملة"; leader → logout icon in the home header. Or use a private window.

> ⚠️ One login per browser: all tabs of the same browser share one session. If you join as pilgrim in a second tab, the leader tab switches to the pilgrim too (by design). For leader + pilgrim on one laptop use **two different browsers** (e.g. Chrome + Edge) or a **normal + private window**.

## Run locally
```bash
npm install
npm run dev        # http://localhost:5173  (also on your LAN IP for phones)
```
Needs `.env.local` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

## 60-second demo script
1. Two phones side by side. Phone A: language → code `NOOR24-L` + name → «نعم، هذه مجموعتي» (leader). Phone B: pick **اردو** → code `NOOR24` + name → confirm group → «شروع کریں». (Shows: language 01 → code 02 → confirm group 04 → saving on the phone 06 → ready 07.)
2. Leader taps **إعلان سريع**, types Arabic (e.g. "انتظروا عند البوابة ٣، المشرف في طريقه إليكم"), taps **ترجمة ومعاينة** (~3 s), shows the Urdu/English/Indonesian preview, taps **إرسال**.
3. Phone B instantly shows the message in Urdu on its home → tap **پڑھیں** → **سنیں** (listen) / **اصل متن دیکھیں** (original) → **سمجھ گیا**.
4. Leader home: the "آخر رسالة" counter jumps (e.g. 5/8 → 6/8 فهموا). Tap it → list of who hasn't confirmed yet.
5. _(bonus)_ Leader taps **طلب تأكيد الوصول** → phone B shows a green **میں پہنچ گیا** button on its home → tap → leader sees "1 / 8 وصلوا" live. Then **إعلان سريع** → **لم يصلوا · 7** sends a reminder only to those who haven't arrived.
6. _(offline)_ Phone B: turn on **airplane mode** → **طلب مساعدة** → "میں کھو گیا ہوں" + tick "share location" → send → it shows **ابھی نہیں بھیجی گئی** (not sent yet) and a clock on the home tile. Turn airplane mode off → it sends by itself; the leader's home shows the red **عاجل** banner + map link. Leader taps **المساعدة في الطريق** → phone B shows **مدد راستے میں ہے**.
