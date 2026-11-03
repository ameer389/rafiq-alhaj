import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import ar from './ar.json'
import ur from './ur.json'
import en from './en.json'
import id from './id.json'
import { load, save } from '../lib/storage'

const DICTS = { ar, ur, en, id }
export const LANGS = [
  { code: 'ar', label: 'العربية' },
  { code: 'ur', label: 'اردو' },
  { code: 'en', label: 'English' },
  { code: 'id', label: 'Bahasa Indonesia' },
]
export const RTL_LANGS = ['ar', 'ur']
export const isRtl = (lang) => RTL_LANGS.includes(lang)
export const langLabel = (code) => LANGS.find((l) => l.code === code)?.label ?? code

function lookup(dict, key) {
  return key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), dict)
}

const I18nCtx = createContext(null)

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(() => load('rafiq.lang', 'ar'))

  const setLang = useCallback((l) => {
    if (!DICTS[l]) return
    save('rafiq.lang', l)
    setLangState(l)
  }, [])

  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = isRtl(lang) ? 'rtl' : 'ltr'
  }, [lang])

  const t = useCallback((key, vars) => {
    let s = lookup(DICTS[lang], key) ?? lookup(DICTS.ar, key) ?? key
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v)
    return s
  }, [lang])

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t])
  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>
}

export const useI18n = () => useContext(I18nCtx)
