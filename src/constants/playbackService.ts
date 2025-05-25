import myTrackPlayer from '@/helpers/trackPlayerIndex'
import TrackPlayer, { Event } from 'react-native-track-player'

export const playbackService = async () => {
	TrackPlayer.addEventListener(Event.RemotePlay, () => {
		TrackPlayer.play()
	})

	TrackPlayer.addEventListener(Event.RemotePause, () => {
		TrackPlayer.pause()
	})

	TrackPlayer.addEventListener(Event.RemoteStop, () => {
		TrackPlayer.stop()
	})

	TrackPlayer.addEventListener(Event.RemoteNext, () => {
		myTrackPlayer.skipToNext()
	})

	TrackPlayer.addEventListener(Event.RemotePrevious, () => {
		myTrackPlayer.skipToPrevious()
	})

	TrackPlayer.addEventListener(Event.RemoteSeek, (event) => {
		const position = event.position
		TrackPlayer.seekTo(position)
	})
}
