import TracksListItem from '@/components/TracksListItem'
import { unknownTrackImageUri } from '@/constants/images'
import myTrackPlayer from '@/helpers/trackPlayerIndex'
import { useQueue } from '@/store/queue'
import { utilsStyles } from '@/styles'
import { router } from 'expo-router'
import React, { useCallback, useMemo, useRef } from 'react'
import { FlatList, FlatListProps, Text, View } from 'react-native'
import FastImage from 'react-native-fast-image'
import { Track, useActiveTrack } from 'react-native-track-player'
import { QueueControls } from './QueueControls'
export type TracksListProps = Partial<FlatListProps<Track>> & {
	//以及所有来自 FlatListProps 的属性，且这些属性都是可选的。
	id: string
	tracks: Track[]
	hideQueueControls?: boolean
	isSinger?: boolean
	allowDelete?: boolean
	onDeleteTrack?: (trackId: string) => void
	isMultiSelectMode?: boolean
	selectedTracks?: Set<string>
	onToggleSelection?: (trackId: string) => void
	toggleMultiSelectMode?: () => void
	numsToPlay?: number
}
const ItemDivider = React.memo(() => (
	<View style={{ ...utilsStyles.itemSeparator, marginVertical: 9, marginLeft: 60 }} />
))

const EmptyListComponent = React.memo(() => (
	<View>
		<Text style={utilsStyles.emptyContentText}>No songs found</Text>
		<FastImage
			source={{ uri: unknownTrackImageUri, priority: FastImage.priority.normal }}
			style={utilsStyles.emptyContentImage}
		/>
	</View>
))

export const TracksList = React.memo(
	({
		id,
		tracks,
		hideQueueControls = false,
		isSinger = false,
		allowDelete = false,
		isMultiSelectMode = false,
		onDeleteTrack,
		selectedTracks = new Set(),
		onToggleSelection,
		toggleMultiSelectMode,
		numsToPlay,
		...flatlistProps
	}: TracksListProps) => {
		const queueOffset = useRef(0)
		const { activeQueueId, setActiveQueueId } = useQueue()
		const activeTrack = useActiveTrack()
		const handleTrackSelect = useCallback(
			async (selectedTrack: Track) => {
				const isChangingQueue = id !== activeQueueId
				if (isChangingQueue) {
					if (selectedTrack.id === activeTrack?.id) {
						router.navigate('/player')
					} else {
						await myTrackPlayer.playWithReplacePlayList(
							selectedTrack as IMusic.IMusicItem,
							(numsToPlay ? tracks.slice(0, numsToPlay) : tracks) as IMusic.IMusicItem[],
						)
						setActiveQueueId(id)
					}
				} else {
					if (selectedTrack.id === activeTrack?.id) {
						router.navigate('/player')
					} else {
						await myTrackPlayer.playWithReplacePlayList(
							selectedTrack as IMusic.IMusicItem,
							tracks as IMusic.IMusicItem[],
						)
					}
				}
			},
			[id, activeQueueId, tracks, setActiveQueueId, activeTrack],
		)

		const renderItem = useCallback(
			({ item: track }) => (
				<TracksListItem
					track={track}
					onTrackSelect={handleTrackSelect}
					isSinger={isSinger}
					allowDelete={allowDelete}
					onDeleteTrack={onDeleteTrack}
					isMultiSelectMode={isMultiSelectMode}
					onToggleSelection={onToggleSelection}
					selectedTracks={selectedTracks}
					toggleMultiSelectMode={toggleMultiSelectMode}
				/>
			),
			[
				handleTrackSelect,
				isSinger,
				allowDelete,
				onDeleteTrack,
				isMultiSelectMode,
				onToggleSelection,
				selectedTracks,
				toggleMultiSelectMode,
			],
		)

		const ListHeaderComponent = useMemo(
			() =>
				!hideQueueControls ? (
					<QueueControls
						tracks={numsToPlay ? tracks.slice(0, numsToPlay) : tracks}
						style={{ paddingBottom: 20 }}
					/>
				) : undefined,
			[hideQueueControls, tracks, numsToPlay],
		)

		return (
			<FlatList
				data={tracks}
				contentContainerStyle={{ paddingTop: 10, paddingBottom: 128 }}
				ListHeaderComponent={ListHeaderComponent}
				ListFooterComponent={ItemDivider}
				ItemSeparatorComponent={ItemDivider}
				ListEmptyComponent={EmptyListComponent}
				renderItem={renderItem}
				keyExtractor={useCallback((item: Track) => item.id, [])}
				{...flatlistProps}
			/>
		)
	},
)
