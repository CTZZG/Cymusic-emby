import { useCallback, useEffect, useState } from 'react'
import TrackPlayer from 'react-native-track-player'

export const useTrackPlayerVolume = () => {
	const [volume, setVolume] = useState<number | undefined>(1)

	const getVolume = useCallback(async () => {
		const currentVolume = await TrackPlayer.getVolume()
		setVolume(currentVolume)
	}, [])

	const updateVolume = useCallback(async (newVolume: number) => {
		if (newVolume < 0 || newVolume > 1) return

		setVolume(newVolume)

		await TrackPlayer.setVolume(newVolume)
	}, [])

	useEffect(() => {
		TrackPlayer.setVolume(1).then(() => getVolume())
	}, [getVolume])

	return { volume, updateVolume }
}
