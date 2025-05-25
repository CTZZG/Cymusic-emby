import { colors } from '@/constants/tokens'
import { nowLanguage } from '@/utils/i18n'
import { useNavigation } from 'expo-router'
import { debounce } from 'lodash'
import { useCallback, useLayoutEffect, useState } from 'react'
import { SearchBarProps } from 'react-native-screens'

const defaultSearchOptions: SearchBarProps = {
	tintColor: colors.primary,
	hideWhenScrolling: false,
}

export const useNavigationSearch = ({
	searchBarOptions,
	onFocus,
	onBlur,
	onCancel,
}: {
	searchBarOptions?: SearchBarProps
	onFocus?: () => void
	onBlur?: () => void
	onCancel?: () => void
}) => {
	const [search, setSearch] = useState('')

	const navigation = useNavigation()
	const language = nowLanguage.useValue()

	const debouncedSetSearch = useCallback(
		debounce((text) => {
			setSearch(text)
		}, 400),
		[],
	)

	const handleOnChangeText: SearchBarProps['onChangeText'] = ({ nativeEvent: { text } }) => {
		debouncedSetSearch(text)
	}

	useLayoutEffect(() => {
		navigation.setOptions({
			headerSearchBarOptions: {
				...defaultSearchOptions,
				...searchBarOptions,
				onChangeText: handleOnChangeText,
				onFocus: onFocus,
				onBlur: onBlur,
				onCancelButtonPress: (e) => {
					onCancel?.()
					searchBarOptions?.onCancelButtonPress?.(e)
				},
			},
		})
	}, [navigation, searchBarOptions, onFocus, onBlur, onCancel])

	return search
}
