# دليل الواجهات الجديد — رفيق الحاج (53 شاشة)

Source: «دليل الواجهات · النسخة المبسّطة الأخيرة». All names, numbers and maps in the screens are fake.

## Design principles (from the guide)
- Built so an 80-year-old pilgrim and a 15-year-old can both use it with no explanation: ONE home screen, BIG buttons, every task in two taps.
- Colors have meaning:
  - **Green** = safety and the main buttons.
  - **Red** = the «أنا ضائع» button and REAL danger only.
  - **Sand** = waiting, or something that hasn't arrived yet (e.g. a request saved but not sent).
  - **Neutral** = all other information.
- Light warm background, rounded cards, honest copy: never claim something happened if it didn't (no fake directions, no "seen" if nobody saw it).

## Status legend
- **RESTYLE** — the feature already works; change only the look to match the screen.
- **ADAPT** — match the look, but keep our existing mechanism (e.g. campaign code instead of scanning a Nusuk card; no camera).
- **NEW** — small new UI on top of existing data; backend support is already in Supabase (see notes).
- **NEW (feature N)** — a feature from CLAUDE.md that wasn't built yet; build it with this design.
- **LATER** — out of scope now: don't build; if a button leads there, show a small «قريبًا» toast.

## Backend already added for this design (Supabase)
- `rpc('preview_campaign', { p_code })` → `{ name, leader_name, assembly_point, assembly_time, role }` — for screen 04 before joining (then call `join_campaign`).
- Realtime is enabled on `campaigns` (+ `updated_at` auto-touch trigger) — for screens 12 and 53. Leaders can already `update` their campaign (RLS).
- `help_requests.status` now allows `open | acknowledged | in_progress | resolved`; new columns `resolved_by ('pilgrim'|'leader')` and `resolution_note`.
- A pilgrim may update HIS OWN request only to `status='resolved', resolved_by='pilgrim'` (screen 27).

