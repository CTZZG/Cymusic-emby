import unknownArtistImage from '@/assets/unknown_artist.png'
import unknownTrackImage from '@/assets/unknown_track.png'
import { Image } from 'react-native'
import { SoundAsset } from '@/constants/constant'

export const unknownTrackImageUri = Image.resolveAssetSource(unknownTrackImage).uri //在 React Native 中，URI 常用于标识图片、视频、音频等资源。例如，在你提供的代码中，Image.resolveAssetSource 返回的 URI 可以用于设置图片的 source 属性。
export const unknownArtistImageUri = Image.resolveAssetSource(unknownArtistImage).uri
export const  fakeAudioMp3Uri=Image.resolveAssetSource(SoundAsset.fakeAudio).uri;
