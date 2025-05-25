import { TracksList } from '@/components/TracksList'
import { screenPadding } from '@/constants/tokens'
import { trackTitleFilter } from '@/helpers/filter'
import { generateTracksListId } from '@/helpers/miscellaneous'
import { songsNumsToLoadStore } from '@/helpers/trackPlayerIndex'
import { useNavigationSearch } from '@/hooks/useNavigationSearch'
import { useLibraryStore, useTracks, useTracksLoading } from '@/store/library'
import { defaultStyles } from '@/styles'
import i18n from '@/utils/i18n'
import { useMemo } from 'react'
import { ActivityIndicator, RefreshControl, ScrollView, View } from 'react-native'

const RecentlyPlayedScreen = () => {
	const search = useNavigationSearch({
		searchBarOptions: {
			placeholder: '在最近播放中搜索...',
			cancelButtonText: i18n.t('find.cancel'),
		},
	})

	const tracks = useTracks()
	const songsNumsToLoad = songsNumsToLoadStore.useValue()
	const isLoading = useTracksLoading()
	const { fetchTracks } = useLibraryStore()
	
	// 这里应该根据最近播放的逻辑来过滤歌曲
	const filteredTracks = useMemo(() => {
		if (!search) return tracks
		return tracks.filter(trackTitleFilter(search))
	}, [search, tracks])

	const handleLoadMore = () => {
		fetchTracks()
	}

	const handleRefresh = () => {
		fetchTracks(true)
	}

	if (!tracks.length && isLoading) {
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
						tintColor="#fff"
						titleColor="#fff"
					/>
				}
				onScroll={({ nativeEvent }) => {
					const { layoutMeasurement, contentOffset, contentSize } = nativeEvent
					const paddingToBottom = 20
					const isCloseToBottom =
						layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom

					if (isCloseToBottom) {
						handleLoadMore()
					}
				}}
				scrollEventThrottle={400}
			>
				<TracksList
					id={generateTracksListId('recentlyPlayed', search)}
					tracks={filteredTracks}
					scrollEnabled={false}
					numsToPlay={songsNumsToLoad}
				/>
			</ScrollView>
		</View>
	)
}

export default RecentlyPlayedScreen
