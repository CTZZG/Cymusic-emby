import en from '@/locales/en.json'
import zh from '@/locales/zh.json'
import PersistStatus from '@/store/PersistStatus'
import { getLocales } from 'expo-localization'
import { I18n } from 'i18n-js'
import { GlobalState } from './stateMapper'

const translations = {
	en,
	zh,
}

const i18n = new I18n(translations)

i18n.enableFallback = true
export const nowLanguage = new GlobalState<string>('zh')

export const setI18nConfig = () => {
	const languageCode = PersistStatus.get('app.language') || getLocales()[0].languageCode || 'zh'
	nowLanguage.setValue(languageCode)
	i18n.locale = languageCode
}

export const changeLanguage = (languageCode: string) => {
	PersistStatus.set('app.language', languageCode)
	i18n.locale = languageCode
	nowLanguage.setValue(languageCode)
}

export default i18n
