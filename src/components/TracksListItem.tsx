import { TrackShortcutsMenu } from '@/components/TrackShortcutsMenu'
import { unknownTrackImageUri } from '@/constants/images'
import { colors, fontSize } from '@/constants/tokens'
import myTrackPlayer from '@/helpers/trackPlayerIndex'
import PersistStatus from '@/store/PersistStatus'
import { defaultStyles } from '@/styles'
import rpx from '@/utils/rpx'
import { Entypo, Ionicons } from '@expo/vector-icons'
import React, { memo, useEffect, useState } from 'react'
import { StyleSheet, Text, TouchableHighlight, TouchableOpacity, View } from 'react-native'
import FastImage from 'react-native-fast-image' //导入默认导出时，不需要使用大括号 {}，并且可以使用任意名称来引用导入的值。
import LoaderKit from 'react-native-loader-kit'
import { Track, useActiveTrack, useIsPlaying } from 'react-native-track-player'
import { StopPropagation } from './utils/StopPropagation'

export type TracksListItemProps = {
	track: Track
	onTrackSelect: (track: Track) => void
	isSinger?: boolean
	allowDelete?: boolean
	onDeleteTrack?: (trackId: string) => void
	isMultiSelectMode?: boolean
	onToggleSelection?: (trackId: string) => void
	selectedTracks?: Set<string>
	toggleMultiSelectMode?: () => void
}
//类型定义描述了 TracksListItemProps 对象的结构和属性。在这个例子中，TracksListItemProps 类型包含两个属性：
//
// track: 一个 Track 类型的对象。
// onTrackSelect: 一个函数，该函数接受一个 Track 类型的参数，没有返回值。
// 这个定义通常用于为组件的 props 提供类型检查和自动完成提示，确保在使用组件时传递的 props 符合预期的类型。

const TracksListItem = ({
	track,
	onTrackSelect: handleTrackSelect,
	isSinger = false,
	allowDelete = false,
	isMultiSelectMode = false,
	onToggleSelection,
	selectedTracks,
	onDeleteTrack,
	toggleMultiSelectMode,
}: TracksListItemProps) => {
	const { playing } = useIsPlaying()

	const isActiveTrack = useActiveTrack()?.id === track.id
	// 添加缓存状态检查
	const [isCached, setIsCached] = useState(false)
	const isCachedIconVisible = PersistStatus.get('music.isCachedIconVisible') ?? true
	useEffect(() => {
		// 检查歌曲是否已缓存
		const checkCache = async () => {
			try {
				const cached = await myTrackPlayer.isCached(track as IMusic.IMusicItem)

				setIsCached(cached)
			} catch (error) {
				console.error('检查缓存状态失败:', error)
			}
		}
		checkCache()
	}, [track])
	return (
		<TouchableHighlight
			onPress={() => (isMultiSelectMode ? onToggleSelection?.(track.id) : handleTrackSelect(track))}
			onLongPress={toggleMultiSelectMode}
		>
			<View style={styles.trackItemContainer}>
				{isMultiSelectMode && (
					<TouchableOpacity
						onPress={() => onToggleSelection?.(track.id)}
						style={{ marginRight: 10 }}
					>
						<Ionicons
							name={selectedTracks.has(track.id) ? 'checkbox' : 'square-outline'}
							size={24}
							color={selectedTracks.has(track.id) ? colors.primary : 'gray'}
						/>
					</TouchableOpacity>
				)}
				<View>
					<FastImage
						source={{
							uri: track.artwork ?? unknownTrackImageUri,
							priority: FastImage.priority.normal,
						}}
						style={{
							...styles.trackArtworkImage,
							opacity: isActiveTrack ? 0.6 : 1, //激活时候的透明度0.6
						}}
					/>

					{isActiveTrack &&
						(playing ? (
							<LoaderKit
								style={styles.trackPlayingIconIndicator}
								name="LineScaleParty"
								color={colors.icon}
							/>
						) : (
							<Ionicons
								style={styles.trackPausedIndicator}
								name="play"
								size={24}
								color={colors.icon}
							/>
						))}
				</View>
				<View
					style={{
						flex: 1,
						flexDirection: 'row',
						alignItems: 'center',
					}}
				>
					{/* 左侧 3/4 区域：歌曲信息 */}
					<View style={{ flex: 3 }}>
						<Text
							numberOfLines={1}
							style={{
								...styles.trackTitleText,
								color: isActiveTrack ? colors.primary : colors.text,
							}}
						>
							{isCached && isCachedIconVisible && (
								<>
									<Ionicons name="cloud-done-outline" size={12} style={{ marginRight: 8 }} />{' '}
								</>
							)}
							{track.title}
						</Text>
						{track.artist && (
							<Text numberOfLines={1} style={styles.trackArtistText}>
								{track.artist}
							</Text>
						)}
					</View>

					{/* 右侧 1/4 区域：菜单按钮 */}
					{!isMultiSelectMode && (
						<View style={{ flex: 1 }}>
							<StopPropagation>
								<TrackShortcutsMenu
									track={track}
									isSinger={isSinger}
									allowDelete={allowDelete}
									onDeleteTrack={onDeleteTrack}
								>
									<View
										style={{
											flex: 1,
											alignItems: 'flex-end',
											justifyContent: 'center',
											paddingLeft: rpx(100),
										}}
									>
										<Entypo name="dots-three-horizontal" size={18} color={colors.icon} />
									</View>
								</TrackShortcutsMenu>
							</StopPropagation>
						</View>
					)}
				</View>
			</View>
		</TouchableHighlight>
	)
}
export default memo(TracksListItem)
const styles = StyleSheet.create({
	trackItemContainer: {
		flexDirection: 'row',
		columnGap: 14,
		alignItems: 'center',
		paddingRight: 0,
	},
	trackPlayingIconIndicator: {
		position: 'absolute',
		top: 18,
		left: 16,
		width: 16,
		height: 16,
	},
	trackPausedIndicator: {
		position: 'absolute',
		top: 14,
		left: 14,
	},
	trackArtworkImage: {
		borderRadius: 8,
		width: 50,
		height: 50,
	},
	trackTitleText: {
		...defaultStyles.text,
		fontSize: fontSize.sm,
		fontWeight: '600',
		maxWidth: '80%',
	},
	trackArtistText: {
		...defaultStyles.text,
		color: colors.textMuted,
		fontSize: 14,
		marginTop: 4,
		maxWidth: '80%',
	},
})
