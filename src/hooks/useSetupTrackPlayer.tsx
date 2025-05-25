import myTrackPlayer from '@/helpers/trackPlayerIndex'
import { useEffect, useRef } from 'react'
import TrackPlayer, { Capability, RatingType, RepeatMode } from 'react-native-track-player'

const setupPlayer = async () => {
	await TrackPlayer.setupPlayer({})

	await TrackPlayer.updateOptions({
		ratingType: RatingType.Heart,
		capabilities: [
			Capability.Play,
			Capability.Pause,
			Capability.SkipToNext,
			Capability.SkipToPrevious,
			Capability.Stop,
			Capability.SeekTo,
		],
		progressUpdateEventInterval: 1,
	})

	await TrackPlayer.setVolume(1) // 默认音量1
	await TrackPlayer.setRepeatMode(RepeatMode.Queue)
}

export const useSetupTrackPlayer = ({ onLoad }: { onLoad?: () => void }) => {
	//useSetupTrackPlayer 这个自定义 Hook 用于初始化音乐播放器，并确保它只初始化一次。
	const isInitialized = useRef(false) //是一个 React Hook，用于持有可变的对象，这些对象在组件的生命周期内保持不变。使用 useRef 创建一个引用 isInitialized，初始值为 false。它用于跟踪播放器是否已经初始化。

	useEffect(() => {
		//是一个 React Hook，用于在函数组件中执行副作用（如数据获取、订阅等）。
		if (isInitialized.current) return

		setupPlayer()
			.then(async () => {
				await myTrackPlayer.setupTrackPlayer()
				isInitialized.current = true
				onLoad?.()
			})
			.catch((error) => {
				isInitialized.current = false
				console.error(error)
			})
	}, [onLoad])
}
