import { colors, fontSize } from '@/constants/tokens'
import { durationStore } from '@/helpers/lyricManager'
import { formatSecondsToMinutes } from '@/helpers/miscellaneous'
import { defaultStyles, utilsStyles } from '@/styles'
import PropTypes from 'prop-types'
import { useEffect } from 'react'
import { StyleSheet, Text, View, ViewProps } from 'react-native'
import { Slider } from 'react-native-awesome-slider'
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated'
import TrackPlayer, { useProgress } from 'react-native-track-player'

const AnimatedThumb = ({ isSliding }) => {
	const animatedStyle = useAnimatedStyle(() => {
		return {
			width: withSpring(isSliding.value ? 24 : 12),
			height: withSpring(isSliding.value ? 24 : 12),
			borderRadius: withSpring(isSliding.value ? 12 : 6),
			backgroundColor: '#fff',
			left: 2,
		}
	})

	return <Animated.View style={animatedStyle} />
}

AnimatedThumb.propTypes = {
	isSliding: PropTypes.shape({
		value: PropTypes.bool.isRequired,
	}).isRequired,
}

export const PlayerProgressBar = ({
	style,
	onSeek,
}: ViewProps & { onSeek?: (position: number) => void }) => {
	const { position } = useProgress(250)
	const duration = durationStore.useValue()
	const isSliding = useSharedValue(false)
	const progress = useSharedValue(0)
	const min = useSharedValue(0)
	const max = useSharedValue(1)

	const trackElapsedTime = formatSecondsToMinutes(position)
	const trackRemainingTime = formatSecondsToMinutes(duration - position)

	useEffect(() => {
		if (!isSliding.value) {
			progress.value = duration > 0 ? position / duration : 0
		}
	}, [position, duration, isSliding])

	const handleSlidingComplete = async (value) => {
		if (!isSliding.value) return

		isSliding.value = false

		const newPosition = value * duration
		await TrackPlayer.seekTo(newPosition)
		// 增加一个短暂的延迟，确保音频解码器有足够的时间处理新的位置

		const actualPosition = await TrackPlayer.getPosition()
		if (onSeek) {
			onSeek(actualPosition)
		}
	}

	return (
		<View style={style}>
			<Slider
				progress={progress}
				minimumValue={min}
				maximumValue={max}
				containerStyle={utilsStyles.slider}
				renderThumb={() => <AnimatedThumb isSliding={isSliding} />}
				renderBubble={() => null}
				theme={{
					minimumTrackTintColor: colors.minimumTrackTintColor,
					maximumTrackTintColor: colors.maximumTrackTintColor,
				}}
				onSlidingStart={() => (isSliding.value = true)}
				onValueChange={async (value) => {
					const newPosition = value * duration
					await TrackPlayer.seekTo(newPosition)

					if (onSeek) {
						onSeek(newPosition)
					}
				}}
				onSlidingComplete={handleSlidingComplete}
			/>

			<View style={styles.timeRow}>
				<Text style={styles.timeText}>{trackElapsedTime}</Text>

				<Text style={styles.timeText}>
					{'-'} {trackRemainingTime}
				</Text>
			</View>
		</View>
	)
}

PlayerProgressBar.propTypes = {
	style: PropTypes.object,
	onSeek: PropTypes.func,
}

const styles = StyleSheet.create({
	timeRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'baseline',
		marginTop: 20,
	},
	timeText: {
		...defaultStyles.text,
		color: colors.text,
		opacity: 0.75,
		fontSize: fontSize.xs,
		letterSpacing: 0.7,
		fontWeight: '500',
	},
})
