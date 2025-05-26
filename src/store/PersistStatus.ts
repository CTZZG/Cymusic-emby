import getOrCreateMMKV from '@/store/getOrCreateMMKV'
import safeParse from '@/utils/safeParse'
import { useEffect, useState } from 'react'

const PersistConfig = {
	PersistStatus: 'appPersistStatus',
}

interface IPersistConfig {
	'music.musicItem': IMusic.IMusicItem //当前播放
	'music.progress': number
	'music.repeatMode': string
	//播放列表
	'music.play-list': IMusic.IMusicItem[]
	'music.playList': IMusic.IMusicItem[]
	'music.favorites': IMusic.IMusicItem[]
	'music.rate': number
	'music.quality': IMusic.IQualityKey
	'app.skipVersion': string
	'app.pluginUpdateTime': number
	'lyric.showTranslation': boolean
	'lyric.detailFontSize': number
	'app.logo': 'Default' | 'Logo1'
	//歌单
	'music.playLists': IMusic.PlayList[]
	//音源
	'music.musicApi': IMusic.MusicApi[]
	//当前选择的音源
	'music.selectedMusicApi': IMusic.MusicApi
	//已导入的本地音乐
	'music.importedLocalMusic': IMusic.IMusicItem[]
	'music.autoCacheLocal': boolean
	'app.language': string
	'music.isCachedIconVisible': boolean
	'music.songsNumsToLoad': number
	// Emby配置
	'emby.url': string
	'emby.username': string
	'emby.password': string
	'emby.deviceId': string
	'emby.uploadPlaylistToEmby': boolean
	// 插件配置
	'plugin.configs': any[]
}

function set<K extends keyof IPersistConfig>(key: K, value: IPersistConfig[K] | undefined) {
	const store = getOrCreateMMKV(PersistConfig.PersistStatus)
	if (value === undefined) {
		store.delete(key)
	} else {
		store.set(key, JSON.stringify(value))
	}
}

function get<K extends keyof IPersistConfig>(key: K): IPersistConfig[K] | null {
	const store = getOrCreateMMKV(PersistConfig.PersistStatus)
	const raw = store.getString(key)
	if (raw) {
		return safeParse(raw) as IPersistConfig[K]
	}
	return null
}

function remove<K extends keyof IPersistConfig>(key: K) {
	const store = getOrCreateMMKV(PersistConfig.PersistStatus)
	store.delete(key)
}

function useValue<K extends keyof IPersistConfig>(
	key: K,
	defaultValue?: IPersistConfig[K],
): IPersistConfig[K] | null {
	const [state, setState] = useState<IPersistConfig[K] | null>(get(key) ?? defaultValue ?? null)

	useEffect(() => {
		const store = getOrCreateMMKV(PersistConfig.PersistStatus)
		const sub = store.addOnValueChangedListener((changedKey) => {
			if (key === changedKey) {
				setState(get(key))
			}
		})

		return () => {
			sub.remove()
		}
	}, [key])

	return state
}

const PersistStatus = {
	get,
	set,
	remove,
	useValue,
}

export default PersistStatus
