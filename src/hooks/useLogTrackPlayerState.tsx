import { Event, useTrackPlayerEvents } from 'react-native-track-player'

const events = [
	Event.PlaybackState,
	Event.PlaybackError,
	Event.PlaybackQueueEnded,
	Event.PlaybackActiveTrackChanged,
	Event.PlaybackPlayWhenReadyChanged,
	Event.PlaybackTrackChanged,
	Event.PlaybackProgressUpdated,
]

export const useLogTrackPlayerState = () => {
	useTrackPlayerEvents(events, async (event) => {
		if (event.type === Event.PlaybackError) {
			console.warn('An error occurred: ', event)
		}

		if (event.type === Event.PlaybackState) {
			console.log('Playback state: ', event.state)
		} else if (event.type === Event.PlaybackQueueEnded) {
			console.log(' PlaybackQueueEnded: ', event.track)
		} else if (event.type === Event.PlaybackPlayWhenReadyChanged) {
			console.log('Ready ?:', event.playWhenReady)
		}
		// else if (event.type === Event.PlaybackProgressUpdated) {
		// 	const currentPosition = event.position
		// 	const currentLyric =
		// 		LyricManager.getLyricState().lyricParser?.getPosition(currentPosition).lrc
		// 	console.log('PlaybackProgressUpdated: ', currentLyric)
		// 	LyricManager.setCurrentLyric(currentLyric || null)
		// 	// LyricManager.refreshLyric()
		// }
		else {
			// console.log('Track other type:', event.type)
		}
	})
}
