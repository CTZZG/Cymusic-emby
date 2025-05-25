import { colors } from '@/constants/tokens'
import { utilsStyles } from '@/styles'
import { Ionicons } from '@expo/vector-icons'
import React, { useEffect, useState } from 'react'
import { View, ViewProps } from 'react-native'
import { Slider } from 'react-native-awesome-slider'
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated'
import { VolumeManager } from 'react-native-volume-manager'

const NORMAL_HEIGHT = 4
const EXPANDED_HEIGHT = 4

export const PlayerVolumeBar = ({ style }: ViewProps) => {
	const [volume, setVolume] = useState(0)
	const progress = useSharedValue(0)
	const min = useSharedValue(0)
	const max = useSharedValue(1)
	const isSliding = useSharedValue(false)

	const [trackColor, setTrackColor] = useState(colors.maximumTrackTintColor)

	useEffect(() => {
		const getInitialVolume = async () => {
			await VolumeManager.showNativeVolumeUI({ enabled: true })
			const initialVolume = await VolumeManager.getVolume()
			setVolume(initialVolume.volume)
			progress.value = initialVolume.volume
		}
		getInitialVolume()

		const volumeListener = VolumeManager.addVolumeListener((result) => {
			setVolume(result.volume)
			progress.value = result.volume
		})

		return () => {
			volumeListener.remove()
		}
	}, [])

	const animatedSliderStyle = useAnimatedStyle(() => {
		return {
			height: withSpring(isSliding.value ? EXPANDED_HEIGHT : NORMAL_HEIGHT),
			transform: [{ scaleY: withSpring(isSliding.value ? 2 : 1) }],
		}
	})

	return (
		<View style={style}>
			<View style={{ flexDirection: 'row', alignItems: 'center' }}>
				<Ionicons name="volume-low" size={20} color={colors.icon} style={{ opacity: 0.8 }} />

				<Animated.View
					style={[{ flex: 1, flexDirection: 'row', paddingHorizontal: 10 }, animatedSliderStyle]}
				>
					<Slider
						progress={progress}
						minimumValue={min}
						containerStyle={utilsStyles.slider}
						onSlidingStart={() => {
							isSliding.value = true
							setTrackColor('#fff')
						}}
						onSlidingComplete={() => {
							isSliding.value = false
							setTrackColor(colors.maximumTrackTintColor)
						}}
						onValueChange={async (value) => {
							await VolumeManager.showNativeVolumeUI({ enabled: true })
							await VolumeManager.setVolume(value, {
								type: 'system', // default: "music" (Android only)
								showUI: true, // default: false (suppress native UI volume toast for iOS & Android)
								playSound: false, // default: false (Android only)
							})
						}}
						renderBubble={() => null}
						theme={{
							minimumTrackTintColor: trackColor,
							maximumTrackTintColor: colors.maximumTrackTintColor,
						}}
						thumbWidth={0}
						maximumValue={max}
					/>
				</Animated.View>

				<Ionicons name="volume-high" size={20} color={colors.icon} style={{ opacity: 0.8 }} />
			</View>
		</View>
	)
}
