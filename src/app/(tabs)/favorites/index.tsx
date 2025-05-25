import localImage from '@/assets/local.png'
import { PlaylistsList } from '@/components/PlaylistsList'
import { screenPadding } from '@/constants/tokens'
import { playListsStore } from '@/helpers/trackPlayerIndex'
import { Playlist } from '@/helpers/types'
import { useNavigationSearch } from '@/hooks/useNavigationSearch'
import { defaultStyles } from '@/styles'
import i18n from '@/utils/i18n'
import { router } from 'expo-router'
import { useMemo } from 'react'
import { Image, ScrollView, View } from 'react-native'

const FavoritesScreen = () => {
	const search = useNavigationSearch({
		searchBarOptions: {
			placeholder: i18n.t('find.inFavorites'),
			cancelButtonText: i18n.t('find.cancel'),
		},
	})

	const favoritePlayListItem = {
		name: 'Favorites',
		id: 'favorites',
		tracks: [],
		title: i18n.t('appTab.favoritesSongs'),
		coverImg: 'https://y.qq.com/mediastyle/global/img/cover_like.png?max_age=2592000',
		description: i18n.t('appTab.favoritesSongs'),
	}

	const localPlayListItem = {
		name: 'Local',
		id: 'local',
		tracks: [],
		title: i18n.t('appTab.localOrCachedSongs'),
		coverImg: Image.resolveAssetSource(localImage).uri,
		description: i18n.t('appTab.localOrCachedSongs'),
	}
	const storedPlayLists = playListsStore.useValue() || []
	const playLists = [favoritePlayListItem, localPlayListItem, ...storedPlayLists]

	const filteredPlayLists = useMemo(() => {
		if (!search) return playLists as Playlist[]

		return playLists.filter((playlist: Playlist) =>
			playlist.name.toLowerCase().includes(search.toLowerCase()),
		) as Playlist[]
	}, [search, playLists, storedPlayLists])
	const handlePlaylistPress = (playlist: Playlist) => {
		if (playlist.name == 'Favorites') {
			router.push(`/(tabs)/favorites/favoriteMusic`)
		} else if (playlist.name == 'Local') {
			router.push(`/(tabs)/favorites/localMusic`)
		} else {
			router.push(`/(tabs)/favorites/${playlist.id}`)
		}
	}
	return (
		<View style={defaultStyles.container}>
			<ScrollView
				contentInsetAdjustmentBehavior="automatic"
				style={{
					paddingHorizontal: screenPadding.horizontal,
				}}
			>
				<PlaylistsList
					scrollEnabled={false}
					playlists={filteredPlayLists as Playlist[]}
					onPlaylistPress={handlePlaylistPress}
				/>
			</ScrollView>
		</View>
	)
}

export default FavoritesScreen