## Screens
| # | File | Screen | What it shows / notes | Status |
|---|---|---|---|---|
| 01 | `01-language-select.png` | اختيار اللغة | ثلاث لغات بأسمائها الأصلية، الضغط ينقل مباشرة بدون زر متابعة | RESTYLE |
| 02 | `02-join-scan-card.png` | مسح بطاقة نُسك | التصميم يمسح رمز بطاقة نسك. في نموذجنا: نفس الشكل لكن إدخال كود الحملة بدل الكاميرا | ADAPT |
| 03 | `03-join-scan-failed.png` | فشل المسح | نصيحة قصيرة وزر «حاول مرة أخرى» = خطأ الكود الغلط | ADAPT |
| 04 | `04-confirm-group.png` | تأكيد المجموعة | اسم الحملة والقائد ونقطة التجمع فقط قبل الانضمام — استخدم rpc preview_campaign | NEW |
| 05 | `05-not-my-group.png` | ليست مجموعتي | لا يُضاف لأي مجموعة، يقدر يرجع يدخل كود ثاني | NEW |
| 06 | `06-preparing-info.png` | تجهيز المعلومات | حفظ بيانات الحملة على الجوال مع شريط تقدّم | NEW |
| 07 | `07-ready.png` | أنت جاهز | تظهر بعد ما تنحفظ المعلومات فعلاً ثم الرئيسية | NEW |
| 08 | `08-partially-ready.png` | جاهز جزئيًا | لو انقطع النت أثناء التجهيز: يوضح وش انحفظ ووش باقي | NEW |
| 09 | `09-home.png` | الرئيسية (الحاج) | مكان التجمع وموعده، زر أنا ضائع الأحمر، اتصل بقائدي، اسأل رفيق، آخر رسالة | RESTYLE |
| 10 | `10-home-offline.png` | الرئيسية بدون إنترنت | نفس الشاشة والمؤشر فوق «دون اتصال» بدون رسائل خطأ مخيفة | RESTYLE |
| 11 | `11-home-open-request.png` | الرئيسية مع طلب مفتوح | بطاقة حالة طلب المساعدة أعلى الرئيسية | RESTYLE |
| 12 | `12-assembly-time-changed.png` | تغيّر موعد التجمع | تنبيه واضح بالموعد الجديد والقديم وتتحدث البطاقة الخضراء (realtime على campaigns) | NEW |
| 13 | `13-call-leader.png` | الاتصال بالقائد | زر «اتصل بقائدي» يفتح الاتصال مباشرة (tel:) | RESTYLE |
| 14 | `14-lost.png` | أنا ضائع | يطمّنه ويذكّره بمكان التجمع ثم خياران: «أرني الطريق» أو «أرسلوا لي أحدًا» | NEW (feature 8) |
| 15 | `15-lost-location-permission.png` | إذن الموقع (الأول) | الموقع للجوال فقط لعرض الطريق ولا يُرسل لأحد | NEW (feature 8) |
| 16 | `16-lost-route.png` | الطريق إلى نقطة التجمع | خريطة محفوظة توضيحية + مسافة تقريبية + ثلاث خطوات + زر «وصلت» | NEW (feature 8) |
| 17 | `17-lost-location-inaccurate.png` | الموقع غير دقيق | يقول بصراحة إنه ما يقدر يحدد المسافة ولا يعرض اتجاهات وهمية | NEW (feature 8) |
| 18 | `18-lost-location-denied.png` | رفض إذن الموقع | بطاقة يوريها لأي منظم: نقطة التجمع ورقم القائد | NEW (feature 8) |
| 19 | `19-lost-arrived.png` | وصلت | رسالة اطمئنان ويوصل القائد خبر إن الحاج وصل | NEW (feature 8) |
| 20 | `20-help-share-location-consent.png` | إذن مشاركة الموقع (الثاني) | موافقة منفصلة توضح مين يشوف الموقع، ويقدر يرسل بدونه بنفس السهولة | RESTYLE |
| 21 | `21-help-offline-notice.png` | الطلب بدون إنترنت | قبل الإرسال: الطلب ينحفظ على جوالك ويُرسل أول ما يرجع النت | RESTYLE |
| 22 | `22-help-step1-saved.png` | 1. محفوظ على الجوال | باللون الرملي: الطلب ما وصل للقائد بعد، واتصل فيه إذا قدرت | RESTYLE |
| 23 | `23-help-send-failed.png` | تعذّر الإرسال | الطلب يبقى محفوظ وزر يعيد المحاولة | RESTYLE |
| 24 | `24-help-step2-received.png` | 2. وصل طلبك | status=open بعد الإرسال، بدون ادعاء إن أحد شافه | RESTYLE |
| 25 | `25-help-step3-acknowledged.png` | 3. استلم المشرف طلبك | status=acknowledged (جديد) | NEW |
| 26 | `26-help-step4-on-the-way.png` | 4. المساعدة في الطريق | status=in_progress، مع رسالة القائد وزر استمع | RESTYLE |
| 27 | `27-help-step5-arrived-safe.png` | 5. وصلت بأمان | الحاج يؤكد فينقفل الطلب: update status=resolved, resolved_by=pilgrim (مسموح له على طلبه فقط) | NEW |
| 28 | `28-ask-rafiq.png` | اسأل رفيق | ميكروفون كبير + 4 أسئلة جاهزة + كتابة | LATER |
| 29 | `29-ask-trusted-answer.png` | إجابة موثوقة | إجابة قصيرة + استمع + المصدر وآخر تحديث | LATER |
| 30 | `30-ask-no-trusted-info.png` | لا توجد معلومة موثوقة | ما يخمّن: اتصل بالقائد أو شوف معلومات حملتك | LATER |
| 31 | `31-ask-emergency.png` | حالة عاجلة | يوقف الأسئلة ويوجهه لشخص يساعده فورًا | LATER |
| 32 | `32-ask-offline.png` | اسأل رفيق بدون إنترنت | يجاوب من المعلومات المحفوظة فقط | LATER |
| 33 | `33-my-campaign-settings.png` | حملتي والإعدادات | معلومات الحملة + اتصل بالقائد + الرسائل + اللغة + حجم الخط في صفحة وحدة | RESTYLE |
| 34 | `34-ui-english.png` | الواجهة بالإنجليزية | تغيير اللغة يقلب الاتجاه LTR وما يضيع مكانك | RESTYLE |
| 35 | `35-ui-urdu.png` | الواجهة بالأردية | نستعليق وأرقامها الخاصة، RTL | RESTYLE |
| 36 | `36-translated-message.png` | رسالة مترجمة مع الأصل | مترجمة آليًا مع إمكانية عرض النص العربي | RESTYLE |
| 37 | `37-large-text.png` | خط أكبر | الخط يكبر في كل الواجهة والتصميم يبقى مرتب (إعداد محفوظ) | NEW |
| 38 | `38-leader-join.png` | تعريف القائد | نفس طريقة الحاج — كود القائد NOOR24-L | ADAPT |
| 39 | `39-leader-verification.png` | التحقق من الصلاحية | الصلاحية من الكود (preview_campaign يرجع role) | ADAPT |
| 40 | `40-leader-home-requests.png` | الرئيسية (القائد) | الأعضاء والواصلين والطلبات المفتوحة، العاجل بالأحمر، ثم قيد المتابعة | RESTYLE |
| 41 | `41-leader-request-details.png` | تفاصيل الطلب | اتصال ورسالة. «تكليف مشرف» غير موجود في البيانات: اعرض التفاصيل وزر «استلمت» بدلها | ADAPT |
| 42 | `42-leader-waiting-supervisor.png` | بانتظار تأكيد المشرف | مفهوم المشرف غير مبني — تجاهلها الآن | LATER |
| 43 | `43-leader-close-request.png` | إغلاق الطلب | القائد يقفل الطلب مع ذكر السبب (resolution_note, resolved_by=leader) | RESTYLE |
| 44 | `44-leader-members.png` | الأعضاء | 4 فلاتر (الكل، وصلوا، لم يؤكدوا، يحتاجون مساعدة) + بحث بالاسم | NEW (feature 9) |
| 45 | `45-leader-arrival-tracking.png` | متابعة الوصول | بضغطة يطلع اللي ما أكدوا وصولهم | RESTYLE |
| 46 | `46-leader-member-details.png` | بيانات العضو | معلومات أساسية فقط، والموقع لا يظهر إلا لو وافق ضمن طلب مساعدة | NEW |
| 47 | `47-leader-add-pilgrim.png` | إضافة حاج | بمسح بطاقة نسك — خارج النطاق الآن | LATER |
| 48 | `48-leader-confirm-add.png` | تأكيد الإضافة | خارج النطاق الآن | LATER |
| 49 | `49-leader-prevent-duplicate.png` | منع التكرار | خارج النطاق الآن | LATER |
| 50 | `50-leader-message-preview.png` | رسالة مع معاينة الترجمة | يكتب بالعربي أو يختار قالب جاهز ويشوف الترجمات قبل الإرسال | RESTYLE + templates |
| 51 | `51-leader-untranslated-text.png` | نص بدون ترجمة | يقول بصراحة إنه بيوصل بالعربي مع توضيح إنه غير مترجم | RESTYLE |
| 52 | `52-leader-confirm-send.png` | تأكيد الإرسال | قبل الإرسال: لمين بتوصل، واللي بدون نت يستلمونها أول ما يرجع | NEW |
| 53 | `53-leader-edit-assembly-time.png` | تعديل موعد التجمع | يختار الموعد الجديد ويحفظ (update campaigns — مسموح للقائد) ويوصل فورًا | NEW |
