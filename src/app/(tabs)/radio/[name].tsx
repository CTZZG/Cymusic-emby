import { PlaylistTracksList } from '@/components/PlaylistTracksList'
import { colors, screenPadding } from '@/constants/tokens'
import { getEmbyPlaylistTracks } from '@/helpers/embyApi'
import { getTopListDetail } from '@/helpers/userApi/getMusicSource'
import { usePlaylists } from '@/store/library'
import { defaultStyles } from '@/styles'
import { Redirect, useLocalSearchParams } from 'expo-router'
import React, { useEffect, useState } from 'react'
import { ActivityIndicator, ScrollView, View } from 'react-native'
import { Track } from 'react-native-track-player'

const RadioListScreen = () => {
	const { name: playlistName } = useLocalSearchParams<{ name: string }>()
	const { playlists } = usePlaylists()
	const [topListDetail, setTopListDetail] = useState<{ musicList: Track[] } | null>(null)
	const [loading, setLoading] = useState(true)

	const playlist = playlists.find((playlist) => playlist.title === playlistName)

	useEffect(() => {
		const fetchTopListDetail = async () => {
			if (!playlist) {
				console.warn(`Playlist ${playlistName} was not found!`)
				setLoading(false)
				return
			}
		
			try {
				// 检查是否为Emby播放列表
				if (playlist.platform === 'emby') {
					console.log('Fetching Emby playlist tracks for:', playlist.id)
					const embyTracks = await getEmbyPlaylistTracks(playlist.id)
					
					// 将Emby数据格式化为Track格式
					const formattedTracks = embyTracks.map((track: any) => ({
						id: track.id,
						title: track.title,
						artist: track.artist,
						album: track.album,
						artwork: track.artwork,
						duration: track.duration,
						url: track.url || '',
						platform: 'emby',
						_source: 'emby'
					}))
					
					setTopListDetail({ musicList: formattedTracks })
				} else {
					// 使用原有的QQ音乐播放列表逻辑
					const detail = await getTopListDetail(playlist)
					setTopListDetail(detail)
				}
			} catch (error) {
				console.error('Failed to fetch playlist detail:', error)
				setTopListDetail({ musicList: [] })
			}
			
			setLoading(false)
		}
		fetchTopListDetail()
	}, [])

	if (loading) {
		return (
			<View
				style={{
					flex: 1,
					justifyContent: 'center',
					alignItems: 'center',
					backgroundColor: colors.background,
				}}
			>
				<ActivityIndicator size="large" color="#fff" />
			</View>
		)
	}

	if (!playlist || !topListDetail) {
		return <Redirect href={'/(tabs)/radio'} />
	}

	return (
		<View style={defaultStyles.container}>
			<ScrollView
				contentInsetAdjustmentBehavior="automatic"
				style={{ paddingHorizontal: screenPadding.horizontal }}
			>
				<PlaylistTracksList playlist={playlist} tracks={topListDetail.musicList} />
			</ScrollView>
		</View>
	)
}

export default RadioListScreen
