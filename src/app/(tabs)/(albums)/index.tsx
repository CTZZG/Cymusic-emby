import { screenPadding } from '@/constants/tokens'
import { useNavigationSearch } from '@/hooks/useNavigationSearch'
import { defaultStyles } from '@/styles'
import i18n from '@/utils/i18n'
import { useMemo, useState, useEffect } from 'react'
import { ActivityIndicator, ScrollView, View, Text, TouchableOpacity, Image, FlatList } from 'react-native'
import { searchAlbumInternal, getEmbyToken } from '@/helpers/embyApi'

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
				// 使用Emby API获取专辑
				const result = await searchAlbumInternal('', pageNum) // 空搜索获取所有专辑
				if (result && result.data) {
					const newAlbums = result.data.map((album: any) => ({
						id: album.id,
						title: album.title,
						artist: album.artist,
						artwork: album.artwork,
						description: album.description,
						worksNum: album.worksNum
					}))
					
					if (isRefresh) {
						setAlbums(newAlbums)
					} else {
						setAlbums(prev => [...prev, ...newAlbums])
					}
					
					setHasMore(!result.isEnd)
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
