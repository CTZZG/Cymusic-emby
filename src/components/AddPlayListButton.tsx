// src/components/GlobalButton.tsx
import { router } from 'expo-router'
import React from 'react'
import { Button, StyleSheet, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { colors } from '@/constants/tokens'

const addPlayListButton = () => {

	const showPlayList = () => {
		router.navigate('/(modals)/importPlayList')
	}

	return (
		<View style={styles.container}>
				<MaterialCommunityIcons
			name='plus'
			size={27}
			onPress={showPlayList}
			color={colors.icon}
				style={{ marginRight: 6 }}
		/>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {},
})

export default addPlayListButton
