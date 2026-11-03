// Screen 50 — ready-made leader messages WITH ready translations (no API call, works offline / when
// the translator is down). Hajj place names are transliterated, not translated (see CLAUDE.md).
export const TEMPLATES = [
  {
    id: 'wait',
    label: 'lm.tpl_wait',
    text: {
      ar: 'ابقَ في مكانك عند نقطة التجمع، المشرف في طريقه إليك.',
      ur: 'ملاقات کی جگہ پر اپنی جگہ رہیں، نگران آپ کی طرف آ رہا ہے۔',
      en: 'Stay where you are at the meeting point. The supervisor is on the way to you.',
      id: 'Tetap di tempat di titik kumpul. Pengawas sedang menuju Anda.',
    },
  },
  {
    id: 'move',
    label: 'lm.tpl_move',
    text: {
      ar: 'سنتحرك إلى المخيم بعد صلاة العصر مباشرة، الرجاء الحضور إلى نقطة التجمع.',
      ur: 'ہم عصر کی نماز کے فوراً بعد camp کی طرف روانہ ہوں گے، براہِ کرم ملاقات کی جگہ پر آئیں۔',
      en: 'We will head to the camp right after Asr prayer. Please come to the meeting point.',
      id: 'Kita berangkat ke camp tepat setelah salat Asar. Silakan datang ke titik kumpul.',
    },
  },
  {
    id: 'water',
    label: 'lm.tpl_water',
    text: {
      ar: 'اشربوا الماء باستمرار، واحتموا من الشمس بالمظلة.',
      ur: 'پانی پیتے رہیں اور چھتری سے دھوپ سے بچیں۔',
      en: 'Keep drinking water and use your umbrella to stay out of the sun.',
      id: 'Terus minum air dan gunakan payung untuk berlindung dari matahari.',
    },
  },
]
