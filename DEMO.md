# Rafiq Alhaj — Demo

**Live URL:** _(add after connecting the GitHub repo to Vercel)_
**Repo:** https://github.com/ameer389/rafiq-alhaj

## Join codes
| Role | Code |
|---|---|
| Pilgrim | `NOOR24` |
| Campaign leader | `NOOR24-L` |

To reset a phone: pilgrim → الإعدادات → "الخروج من الحملة"; leader → logout icon in the home header. Or use a private window.

## Run locally
```bash
npm install
npm run dev        # http://localhost:5173  (also on your LAN IP for phones)
```
Needs `.env.local` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

## 60-second demo script
1. Two phones side by side. Phone A: join with `NOOR24-L` (leader). Phone B: pick **اردو**, join with `NOOR24`.
2. _(next features)_ Leader taps **إعلان سريع**, types Arabic, taps translate, sends.
3. _(next features)_ Phone B shows the message in Urdu → taps **سمجھ گیا** → leader's counter goes up live.
