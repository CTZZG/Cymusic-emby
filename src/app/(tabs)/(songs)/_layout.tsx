import GlobalButton from '@/components/GlobalButton'
import { StackScreenWithSearchBar } from '@/constants/layout'
import { colors } from '@/constants/tokens'
import { defaultStyles } from '@/styles'
import { nowLanguage } from '@/utils/i18n'
import { Stack } from 'expo-router'
import { View } from 'react-native'
const SongsScreenLayout = () => {
	const language = nowLanguage.useValue()
	return (
		<View style={defaultStyles.container} key={language}>
			<Stack>
				<Stack.Screen
					name="index"
					options={{
						headerTitle: '音乐',
						headerStyle: {
							backgroundColor: colors.background,
						},
						headerTintColor: colors.text,
						headerRight: () => <GlobalButton />,
					}}
				/>
				<Stack.Screen
					name="recentlyAdded"
					options={{
						...StackScreenWithSearchBar,
						headerTitle: '最新添加',
						headerStyle: {
							backgroundColor: colors.background,
						},
						headerTintColor: colors.text,
					}}
				/>
				<Stack.Screen
					name="mostPlayed"
					options={{
						...StackScreenWithSearchBar,
						headerTitle: '播放最多',
						headerStyle: {
							backgroundColor: colors.background,
						},
						headerTintColor: colors.text,
					}}
				/>
				<Stack.Screen
					name="recentlyPlayed"
					options={{
						...StackScreenWithSearchBar,
						headerTitle: '最近播放',
						headerStyle: {
							backgroundColor: colors.background,
						},
						headerTintColor: colors.text,
					}}
				/>
				<Stack.Screen
					name="random"
					options={{
						...StackScreenWithSearchBar,
						headerTitle: '随机播放',
						headerStyle: {
							backgroundColor: colors.background,
						},
						headerTintColor: colors.text,
					}}
				/>
			</Stack>
		</View>
	)
}

export default SongsScreenLayout
