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
1. Two phones side by side. Phone A: language → code `NOOR24-L` + name → «دخول» (leader verification, screen 39). Phone B: pick **اردو** → code `NOOR24` + name → confirm group → «شروع کریں». (Shows: language 01 → code 02 → confirm group 04 → saving on the phone 06 → ready 07.)
2. Leader → tab **الرسائل**: tap a ready template (e.g. «انتظر في مكانك» — ready translations) or type Arabic, e.g. "الرجاء إحضار المظلات معكم غداً" → the Urdu/English/Indonesian preview appears by itself (~3 s, editable) → **إرسال** → confirm sheet «إرسال إلى كل الحملة (٢٧)؟» → **إرسال**.
3. Phone B instantly shows the message in Urdu (Nastaliq) at the top of its home → **سنیں** (listen) / **اصل متن** (original) → **سمجھ گیا**.
4. Leader, **الرسائل** → «المرسلة»: the counter on that message jumps (e.g. ٥/٢٧ → ٦/٢٧ فهموا). Tap it → who hasn't confirmed yet.
5. _(arrival)_ Leader → **الأعضاء** → **طلب تأكيد الوصول** → phone B shows a green **میں پہنچ گیا** on its home → tap → the «وصلوا» filter/count goes up live. Filter **لم يؤكدوا** shows who's missing; **الرسائل** → «لم يؤكدوا» sends a reminder only to them.
6. _(offline help)_ Phone B: **airplane mode** → red **أنا ضائع** → **أرسلوا لي أحدًا** → sheet says «لا يوجد إنترنت…» → **أرسل الطلب دون مكاني** → sand «حفظنا طلبك على جوالك» (step 1/5). Airplane mode off → it sends itself → «وصل طلبك» (2/5); leader home shows the red «طلب جديد» card → **افتح الطلب** → **استلمت** (pilgrim: 3/5) → **المساعدة في الطريق** (4/5) → **إغلاق الطلب** with a reason, or the pilgrim taps **وصلت بأمان** (5/5).
7. _(time change)_ Leader home → «نقطة التجمع» **تعديل** → pick ٥:٠٠ مساءً → **حفظ** → phone B shows «تغيّر موعد التجمع — أصبح … (كان …)» live. (Set it back to 16:30 with «وقت آخر».)
8. _(I'm lost, works offline)_ Phone B: red **أنا ضائع** → **أرني الطريق** → «نستخدم مكانك لنريك الطريق؟ يبقى مكانك على جوالك فقط» → **نعم** → distance («نحو ٤٠٠ متر · ≈ ٥ دقيقة مشيًا»), an arrow toward the gate, 3 steps, and a map only if it can load. Airplane mode still shows distance + arrow. **لا، شكراً** shows a card to hand to any organizer (campaign, gate, leader + phone). **وصلت** → «الحمد لله على سلامتك» and the leader is told only if there is a real channel (arrival check / open help request).
