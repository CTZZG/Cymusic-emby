import musicSdk from '@/components/utils/musicSdk'
import { Artist, Playlist, TrackWithPlaylist } from '@/helpers/types'
import { useEffect } from 'react'
import { Track } from 'react-native-track-player'
import { create } from 'zustand'

import { formatMusicItem, getEmbyConfig, getEmbyToken, httpEmby } from '@/helpers/embyApi'
import { getTopLists } from '@/helpers/userApi/getMusicSource'
import PersistStatus from '@/store/PersistStatus'

interface LibraryState {
	allTracks: TrackWithPlaylist[]
	tracks: TrackWithPlaylist[]
	favorites: IMusic.IMusicItem[]
	nowLyric: string
	playlists: Playlist[]
	isLoading: boolean
	toggleTrackFavorite: (track: Track) => void
	addToPlaylist: (track: Track, playlistName: string) => void
	fetchTracks: (refresh?: boolean) => Promise<void>
	setNowLyric: (lyric: string) => void
	setPlayList: (newPlayList?: Playlist[]) => void
	page: number
	hasMore: boolean
	// getMusicIndex: (musicItem?: IMusic.IMusicItem | null) => number
	// isInPlayList: (musicItem?: IMusic.IMusicItem | null) => boolean
	// getPlayListMusicAt: (index: number) => IMusic.IMusicItem | null
	// isPlayListEmpty: () => boolean
}

// 原有的QQ音乐数据映射函数 - 用于回退
const mapTrack = (track: any): TrackWithPlaylist => {
    return {
        id: track.id || 'default_id',
        url: track.url || '',
        title: track.title || 'Untitled Song',
        artist: track.singer || 'Unknown Artist',
        album: track.album || 'Unknown Album',
        genre: track.genre || 'Unknown Genre',
        date: track.time_public || 'Unknown Release Date',
        artwork: track.pic || 'http://example.com/default.jpg',
        duration: track.interval || 0,
        platform: track.platform || 'qq',
    }
}

