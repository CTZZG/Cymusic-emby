import { screenPadding } from '@/constants/tokens'
import { useNavigationSearch } from '@/hooks/useNavigationSearch'
import { useAlbums, useAlbumsHasMore, useAlbumsLoading } from '@/store/albums'
import { defaultStyles } from '@/styles'
import i18n from '@/utils/i18n'
import { useEffect, useMemo } from 'react'
import { ActivityIndicator, FlatList, Image, RefreshControl, Text, TouchableOpacity, View } from 'react-native'

interface Album {
	id: string
	title: string
	artist: string
	artwork?: string
	description?: string
	worksNum?: number
}

const AlbumsScreen = () => {
	const search = useNavigationSearch({
		searchBarOptions: {
			placeholder: i18n.t('find.inAlbums') || 'Search albums...',
			cancelButtonText: i18n.t('find.cancel') || 'Cancel',
		},
	})

	const { albums, fetchAlbums } = useAlbums()
	const isLoading = useAlbumsLoading()
	const hasMore = useAlbumsHasMore()

	const filteredAlbums = useMemo(() => {
		if (!search) return albums
		return albums.filter((album: any) =>
			album.title.toLowerCase().includes(search.toLowerCase()) ||
			album.artist.toLowerCase().includes(search.toLowerCase())
		)
	}, [search, albums])

	useEffect(() => {
		fetchAlbums(true) // 初始加载
	}, [])

	const handleLoadMore = () => {
		if (hasMore && !isLoading) {
			fetchAlbums(false) // 加载更多
		}
	}

	const handleRefresh = () => {
		fetchAlbums(true) // 刷新数据
	}

	const renderAlbum = ({ item }: { item: Album }) => (
		<TouchableOpacity
			style={{
				flexDirection: 'row',
				padding: 12,
				marginVertical: 4,
				backgroundColor: 'rgba(255, 255, 255, 0.05)',
				borderRadius: 8,
			}}
			onPress={() => {
				// TODO: 导航到专辑详情页
				console.log('Navigate to album:', item.id)
			}}
		>
			<Image
				source={{ uri: item.artwork || 'https://via.placeholder.com/60' }}
				style={{
					width: 60,
					height: 60,
					borderRadius: 8,
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
					{item.title}
				</Text>
				<Text
					style={{
						color: 'rgba(255, 255, 255, 0.7)',
						fontSize: 14,
						marginBottom: 2
					}}
					numberOfLines={1}
				>
					{item.artist}
				</Text>
				{item.worksNum && (
					<Text
						style={{
							color: 'rgba(255, 255, 255, 0.5)',
							fontSize: 12
						}}
					>
						{item.worksNum} 首歌曲
					</Text>
				)}
			</View>
		</TouchableOpacity>
	)

	if (!albums.length && isLoading) {
		return (
			<View style={[defaultStyles.container, { justifyContent: 'center', alignItems: 'center' }]}>
				<ActivityIndicator size="large" />
			</View>
		)
	}

	if (!albums.length && !isLoading) {
		return (
			<View style={[defaultStyles.container, { justifyContent: 'center', alignItems: 'center' }]}>
				<Text style={{ color: 'white', fontSize: 16 }}>
					{search ? '未找到匹配的专辑' : '暂无专辑数据'}
				</Text>
			</View>
		)
	}

	return (
		<View style={defaultStyles.container}>
			<FlatList
				data={filteredAlbums}
				renderItem={renderAlbum}
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
					isLoading && albums.length > 0 ? (
						<View style={{ paddingVertical: 20, alignItems: 'center' }}>
							<ActivityIndicator size="small" />
						</View>
					) : null
				}
			/>
		</View>
	)
}

export default AlbumsScreen
