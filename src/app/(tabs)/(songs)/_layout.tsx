import GlobalButton from '@/components/GlobalButton'
import { StackScreenWithSearchBar } from '@/constants/layout'
import { defaultStyles } from '@/styles'
import i18n, { nowLanguage } from '@/utils/i18n'
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
						...StackScreenWithSearchBar,
						headerTitle: i18n.t('appTab.songs'),
						headerRight: () => <GlobalButton />,
					}}
				/>
			</Stack>
		</View>
	)
}

export default SongsScreenLayout
