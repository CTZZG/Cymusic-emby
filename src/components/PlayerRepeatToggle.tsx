import { colors } from '@/constants/tokens'
import { useTrackPlayerRepeatMode } from '@/hooks/useTrackPlayerRepeatMode'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { ComponentProps } from 'react'
import { RepeatMode } from 'react-native-track-player'
import { match } from 'ts-pattern'
import myTrackPlayer, { MusicRepeatMode, repeatModeStore } from '@/helpers/trackPlayerIndex'
import { GlobalState } from '@/utils/stateMapper'

type IconProps = Omit<ComponentProps<typeof MaterialCommunityIcons>, 'name'>
type IconName = ComponentProps<typeof MaterialCommunityIcons>['name']

// const repeatOrder = [RepeatMode.Off, RepeatMode.Track, RepeatMode.Queue] as const

export const PlayerRepeatToggle = ({ ...iconProps }: IconProps) => {


	const toggleRepeatMode = () => {
		myTrackPlayer.toggleRepeatMode()
	}

	const icon = match(myTrackPlayer.getRepeatMode())
		.returnType<IconName>()
		.with(MusicRepeatMode.SHUFFLE, () => 'shuffle')
		.with(MusicRepeatMode.SINGLE, () => 'repeat-once')
		.with(MusicRepeatMode.QUEUE, () => 'repeat')
		.otherwise(() => 'repeat-off')

	return (
		<MaterialCommunityIcons
			name={icon}
			onPress={toggleRepeatMode}
			color={colors.icon}
			{...iconProps}
		/>
	)
}
