import { colors, screenPadding } from '@/constants/tokens'
import { getHomeRecommendations } from '@/helpers/embyApi'
import { defaultStyles } from '@/styles'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Dimensions, Image, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import TrackPlayer from 'react-native-track-player'

const { width } = Dimensions.get('window')
const ITEM_WIDTH = (width - 60) / 2 // 减去padding和间距

interface HomeRecommendations {
  recentlyAdded: any[]
  mostPlayed: any[]
  recentlyPlayed: any[]
  randomTracks: any[]
}

const SongsScreen = () => {
	const [recommendations, setRecommendations] = useState<HomeRecommendations | null>(null)
	const [isLoading, setIsLoading] = useState(true)

	const loadRecommendations = useCallback(async () => {
		setIsLoading(true)
		try {
			const data = await getHomeRecommendations()
			setRecommendations(data)
		} catch (error) {
			console.error('Failed to load recommendations:', error)
		} finally {
			setIsLoading(false)
		}
	}, [])

	useEffect(() => {
		loadRecommendations()
	}, [loadRecommendations])

	const handleRefresh = useCallback(() => {
		loadRecommendations()
	}, [loadRecommendations])

	const handlePlayMusic = useCallback(async (item: any, playlist: any[]) => {
		try {
			// 清空当前播放列表
			await TrackPlayer.reset()

			// 添加整个播放列表
			const tracks = playlist.map((track, index) => ({
				id: track.id,
				url: track.url || '',
				title: track.title,
				artist: track.artist,
				artwork: track.artwork,
				album: track.album,
				duration: track.duration,
			}))

			await TrackPlayer.add(tracks)

			// 找到当前点击的歌曲在列表中的位置
			const currentIndex = playlist.findIndex(track => track.id === item.id)
			if (currentIndex >= 0) {
				await TrackPlayer.skip(currentIndex)
			}

			// 开始播放
			await TrackPlayer.play()
		} catch (error) {
			console.error('Failed to play music:', error)
		}
	}, [])

	const renderMusicCard = (item: any, index: number, playlist: any[]) => (
		<TouchableOpacity
			key={`${item.id}-${index}`}
			style={styles.musicCard}
			onPress={() => handlePlayMusic(item, playlist)}
		>
			<Image
				source={{ uri: item.artwork || 'https://via.placeholder.com/150' }}
				style={styles.musicImage}
			/>
			<View style={styles.playButton}>
				<Ionicons name="play" size={20} color="#fff" />
			</View>
			<Text style={styles.musicTitle} numberOfLines={2}>{item.title}</Text>
			<Text style={styles.musicArtist} numberOfLines={1}>{item.artist}</Text>
		</TouchableOpacity>
	)

	const renderSection = (title: string, data: any[], onViewAll?: () => void) => (
		<View style={styles.section}>
			<View style={styles.sectionHeader}>
				<Text style={styles.sectionTitle}>{title}</Text>
				{onViewAll && (
					<TouchableOpacity onPress={onViewAll}>
						<Ionicons name="chevron-forward" size={20} color={colors.primary} />
					</TouchableOpacity>
				)}
			</View>
			<ScrollView
				horizontal
				showsHorizontalScrollIndicator={false}
				contentContainerStyle={styles.horizontalList}
			>
				{data.slice(0, 6).map((item, index) => renderMusicCard(item, index, data))}
			</ScrollView>
		</View>
	)

	if (isLoading && !recommendations) {
		return (
			<View style={[defaultStyles.container, { justifyContent: 'center', alignItems: 'center' }]}>
				<ActivityIndicator size="large" />
			</View>
		)
	}

	return (
		<View style={defaultStyles.container}>
			<ScrollView
				contentInsetAdjustmentBehavior="automatic"
				style={{ paddingHorizontal: screenPadding.horizontal }}
				refreshControl={
					<RefreshControl
						refreshing={isLoading}
						onRefresh={handleRefresh}
						tintColor={colors.primary}
						titleColor={colors.text}
					/>
				}
			>
				{recommendations && (
					<>
						{renderSection(
							'最新添加',
							recommendations.recentlyAdded,
							() => router.push('/(tabs)/(songs)/recentlyAdded')
						)}

						{renderSection(
							'播放最多',
							recommendations.mostPlayed,
							() => router.push('/(tabs)/(songs)/mostPlayed')
						)}

						{renderSection(
							'最近播放',
							recommendations.recentlyPlayed,
							() => router.push('/(tabs)/(songs)/recentlyPlayed')
						)}

						{renderSection(
							'随机播放',
							recommendations.randomTracks,
							() => router.push('/(tabs)/(songs)/random')
						)}
					</>
				)}
			</ScrollView>
		</View>
	)
}

const styles = StyleSheet.create({
	section: {
		marginBottom: 24,
	},
	sectionHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 12,
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: 'bold',
		color: colors.text,
	},
	horizontalList: {
		paddingRight: 16,
	},
	musicCard: {
		width: ITEM_WIDTH,
		marginRight: 12,
		backgroundColor: colors.background,
		borderRadius: 8,
		overflow: 'hidden',
	},
	musicImage: {
		width: '100%',
		height: ITEM_WIDTH,
		backgroundColor: colors.background,
		position: 'relative',
	},
	playButton: {
		position: 'absolute',
		top: ITEM_WIDTH - 40,
		right: 8,
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: 'rgba(0,0,0,0.7)',
		justifyContent: 'center',
		alignItems: 'center',
	},
	musicTitle: {
		fontSize: 14,
		fontWeight: '600',
		color: colors.text,
		padding: 8,
		paddingBottom: 4,
	},
	musicArtist: {
		fontSize: 12,
		color: colors.textMuted,
		paddingHorizontal: 8,
		paddingBottom: 8,
	},
})

export default SongsScreen