// Emby数据映射函数 - 替换原有的mapTrack函数
const mapEmbyTrack = (embyItem: any): TrackWithPlaylist => {
    return {
        id: embyItem.id || 'default_id',
        url: embyItem.url || '', // 播放URL将在播放时动态获取
        title: embyItem.title || 'Untitled Song',
        artist: embyItem.artist || 'Unknown Artist',
        album: embyItem.album || 'Unknown Album',
        genre: 'Unknown Genre', // Emby可能没有这个字段
        date: embyItem.date || 'Unknown Release Date',
        artwork: embyItem.artwork || 'http://example.com/default.jpg',
        duration: embyItem.duration || 0,
        platform: 'emby', // 标记为emby平台
        // 保留Emby特有的数据
        _albumId: embyItem._albumId,
        _artistId: embyItem._artistId,
        _source: 'emby'
    }
}
export const useLibraryStore = create<LibraryState>((set, get) => ({
	allTracks: [],
	tracks: [],
	isLoading: false,
	page: 1,
	hasMore: true,
	favorites: PersistStatus.get('music.favorites') || [],
	nowLyric: '当前无歌词',
	playlists: [],
	toggleTrackFavorite: (track: Track) => {
		set((state) => {
			const favorites = [...state.favorites]
			const index = favorites.findIndex((fav) => fav.id === track.id)

			if (index !== -1) {
				// 如果存在，则从数组中删除
				favorites.splice(index, 1)
			} else {
				// 如果不存在，则添加到数组中
				favorites.push(track as IMusic.IMusicItem)
			}
			// 更新持久化存储中的favorites
			PersistStatus.set('music.favorites', favorites)

			// 返回新的状态
			return { favorites }
		})
	},
	addToPlaylist: (track, playlistName) =>
		set((state) => ({
			tracks: state.tracks.map((currentTrack) => {
				if (currentTrack.url === track.url) {
					return {
						...currentTrack,
						playlist: [...(currentTrack.playlist ?? []), playlistName],
					}
				}
				return currentTrack
			}),
		})),
		fetchTracks: async (refresh = false) => {
			const { page, hasMore, isLoading, allTracks } = get()
			if (isLoading || (!hasMore && !refresh)) return
			const PAGE_SIZE = 100
		
			try {
				if (refresh || allTracks.length === 0) {
					// 只在刷新或首次加载时请求数据
					set({ isLoading: true })
		
					// 检查Emby配置
					const tokenInfo = await getEmbyToken()
					if (!tokenInfo) {
						console.error('Emby not configured or authentication failed')
						// 如果Emby未配置，回退到原有的QQ音乐API
						const data = await musicSdk['tx'].leaderboard.getList(26, 1)
						const mappedTracks = data.list.map(mapTrack)
						set({ allTracks: mappedTracks })
					} else {
						// 使用Emby API获取所有音乐
						const params = {
							IncludeItemTypes: 'Audio',
							Recursive: true,
							UserId: tokenInfo.userId,
							StartIndex: 0,
							Limit: 1000, // 获取更多数据
							Fields: 'PrimaryImageAspectRatio,MediaSources,Path,Album,AlbumId,ArtistItems,AlbumArtist,RunTimeTicks,ProviderIds,ImageTags,UserData,ChildCount,AlbumPrimaryImageTag',
							SortBy: 'SortName',
							SortOrder: 'Ascending'
						}
						
						const result = await httpEmby('GET', `Users/${tokenInfo.userId}/Items`, params)
						if (result && result.data && result.data.Items) {
							const formattedTracks = await Promise.all(
								result.data.Items.map((item: any) => formatMusicItem(item))
							)
							const mappedTracks = formattedTracks.map(mapEmbyTrack)
							set({ allTracks: mappedTracks })
						} else {
							// 如果Emby请求失败，回退到QQ音乐
							const data = await musicSdk['tx'].leaderboard.getList(26, 1)
							const mappedTracks = data.list.map(mapTrack)
							set({ allTracks: mappedTracks })
						}
					}
				}
				
				set({ isLoading: true })
				const currentPage = refresh ? 1 : page
				const start = (currentPage - 1) * PAGE_SIZE
				const end = start + PAGE_SIZE
				const newTracks = get().allTracks.slice(start, end)
		
				set((state) => ({
					tracks: refresh ? newTracks : [...state.tracks, ...newTracks],
					page: currentPage + 1,
					hasMore: end < get().allTracks.length,
					isLoading: false,
				}))
			} catch (error) {
				console.error('Failed to fetch tracks:', error)
				set({ isLoading: false })
			}
		},
	setNowLyric: (nowLyric: string) => {
		set({ nowLyric: nowLyric })
	},
	setPlayList: async (newPlayList?) => {
		try {
			// 检查Emby配置
			const tokenInfo = await getEmbyToken()
			if (tokenInfo) {
				// 使用Emby API获取播放列表
				const params = {
					IncludeItemTypes: 'Playlist',
					Recursive: true,
					UserId: tokenInfo.userId,
					Fields: 'PrimaryImageAspectRatio,ChildCount,ImageTags'
				}
				
				const result = await httpEmby('GET', `Users/${tokenInfo.userId}/Items`, params)
				if (result && result.data && result.data.Items) {
					const embyPlaylists = result.data.Items.map((playlist: any) => ({
						id: playlist.Id,
						name: playlist.Name || 'Unknown Playlist',
						title: playlist.Name || 'Unknown Playlist',
						description: playlist.Overview || '',
						coverImg: playlist.ImageTags?.Primary 
							? `${getEmbyConfig()?.url}/Items/${playlist.Id}/Images/Primary?maxWidth=400&maxHeight=400&tag=${playlist.ImageTags.Primary}&format=jpg&quality=90`
							: 'https://p1.music.126.net/oT-RHuPBJiD7WMoU7WG5Rw==/109951166093489621.jpg',
						artwork: playlist.ImageTags?.Primary 
							? `${getEmbyConfig()?.url}/Items/${playlist.Id}/Images/Primary?maxWidth=400&maxHeight=400&tag=${playlist.ImageTags.Primary}&format=jpg&quality=90`
							: 'https://p1.music.126.net/oT-RHuPBJiD7WMoU7WG5Rw==/109951166093489621.jpg',
						artworkPreview: playlist.ImageTags?.Primary 
							? `${getEmbyConfig()?.url}/Items/${playlist.Id}/Images/Primary?maxWidth=200&maxHeight=200&tag=${playlist.ImageTags.Primary}&format=jpg&quality=90`
							: 'https://p1.music.126.net/oT-RHuPBJiD7WMoU7WG5Rw==/109951166093489621.jpg',
						platform: 'emby',
						artist: 'Emby Playlist',
						period: '',
						singerImg: '',
						tracks: [], // 播放列表中的歌曲将在需要时加载
						songs: [] // 兼容原有接口
					}))
					set({ playlists: embyPlaylists })
					return
				}
			}
			
			// 如果Emby不可用，回退到原有的QQ音乐播放列表
			const playlists = await getTopLists()
			const combinedData = playlists.flatMap((group) =>
				group.data.map((playlist) => ({
					...playlist,
					coverImg: playlist.coverImg.replace(/^http:/, 'https:'),
				})),
			)
			set({ playlists: combinedData })
		} catch (error) {
			console.error('Failed to set playlist:', error)
			// 出错时回退到QQ音乐播放列表
			try {
				const playlists = await getTopLists()
				const combinedData = playlists.flatMap((group) =>
					group.data.map((playlist) => ({
						...playlist,
						coverImg: playlist.coverImg.replace(/^http:/, 'https:'),
					})),
				)
				set({ playlists: combinedData })
			} catch (fallbackError) {
				console.error('Fallback playlist loading also failed:', fallbackError)
			}
		}
	},
	// getMusicIndex: (musicItem) => {
	//   if (!musicItem) {
	//     return -1
	//   }
	//   const { playListIndexMap } = useLibraryStore.getState()
	//   return playListIndexMap[musicItem.platform]?.[musicItem.id] ?? -1
	// },
	// isInPlayList: (musicItem) => {
	//   if (!musicItem) {
	//     return false
	//   }
	//   const { playListIndexMap } = useLibraryStore.getState()
	//   return playListIndexMap[musicItem.platform]?.[musicItem.id] > -1
	// },
	// getPlayListMusicAt: (index) => {
	//   const { tracks } = useLibraryStore.getState()
	//   const len = tracks.length
	//   if (len === 0) {
	//     return null
	//   }
	//   return tracks[(index + len) % len]
	// },
	// isPlayListEmpty: () => {
	//   const { tracks } = useLibraryStore.getState()
	//   return tracks.length === 0
	// },
}))

