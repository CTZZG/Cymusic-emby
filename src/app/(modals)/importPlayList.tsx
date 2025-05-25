import { unknownTrackImageUri } from '@/constants/images'
import { colors, screenPadding } from '@/constants/tokens'
import { logError } from '@/helpers/logger'
import myTrackPlayer from '@/helpers/trackPlayerIndex'
import { getPlayListFromQ } from '@/helpers/userApi/getMusicSource'
import { defaultStyles } from '@/styles'
import { Ionicons } from '@expo/vector-icons'
import { useHeaderHeight } from '@react-navigation/elements'
import * as ImagePicker from 'expo-image-picker'
import { router } from 'expo-router'
import React, { useRef, useState } from 'react'
import {
	ActivityIndicator,
	Image,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'

const ImportPlayList = () => {
	const [playlistUrl, setPlaylistUrl] = useState('')
	const [playlistData, setPlaylistData] = useState(null)
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState(null)
	const [customName, setCustomName] = useState('')
	const [coverImage, setCoverImage] = useState(null)

	const nameInputRef = useRef(null)
	const urlInputRef = useRef(null)

	const headerHeight = useHeaderHeight()
	const { top } = useSafeAreaInsets()

	const pickImage = async () => {
		const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ImagePicker.MediaTypeOptions.Images,
			allowsEditing: true,
			aspect: [1, 1],
			quality: 1,
		})

		if (!result.canceled) {
			setCoverImage(result.assets[0].uri)
		}
	}

	const handleCreatePlaylist = async () => {
		if (!customName.trim()) {
			setError('请输入歌单名称')
			return
		}
		setIsLoading(true)
		setError(null)
		console.log('coverImage', coverImage)
		try {
			const newPlaylist = {
				id: Date.now().toString(),
				platform: 'QQ',
				artist: '未知歌手',
				name: customName.trim(),
				title: customName.trim(),
				songs: [],
				artwork: coverImage || unknownTrackImageUri,
				tracks: [],
			}
			await myTrackPlayer.addPlayLists(newPlaylist as IMusic.PlayList)
			router.dismiss()
		} catch (err) {
			setError('创建失败，请重试')
			logError('创建错误:', err)
		} finally {
			setIsLoading(false)
		}
	}

	const handleImport = async () => {
		setIsLoading(true)
		setError(null)
		try {
			if (!playlistUrl.includes('id=')) throw new Error('链接格式不正确')
			if (!playlistUrl) throw new Error('链接不能为空')
			// 发起实际的网络请求
			const match = playlistUrl.match(/[?&]id=(\d+)/)
			const response = await getPlayListFromQ(match ? match[1] : null)
			// 设置数据
			// console.log(JSON.stringify(response) + '12312312')
			const processedResponse: any = {
				...response,
				title: response.title || response.name || '未知歌单', // 如果 title 为空，使用 name
			}
			setPlaylistData(processedResponse)
			myTrackPlayer.addPlayLists(processedResponse as IMusic.PlayList)
			router.dismiss()
		} catch (err) {
			setError('导入失败，请检查链接是否正确')
			// myTrackPlayer.deletePlayLists('7570659434')
			logError('导入错误:', err)
		} finally {
			setIsLoading(false)
		}
	}

	const DismissPlayerSymbol = () => (
		<View style={[styles.dismissSymbol, { top: top - 25 }]}>
			<View style={styles.dismissBar} />
		</View>
	)

	return (
		<SafeAreaView style={[styles.modalContainer, { paddingTop: headerHeight }]}>
			<DismissPlayerSymbol />
			<KeyboardAvoidingView
				behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
				style={{ flex: 1 }}
			>
				<ScrollView
					showsVerticalScrollIndicator={false}
					contentContainerStyle={{ flexGrow: 1 }}
					keyboardShouldPersistTaps="handled"
				>
					<Text style={styles.header}>导入/创建歌单</Text>

					<View style={styles.section}>
						<Text style={styles.sectionTitle}>创建新歌单</Text>
						<View style={styles.createPlaylistCard}>
							<View style={styles.createPlaylistContainer}>
								<View style={styles.coverContainer}>
									<TouchableOpacity onPress={pickImage} style={styles.coverPicker}>
										{coverImage ? (
											<Image source={{ uri: coverImage }} style={styles.coverImage} />
										) : (
											<View style={styles.coverPlaceholder}>
												<Ionicons name="image-outline" size={24} color={colors.primary} />
												<Text style={styles.coverText}>选择封面</Text>
											</View>
										)}
									</TouchableOpacity>
								</View>

								<View style={styles.playlistInfoContainer}>
									<View style={[styles.inputContainer, { marginBottom: 0 }]}>
										<TextInput
											ref={nameInputRef}
											style={styles.input}
											value={customName}
											onChangeText={setCustomName}
											placeholder="输入歌单名称"
											placeholderTextColor="#999"
											autoCapitalize="none"
											autoCorrect={false}
											keyboardType="default"
											returnKeyType="done"
											blurOnSubmit={true}
											onSubmitEditing={() => nameInputRef.current?.blur()}
											enablesReturnKeyAutomatically={true}
											clearButtonMode="while-editing"
										/>
									</View>
								</View>
							</View>

							<TouchableOpacity
								onPress={handleCreatePlaylist}
								activeOpacity={0.8}
								style={styles.button}
								disabled={isLoading}
							>
								{isLoading ? (
									<ActivityIndicator color="#fff" />
								) : (
									<>
										<Ionicons name="add-circle-outline" size={24} color={colors.primary} />
										<Text style={styles.buttonText}>创建歌单</Text>
									</>
								)}
							</TouchableOpacity>
						</View>
					</View>

					<View style={styles.divider} />

					<View style={styles.section}>
						<Text style={styles.sectionTitle}>导入已有歌单</Text>
						<View style={styles.createPlaylistCard}>
							<View style={styles.importContainer}>
								<TextInput
									ref={urlInputRef}
									style={styles.input}
									value={playlistUrl}
									onChangeText={setPlaylistUrl}
									placeholder='🔗输入企鹅音乐歌单链接要有"id="字样'
									placeholderTextColor="#999"
									autoCapitalize="none"
									autoCorrect={false}
									keyboardType="url"
									returnKeyType="done"
									blurOnSubmit={true}
									onSubmitEditing={() => urlInputRef.current?.blur()}
									enablesReturnKeyAutomatically={true}
									clearButtonMode="while-editing"
								/>
							</View>

							<TouchableOpacity
								onPress={handleImport}
								activeOpacity={0.8}
								style={styles.button}
								disabled={isLoading}
							>
								{isLoading ? (
									<ActivityIndicator color="#fff" />
								) : (
									<>
										<Ionicons name="cloud-download-outline" size={24} color={colors.primary} />
										<Text style={styles.buttonText}>导入歌单</Text>
									</>
								)}
							</TouchableOpacity>
						</View>
					</View>

					{error && <Text style={styles.error}>{error}</Text>}
					{playlistData && (
						<Text style={styles.successText}>导入成功! 歌单名称: {playlistData.name}</Text>
					)}
				</ScrollView>
			</KeyboardAvoidingView>
		</SafeAreaView>
	)
}

