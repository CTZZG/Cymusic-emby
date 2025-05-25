import { StackScreenWithSearchBar } from '@/constants/layout'
import { colors } from '@/constants/tokens'
import { defaultStyles } from '@/styles'
import i18n from '@/utils/i18n'
import { Stack } from 'expo-router'
import { View } from 'react-native'

const ArtistsScreenLayout = () => {
	return (
		<View style={defaultStyles.container}>
			<Stack>
				<Stack.Screen
					name="index"
					options={{
						...StackScreenWithSearchBar,
						headerTitle: i18n.t('appTab.artists'),
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

export default ArtistsScreenLayout
