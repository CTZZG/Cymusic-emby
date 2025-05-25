import { colors } from '@/constants/tokens'
import { logInfo } from '@/helpers/logger'
import myTrackPlayer from '@/helpers/trackPlayerIndex'
import * as FileSystem from 'expo-file-system'
import { router } from 'expo-router'
import { useShareIntentContext } from 'expo-share-intent'
import React, { useState } from 'react'
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
interface ModuleExports {
	id?: string
	author?: string
	name?: string
	version?: string
	srcUrl?: string
	getMusicUrl?: (
		songname: string,
		artist: string,
		songmid: string,
		quality: string,
	) => Promise<string>
}
const ShareIntent = () => {
	const { hasShareIntent, shareIntent, error, resetShareIntent } = useShareIntentContext()
	const [importing, setImporting] = useState(false)
	logInfo('shareIntent', shareIntent)
	logInfo('hasShareIntent', hasShareIntent)
	logInfo('error', error)
	logInfo('shareIntent', shareIntent?.webUrl)
	const handleImport = async () => {
		if (!shareIntent?.files?.[0]) return

		setImporting(true)
		try {
			const file = shareIntent.files[0]
			const fileContents = await FileSystem.readAsStringAsync(file.path)

			// Save the file to your app's documents directory
			const documentsDir = FileSystem.documentDirectory
			const newPath = documentsDir + 'music-sources/' + file.fileName

			// Ensure directory exists
			await FileSystem.makeDirectoryAsync(documentsDir + 'music-sources/', { intermediates: true })
			await FileSystem.writeAsStringAsync(newPath, fileContents)
			logInfo('File contents:', fileContents)
			// 模拟 Node.js 的模块系统
			const module: { exports: ModuleExports } = { exports: {} }
			const require = () => {} // 如果文件中有其他 require 调用，你需要在这里实现
			const moduleFunc = new Function('module', 'exports', 'require', fileContents)
			moduleFunc(module, module.exports, require)
			// const url = await module.exports.getMusicUrl('朵', '赵雷', '004IArbh3ytHgR', '128k')
			// 从模块导出创建 MusicApi 对象
			const musicApi: IMusic.MusicApi = {
				id: module.exports.id || '',
				platform: 'tx', // 平台目前默认tx
				author: module.exports.author || '',
				name: module.exports.name || '',
				version: module.exports.version || '',
				srcUrl: module.exports.srcUrl || '',
				script: fileContents, //
				isSelected: false,
				getMusicUrl: module.exports.getMusicUrl,
			}

			myTrackPlayer.addMusicApi(musicApi)
			Alert.alert('导入成功', '音源文件已成功导入', [
				{ text: '确定', onPress: () => resetShareIntent() },
			])
		} catch (error) {
			Alert.alert('导入失败', '无法导入音源文件', [
				{
					text: '确定',
					onPress: () => {
						resetShareIntent() // 这个在 _layout.tsx 中 有定义
					},
				},
			])
		} finally {
			setImporting(false)
			router.replace('/') // Always navigate to home screen
		}
	}

	if (!shareIntent?.files?.length) {
		return (
			<SafeAreaView style={styles.container}>
				<Text style={styles.message}>没有可导入的文件</Text>
			</SafeAreaView>
		)
	}

	const file = shareIntent.files[0]

	return (
		<SafeAreaView style={styles.container}>
			<View style={styles.card}>
				<Text style={styles.title}>导入音源</Text>
				<Text style={styles.fileName}>{file.fileName}</Text>
				<Text style={styles.fileInfo}>大小: {(file.size / 1024).toFixed(1)} KB</Text>
				<View style={styles.buttonContainer}>
					<TouchableOpacity
						style={[styles.importButton, styles.importPrimary]}
						onPress={handleImport}
						disabled={importing}
					>
						<Text style={styles.importButtonText}>{importing ? '导入中...' : '导入'}</Text>
					</TouchableOpacity>
					<TouchableOpacity
						style={[styles.importButton, styles.cancelButton]}
						onPress={() => {
							resetShareIntent()
							router.replace('/')
						}}
						disabled={importing}
					>
						<Text style={[styles.importButtonText, styles.cancelButtonText]}>取消</Text>
					</TouchableOpacity>
				</View>
			</View>
		</SafeAreaView>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: colors.background,
		padding: 16,
	},
	card: {
		backgroundColor: colors.background,
		borderRadius: 10,
		padding: 16,
		marginTop: 16,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 8,
	},
	title: {
		fontSize: 20,
		fontWeight: '600',
		color: colors.text,
		marginBottom: 16,
	},
	fileName: {
		fontSize: 16,
		color: colors.text,
		marginBottom: 8,
	},
	fileInfo: {
		fontSize: 14,
		color: colors.text,
		marginBottom: 24,
	},
	importButton: {
		backgroundColor: colors.primary,
		padding: 16,
		borderRadius: 8,
		alignItems: 'center',
	},
	importButtonText: {
		color: '#FFFFFF',
		fontSize: 16,
		fontWeight: '600',
	},
	message: {
		color: colors.text,
		fontSize: 16,
		textAlign: 'center',
	},
	buttonContainer: {
		flexDirection: 'row',
		gap: 10,
	},
	importPrimary: {
		flex: 1,
	},
	cancelButton: {
		flex: 1,
		backgroundColor: 'transparent',
		borderWidth: 1,
		borderColor: colors.primary,
	},
	cancelButtonText: {
		color: colors.primary,
	},
})

export default ShareIntent
