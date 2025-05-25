import TrackPlayer, { Track } from 'react-native-track-player'
import api_ikun from '@/components/utils/musicSdk/tx/api-ikun'
import { useLibraryStore } from '@/store/library'
import { TrackWithPlaylist } from '@/helpers/types'

import {State} from 'react-native-track-player';

/**
 * 音乐是否处于停止状态
 * @param state
 * @returns
 */
export const musicIsPaused = (state: State | undefined) =>
    state !== State.Playing;

/**
 * 音乐是否处于缓冲中状态
 * @param state
 * @returns
 */
export const musicIsBuffering = (state: State | undefined) =>
    state === State.Loading || state === State.Buffering;

export const mySkipToNext = async () => {
  const tracks = useLibraryStore.getState().tracks

  const currentTrack =await TrackPlayer.getTrack(await TrackPlayer.getCurrentTrack())

  const currentTrackIndex = tracks.findIndex(track => track.id === currentTrack.id)

    if (currentTrackIndex !== -1 && currentTrackIndex < tracks.length - 1) {
      const nextTrack = tracks[currentTrackIndex + 1]
      if (nextTrack.url === 'Unknown') {
        nextTrack.url = await api_ikun.getMusicUrl(nextTrack, '128k').then((re) => re.url)
      }
      await TrackPlayer.load(nextTrack)
    } else if (currentTrackIndex === tracks.length - 1) {
      if (tracks[0].url === 'Unknown') {
        tracks[0].url = await api_ikun.getMusicUrl(tracks[0], '128k').then((re) => re.url)
      }
      if (tracks[0].url.indexOf('error') !== -1) {
        console.log('No valid tracks to play.')
      }
      await TrackPlayer.load(tracks[0])
    } else {
      console.log('No more tracks to skip to.')
    }
}
export const mySkipToPrevious = async () => {
  const tracks = useLibraryStore.getState().tracks

  let currentTrack = await TrackPlayer.getTrack(await TrackPlayer.getCurrentTrack())
  let currentTrackIndex = tracks.findIndex(track => track.id === currentTrack.id)

	// eslint-disable-next-line no-constant-condition
  while (true) {
    if (currentTrackIndex > 0 && currentTrackIndex !== -1 && currentTrackIndex <= tracks.length - 1) {
      const previousTrack = tracks[currentTrackIndex - 1]

      if (previousTrack.url === 'Unknown') {
        previousTrack.url = await api_ikun.getMusicUrl(previousTrack, '128k').then((re) => re.url)
      }

      if (previousTrack.url.indexOf('error') !== -1) {
        console.log('errorTrack ' + previousTrack.url)
        currentTrack = previousTrack
        currentTrackIndex -= 1
        continue
      }

      await TrackPlayer.load(previousTrack)
      break
    } else if (currentTrackIndex === 0) {
      currentTrackIndex = tracks.length - 1
      while (currentTrackIndex >= 0) {
        const lastTrack = tracks[currentTrackIndex]
        if (lastTrack.url === 'Unknown') {
          lastTrack.url = await api_ikun.getMusicUrl(lastTrack, '128k').then((re) => re.url)
        }
        if (lastTrack.url.indexOf('error') !== -1) {
          console.log('errorTrack ' + lastTrack.url)
          currentTrackIndex -= 1
          continue
        }
        await TrackPlayer.load(lastTrack)
        break
      }
      if (currentTrackIndex < 0) {
        console.log('No valid tracks to play.')
      }
      break
    } else {
      console.log('No more tracks to skip to.')
      break
    }
  }
}


