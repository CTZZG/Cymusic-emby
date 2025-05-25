import { screenPadding } from '@/constants/tokens'
import { getEmbyConfig, getEmbyToken, httpEmby } from '@/helpers/embyApi'
import { useNavigationSearch } from '@/hooks/useNavigationSearch'
import { defaultStyles } from '@/styles'
import i18n from '@/utils/i18n'
import { useEffect, useMemo, useState } from 'react'
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

	const [artists, setArtists] = useState<Artist[]>([])
	const [isLoading, setIsLoading] = useState(false)
	const [page, setPage] = useState(1)
	const [hasMore, setHasMore] = useState(true)

	const filteredArtists = useMemo(() => {
		if (!search) return artists
		return artists.filter(artist =>
			artist.name.toLowerCase().includes(search.toLowerCase())
		)
	}, [search, artists])

	const fetchArtists = async (pageNum: number = 1, isRefresh: boolean = false) => {
		if (isLoading) return

		setIsLoading(true)
		try {
			const tokenInfo = await getEmbyToken()
			if (tokenInfo) {
				// 使用Emby API获取艺术家列表
				const params = {
					IncludeItemTypes: 'MusicArtist',
					Recursive: true,
					UserId: tokenInfo.userId,
					StartIndex: (pageNum - 1) * 50,
					Limit: 50,
					Fields: 'PrimaryImageAspectRatio,ChildCount,ImageTags',
					SortBy: 'SortName',
					SortOrder: 'Ascending'
				}

				const result = await httpEmby('GET', 'Items', params)
				if (result && result.data && result.data.Items) {
					const newArtists = result.data.Items.map((artist: any) => ({
						id: artist.Id,
						name: artist.Name || 'Unknown Artist',
						avatar: artist.ImageTags?.Primary
							? `${getEmbyConfig()?.url}/Items/${artist.Id}/Images/Primary?maxWidth=300&maxHeight=300&tag=${artist.ImageTags.Primary}&format=jpg&quality=90`
							: 'https://via.placeholder.com/300',
						description: artist.Overview || '',
						worksNum: artist.ChildCount || 0,
						fans: 0 // Emby没有粉丝数概念
					}))

					if (isRefresh) {
						setArtists(newArtists)
					} else {
						setArtists(prev => [...prev, ...newArtists])
					}

					setHasMore(result.data.Items.length === 50)
					setPage(pageNum + 1)
				}
			} else {
				// Emby未配置时显示提示
				if (isRefresh) {
					setArtists([])
				}
			}
		} catch (error) {
			console.error('Failed to fetch artists:', error)
		} finally {
			setIsLoading(false)
		}
	}

	useEffect(() => {
		fetchArtists(1, true)
	}, [])

	const handleLoadMore = () => {
		if (hasMore && !isLoading) {
			fetchArtists(page)
		}
	}

	const handleRefresh = () => {
		fetchArtists(1, true) // 刷新数据
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
