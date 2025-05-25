import { screenPadding } from '@/constants/tokens'
import { getEmbyConfig, getEmbyToken, httpEmby } from '@/helpers/embyApi'
import { useNavigationSearch } from '@/hooks/useNavigationSearch'
import { defaultStyles } from '@/styles'
import i18n from '@/utils/i18n'
import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, FlatList, Image, Text, TouchableOpacity, View } from 'react-native'

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

	const [albums, setAlbums] = useState<Album[]>([])
	const [isLoading, setIsLoading] = useState(false)
	const [page, setPage] = useState(1)
	const [hasMore, setHasMore] = useState(true)

	const filteredAlbums = useMemo(() => {
		if (!search) return albums
		return albums.filter(album =>
			album.title.toLowerCase().includes(search.toLowerCase()) ||
			album.artist.toLowerCase().includes(search.toLowerCase())
		)
	}, [search, albums])

	const fetchAlbums = async (pageNum: number = 1, isRefresh: boolean = false) => {
		if (isLoading) return

		setIsLoading(true)
		try {
			const tokenInfo = await getEmbyToken()
			if (tokenInfo) {
				// 使用Emby API获取专辑列表
				const params = {
					IncludeItemTypes: 'MusicAlbum',
					Recursive: true,
					UserId: tokenInfo.userId,
					StartIndex: (pageNum - 1) * 50,
					Limit: 50,
					Fields: 'PrimaryImageAspectRatio,AlbumArtist,ChildCount,ImageTags',
					SortBy: 'SortName',
					SortOrder: 'Ascending'
				}

				const result = await httpEmby('GET', `Users/${tokenInfo.userId}/Items`, params)
				if (result && result.data && result.data.Items) {
					const newAlbums = result.data.Items.map((album: any) => ({
						id: album.Id,
						title: album.Name || 'Unknown Album',
						artist: album.AlbumArtist || 'Unknown Artist',
						artwork: album.ImageTags?.Primary
							? `${getEmbyConfig()?.url}/Items/${album.Id}/Images/Primary?maxWidth=300&maxHeight=300&tag=${album.ImageTags.Primary}&format=jpg&quality=90`
							: 'https://via.placeholder.com/300',
						description: album.Overview || '',
						worksNum: album.ChildCount || 0
					}))

					if (isRefresh) {
						setAlbums(newAlbums)
					} else {
						setAlbums(prev => [...prev, ...newAlbums])
					}

					setHasMore(result.data.Items.length === 50)
					setPage(pageNum + 1)
				}
			} else {
				// Emby未配置时显示提示
				if (isRefresh) {
					setAlbums([])
				}
			}
		} catch (error) {
			console.error('Failed to fetch albums:', error)
		} finally {
			setIsLoading(false)
		}
	}

	useEffect(() => {
		fetchAlbums(1, true)
	}, [])

	const handleLoadMore = () => {
		if (hasMore && !isLoading) {
			fetchAlbums(page)
		}
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
