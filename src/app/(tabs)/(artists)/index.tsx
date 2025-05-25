import { screenPadding } from '@/constants/tokens'
import { useNavigationSearch } from '@/hooks/useNavigationSearch'
import { useArtists, useArtistsHasMore, useArtistsLoading } from '@/store/artists'
import { defaultStyles } from '@/styles'
import i18n from '@/utils/i18n'
import { useEffect, useMemo } from 'react'
import { ActivityIndicator, FlatList, Image, RefreshControl, Text, TouchableOpacity, View } from 'react-native'

interface Artist {
	id: string
	name: string
	avatar?: string
	description?: string
	worksNum?: number
	fans?: number
}

const ArtistsScreen = () => {
	const search = useNavigationSearch({
		searchBarOptions: {
			placeholder: i18n.t('find.inArtists') || 'Search artists...',
			cancelButtonText: i18n.t('find.cancel') || 'Cancel',
		},
	})

	const { artists, fetchArtists } = useArtists()
	const isLoading = useArtistsLoading()
	const hasMore = useArtistsHasMore()

	const filteredArtists = useMemo(() => {
		if (!search) return artists
		return artists.filter(artist =>
			artist.name.toLowerCase().includes(search.toLowerCase())
		)
	}, [search, artists])

	useEffect(() => {
		fetchArtists(true) // 初始加载
	}, [])

	const handleLoadMore = () => {
		if (hasMore && !isLoading) {
			fetchArtists(false) // 加载更多
		}
	}

	const handleRefresh = () => {
		fetchArtists(true) // 刷新数据
	}

	const renderArtist = ({ item }: { item: Artist }) => (
		<TouchableOpacity
			style={{
				flexDirection: 'row',
				padding: 12,
				marginVertical: 4,
				backgroundColor: 'rgba(255, 255, 255, 0.05)',
				borderRadius: 8,
			}}
			onPress={() => {
				// TODO: 导航到艺术家详情页
				console.log('Navigate to artist:', item.id)
			}}
		>
			<Image
				source={{ uri: item.avatar || 'https://via.placeholder.com/60' }}
				style={{
					width: 60,
					height: 60,
					borderRadius: 30,
					marginRight: 12,
				}}
			/>
			<View style={{ flex: 1, justifyContent: 'center' }}>
				<Text
					style={{
						color: 'white',
						fontSize: 16,
						fontWeight: '600',
						marginBottom: 4
					}}
					numberOfLines={1}
				>
					{item.name}
				</Text>
				{item.description && (
					<Text
						style={{
							color: 'rgba(255, 255, 255, 0.7)',
							fontSize: 14,
							marginBottom: 2
						}}
						numberOfLines={2}
					>
						{item.description}
					</Text>
				)}
				<View style={{ flexDirection: 'row', alignItems: 'center' }}>
					{item.worksNum && (
						<Text
							style={{
								color: 'rgba(255, 255, 255, 0.5)',
								fontSize: 12,
								marginRight: 12
							}}
						>
							{item.worksNum} 首歌曲
						</Text>
					)}
					{item.fans && (
						<Text
							style={{
								color: 'rgba(255, 255, 255, 0.5)',
								fontSize: 12
							}}
						>
							{item.fans} 播放次数
						</Text>
					)}
				</View>
			</View>
		</TouchableOpacity>
	)

	if (!artists.length && isLoading) {
		return (
			<View style={[defaultStyles.container, { justifyContent: 'center', alignItems: 'center' }]}>
				<ActivityIndicator size="large" />
			</View>
		)
	}

	if (!artists.length && !isLoading) {
		return (
			<View style={[defaultStyles.container, { justifyContent: 'center', alignItems: 'center' }]}>
				<Text style={{ color: 'white', fontSize: 16 }}>
					{search ? '未找到匹配的艺术家' : '暂无艺术家数据'}
				</Text>
			</View>
		)
	}

	return (
		<View style={defaultStyles.container}>
			<FlatList
				data={filteredArtists}
				renderItem={renderArtist}
				keyExtractor={(item) => item.id}
				contentContainerStyle={{
					paddingHorizontal: screenPadding.horizontal,
					paddingVertical: 8
				}}
				refreshControl={
					<RefreshControl
						refreshing={isLoading}
						onRefresh={handleRefresh}
						tintColor="#fff"
						titleColor="#fff"
					/>
				}
				onEndReached={handleLoadMore}
				onEndReachedThreshold={0.5}
				ListFooterComponent={
					isLoading && artists.length > 0 ? (
						<View style={{ paddingVertical: 20, alignItems: 'center' }}>
							<ActivityIndicator size="small" />
						</View>
					) : null
				}
			/>
		</View>
	)
}

export default ArtistsScreen
