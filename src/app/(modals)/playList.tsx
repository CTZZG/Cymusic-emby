import { NowPlayList } from '@/components/NowPlayList'
import { colors, screenPadding } from '@/constants/tokens'
import { usePlayList } from '@/store/playList'
import { defaultStyles } from '@/styles'
import { useHeaderHeight } from '@react-navigation/elements'
import React from 'react'
import { StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Track } from 'react-native-track-player'

const PlayListScreen = () => {
	const headerHeight = useHeaderHeight()
	const tracks = usePlayList()

	return (
		<SafeAreaView style={[styles.modalContainer, { paddingTop: headerHeight }]}>
			<NowPlayList id="PlayListScreen" tracks={tracks as Track[]} />
		</SafeAreaView>
	)
}

const styles = StyleSheet.create({
	modalContainer: {
		flex: 1,
		paddingHorizontal: screenPadding.horizontal,
		backgroundColor: defaultStyles.container.backgroundColor, // 设置默认背景颜色
	},
	header: {
		fontSize: 28,
		fontWeight: 'bold',
		padding: 0,
		paddingBottom: 20,
		paddingTop: 0,
		color: colors.text,
	},
})

export default PlayListScreen
