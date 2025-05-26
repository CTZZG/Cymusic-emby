import SearchResultsByPlugin from '@/components/search/SearchResultsByPlugin'
import { colors, fontSize } from '@/constants/tokens'
import myTrackPlayer from '@/helpers/trackPlayerIndex'
import { useNavigationSearch } from '@/hooks/useNavigationSearch'
import { usePluginStore } from '@/store/pluginStore'
import { SupportMediaType } from '@/types/MediaTypes'
import i18n from '@/utils/i18n'
import { router } from 'expo-router'
import { useCallback, useRef, useState } from 'react'
import {
    Animated,
    Dimensions,
    Platform,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native'

type SearchType = SupportMediaType

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')
const SEGMENT_WIDTH = (SCREEN_WIDTH - 32 - 4) / 2 // 32 for padding, 4 for container padding
const SEARCH_OFFSET = Platform.select({
	ios: SCREEN_HEIGHT * 0.11, // 约11%的屏幕高度
	android: 0,
})

const SearchlistsScreen = () => {
	const { plugins } = usePluginStore()
	const [searchType, setSearchType] = useState<SearchType>('music')
	const slideAnim = useRef(new Animated.Value(0)).current
	const contentOffsetAnim = useRef(new Animated.Value(0)).current
	const [searchBarFocused, setSearchBarFocused] = useState(false)

	// 支持的搜索类型
	const searchTypes: { key: SearchType; label: string }[] = [
		{ key: 'music', label: '歌曲' },
		{ key: 'album', label: '专辑' },
		{ key: 'artist', label: '艺人' },
		{ key: 'sheet', label: '歌单' },
	]

	// 计算每个tab的宽度
	const tabWidth = (SCREEN_WIDTH - 32) / searchTypes.length

	const search = useNavigationSearch({
		searchBarOptions: {
			placeholder: i18n.t('find.inSearch'),
			cancelButtonText: i18n.t('find.cancel'),
		},
		onFocus: () => {
			Animated.spring(contentOffsetAnim, {
				toValue: -SEARCH_OFFSET,
				useNativeDriver: true,
				tension: 100,
				friction: 10,
			}).start()
			setSearchBarFocused(true)
		},
		onCancel: () => {
			Animated.spring(contentOffsetAnim, {
				toValue: 0,
				useNativeDriver: true,
				tension: 100,
				friction: 10,
			}).start()
		},
	})

	// 处理音乐项点击
	const handleMusicItemPress = useCallback(async (musicItem: any) => {
		try {
			await myTrackPlayer.addAndPlay(musicItem)
		} catch (error) {
			console.error('Failed to play music:', error)
		}
	}, [])

	// 处理其他媒体项点击
	const handleMediaItemPress = useCallback((item: any) => {
		switch (searchType) {
			case 'album':
				// 跳转到专辑详情页
				router.push(`/(modals)/albumDetail?albumId=${item.id}&platform=${item.platform}`)
				break
			case 'artist':
				// 跳转到艺人详情页
				router.push(`/(modals)/artistDetail?artistId=${item.id}&platform=${item.platform}`)
				break
			case 'sheet':
				// 跳转到歌单详情页
				router.push(`/(modals)/sheetDetail?sheetId=${item.id}&platform=${item.platform}`)
				break
			default:
				break
		}
	}, [searchType])

	const handleSearchTypeChange = (type: SearchType) => {
		const currentIndex = searchTypes.findIndex(t => t.key === searchType)
		const newIndex = searchTypes.findIndex(t => t.key === type)
		const toValue = newIndex * tabWidth

		Animated.spring(slideAnim, {
			toValue,
			useNativeDriver: true,
			tension: 100,
			friction: 10,
		}).start()
		setSearchType(type)
	}

	return (
		<SafeAreaView style={styles.safeArea}>
			<Animated.View
				style={[
					styles.contentContainer,
					{
						transform: [{ translateY: contentOffsetAnim }],
					},
				]}
			>
				{/* 搜索类型选择器 */}
				<View style={styles.segmentedControlContainer}>
					<ScrollView
						horizontal
						showsHorizontalScrollIndicator={false}
						style={styles.segmentedControl}
					>
						<Animated.View
							style={[
								styles.activeSegment,
								{
									position: 'absolute',
									width: tabWidth,
									transform: [{ translateX: slideAnim }],
								},
							]}
						/>
						{searchTypes.map((type, index) => (
							<Pressable
								key={type.key}
								style={[
									styles.segment,
									{ width: tabWidth },
									index === 0 && { borderTopLeftRadius: 8, borderBottomLeftRadius: 8 },
									index === searchTypes.length - 1 && { borderTopRightRadius: 8, borderBottomRightRadius: 8 }
								]}
								onPress={() => handleSearchTypeChange(type.key)}
							>
								<Text
									style={[
										styles.segmentText,
										searchType === type.key && styles.activeSegmentText
									]}
								>
									{type.label}
								</Text>
							</Pressable>
						))}
					</ScrollView>
				</View>

				{/* 搜索结果 */}
				<SearchResultsByPlugin
					query={search || ''}
					mediaType={searchType}
					onItemPress={searchType === 'music' ? handleMusicItemPress : handleMediaItemPress}
				/>
			</Animated.View>
		</SafeAreaView>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: colors.background,
	},
	safeArea: {
		flex: 1,
		backgroundColor: colors.background,
	},
	contentContainer: {
		flex: 1,
		backgroundColor: colors.background,
		paddingTop: 8,
	},
	segmentedControlContainer: {
		paddingHorizontal: 16,
		marginTop: 0,
		paddingBottom: 4,
	},
	segmentedControl: {
		backgroundColor: colors.maximumTrackTintColor,
		borderRadius: 8,
		padding: 2,
		position: 'relative',
		flexDirection: 'row',
	},
	segment: {
		paddingVertical: 8,
		alignItems: 'center',
		justifyContent: 'center',
		zIndex: 1,
	},
	activeSegment: {
		backgroundColor: colors.primary,
		borderRadius: 6,
		height: '100%',
		zIndex: 0,
	},
	segmentText: {
		fontSize: fontSize.sm,
		fontWeight: '500',
		color: colors.text,
	},
	activeSegmentText: {
		color: 'white',
	},
})

export default SearchlistsScreen