const styles = StyleSheet.create({
	modalContainer: {
		...defaultStyles.container,
		paddingHorizontal: screenPadding.horizontal,
	},
	section: {
		marginBottom: 24,
	},
	sectionTitle: {
		fontSize: 20,
		fontWeight: '600',
		color: colors.text,
		marginBottom: 16,
	},
	divider: {
		height: 1,
		backgroundColor: 'rgba(255, 255, 255, 0.1)',
		marginVertical: 24,
	},
	buttonContainer: {
		marginTop: 0,
	},
	dismissSymbol: {
		position: 'absolute',
		left: 0,
		right: 0,
		flexDirection: 'row',
		justifyContent: 'center',
		zIndex: 1,
	},
	dismissBar: {
		width: 50,
		height: 5,
		borderRadius: 2.5,
		backgroundColor: '#c7c7cc',
	},
	inputContainer: {
		width: '100%',
	},
	inputLabel: {
		fontSize: 16,
		fontWeight: '600',
		color: colors.text,
		marginBottom: 8,
	},
	header: {
		fontSize: 31,
		fontWeight: 'bold',
		padding: 0,
		paddingTop: 5,
		marginBottom: 24,
		color: colors.text,
	},
	input: {
		height: 44,
		backgroundColor: '#2C2C2F',
		borderRadius: 8,
		paddingHorizontal: 16,
		fontSize: 16,
		color: '#fff',
		width: '100%',
	},
	coverContainer: {
		width: 100,
	},
	coverPicker: {
		width: 100,
		height: 100,
		borderRadius: 8,
		overflow: 'hidden',
		backgroundColor: '#2C2C2F',
		justifyContent: 'center',
		alignItems: 'center',
	},
	coverImage: {
		width: '100%',
		height: '100%',
		resizeMode: 'cover',
	},
	coverPlaceholder: {
		width: '100%',
		height: '100%',
		justifyContent: 'center',
		alignItems: 'center',
	},
	coverText: {
		color: colors.primary,
		marginTop: 8,
		fontSize: 14,
	},
	error: {
		color: '#ff3b30',
		marginTop: 10,
	},
	successText: {
		color: '#34c759',
		marginTop: 10,
	},
	button: {
		padding: 12,
		backgroundColor: '#2C2C2F',
		borderRadius: 8,
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		columnGap: 8,
		width: '100%',
	},
	buttonText: {
		...defaultStyles.text,
		color: colors.primary,
		fontWeight: '600',
		fontSize: 18,
		textAlign: 'center',
	},
	createPlaylistCard: {
		backgroundColor: '#1C1C1F',
		borderRadius: 12,
		padding: 16,
		gap: 16,
	},
	createPlaylistContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		columnGap: 16,
	},
	playlistInfoContainer: {
		flex: 1,
		height: 100,
		justifyContent: 'center',
	},
	importContainer: {
		width: '100%',
	},
})

export default ImportPlayList