export const useTracks = () => {
	const { tracks, fetchTracks } = useLibraryStore()
	useEffect(() => {
		fetchTracks()
	}, [fetchTracks])
	return tracks
}
export const useAllTracks = () => {
	const allTracks = useLibraryStore((state) => state.allTracks)
	return allTracks
}
// export const useSetPlayList = () => {
//   const { tracks, setPlayList } = useLibraryStore()
//   useEffect(() => {
//      setPlayList(tracks)
//   }, [setPlayList])
//   return tracks
// }

export const useFavorites = () => {
	const favorites = useLibraryStore((state) => state.favorites)
	const toggleTrackFavorite = useLibraryStore((state) => state.toggleTrackFavorite)
	return {
		favorites,
		toggleTrackFavorite,
	}
}
export const useNowLyric = () => {
	const nowLyric = useLibraryStore((state) => state.nowLyric)
	const setNowLyric = useLibraryStore((state) => state.setNowLyric)
	return { nowLyric, setNowLyric }
}
export const useArtists = () =>
	useLibraryStore((state) => {
		return state.tracks.reduce((acc, track) => {
			const existingArtist = acc.find((artist) => artist.name === track.artist)
			if (existingArtist) {
				existingArtist.tracks.push(track)
			} else {
				acc.push({
					name: track.artist ?? 'Unknown',
					tracks: [track],
					singerImg: track.singerImg,
				})
			}
			return acc
		}, [] as Artist[])
	})

export const usePlaylists = () => {
	const playlists = useLibraryStore((state) => {
		return state.playlists
	})

	const setPlayList = useLibraryStore((state) => state.setPlayList)
	useEffect(() => {
		setPlayList()
	}, [setPlayList])
	return { playlists, setPlayList }
}
export const useTracksLoading = () => {
	return useLibraryStore((state) => state.isLoading)
}
