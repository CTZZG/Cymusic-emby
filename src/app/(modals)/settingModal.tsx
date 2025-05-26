// src/app/modals/settingModal.tsx
import { colors } from '@/constants/tokens'
import { logError, logInfo } from '@/helpers/logger'
import myTrackPlayer, {
	autoCacheLocalStore,
	isCachedIconVisibleStore,
	musicApiSelectedStore,
	musicApiStore,
	nowApiState,
	songsNumsToLoadStore,
	useCurrentQuality,
} from '@/helpers/trackPlayerIndex'
import PersistStatus from '@/store/PersistStatus'

import i18n, { changeLanguage, nowLanguage } from '@/utils/i18n'
import { GlobalState } from '@/utils/stateMapper'
import { showToast } from '@/utils/utils'
import { MenuView } from '@react-native-menu/menu'
import { Buffer } from 'buffer'
import Constants from 'expo-constants'
import * as DocumentPicker from 'expo-document-picker'
import { useRouter } from 'expo-router'
import React, { useEffect, useState } from 'react'
import {
	ActivityIndicator,
	Alert,
	Image,
	Linking,
	ScrollView,
	StyleSheet,
	Switch,
	Text,
	TouchableOpacity,
	View
} from 'react-native'
import RNFS from 'react-native-fs'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message'
const QUALITY_OPTIONS = ['128k', '320k', 'flac']
const CURRENT_VERSION = Constants.expoConfig?.version ?? '未知版本'

// 将GlobalState实例移到组件外部
const cooldownStore = new GlobalState<number>(0) // 冷却时间（秒）
const sourceStatusStore = new GlobalState<
	Record<string, { status: string; error?: string; url?: string }>
>({}) // 音源状态存储

// eslint-disable-next-line react/prop-types
const MusicQualityMenu = ({ currentQuality, onSelectQuality }) => {
	const handlePressAction = async (id: string) => {
		if (QUALITY_OPTIONS.includes(id)) {
			onSelectQuality(id)
		}
	}

	return (
		<MenuView
			onPressAction={({ nativeEvent: { event } }) => handlePressAction(event)}
			actions={QUALITY_OPTIONS.map((quality) => ({
				id: quality,
				title: quality,
				state: currentQuality === quality ? 'on' : 'off',
			}))}
		>
			<TouchableOpacity style={styles.menuTrigger}>
				<Text style={styles.menuTriggerText}>{currentQuality}</Text>
			</TouchableOpacity>
		</MenuView>
	)
}
// eslint-disable-next-line react/prop-types
const MusicSourceMenu = ({ isDelete, onSelectSource }) => {
	const [sources, setSources] = useState([])
	const [isLoading, setIsLoading] = useState(false) // 测试状态
	const cooldown = cooldownStore.useValue() // 使用useValue获取当前值
	const sourceStatus = sourceStatusStore.useValue() // 使用GlobalState获取音源状态
	const selectedApi = musicApiSelectedStore.useValue()
	const musicApis = musicApiStore.useValue()

	useEffect(() => {
		if (musicApis && Array.isArray(musicApis)) {
			setSources(
				musicApis.map((api) => ({
					id: api.id,
					title: api.name,
				})),
			)
		} else {
			setSources([]) // 如果 musicApis 不是有效数组，设置为空数组
		}
	}, [musicApis])
	useEffect(() => {
		cooldownStore.setValue(0)
	}, [])
	// 处理倒计时
	useEffect(() => {
		let timer
		if (cooldown > 0) {
			timer = setTimeout(() => {
				cooldownStore.setValue(cooldown - 1)
			}, 1000)
		}
		return () => clearTimeout(timer)
	}, [cooldown])

	// 测试单个音源是否可用
	const testMusicSource = async (musicApi) => {
		try {
			logInfo(`开始测试音源: ${musicApi.name}, ID: ${musicApi.id}`)

			// 检查musicApi.getMusicUrl是否存在且为函数
			if (typeof musicApi.getMusicUrl !== 'function') {
				logError(`音源 ${musicApi.name} 的 getMusicUrl 不是函数或不存在`, musicApi)
				return { status: '异常', error: 'getMusicUrl 方法不可用' }
			}

			// 设置超时
			const timeoutPromise = new Promise((_, reject) => {
				setTimeout(() => reject(new Error('请求超时')), 5000)
			})
			logInfo(
				`测试音源详情:`,
				JSON.stringify({
					name: musicApi.name,
					id: musicApi.id,
					author: musicApi.author,
					version: musicApi.version,
				}),
			)

			// 尝试获取测试歌曲URL
			// 这里使用了固定的测试歌曲信息，可以根据实际需求修改
			const testTitle = '稻香'
			const testArtist = '周杰伦'
			const testId = '004IArbh3ytHgR'

			logInfo(`测试歌曲信息: ${testTitle} - ${testArtist}, ID: ${testId}`)

			// 按音质降级尝试
			const qualityOrder = ['128k']

			for (const quality of qualityOrder) {
				try {
					logInfo(`尝试获取音源 ${musicApi.name} 的 ${quality} 音质`)

					// 记录函数调用前的参数
					logInfo(
						`调用 getMusicUrl 参数: title=${testTitle}, artist=${testArtist}, id=${testId}, quality=${quality}`,
					)

					const resp_url = await Promise.race([
						musicApi.getMusicUrl(testTitle, testArtist, testId, quality),
						timeoutPromise,
					])

					// 记录返回值
					logInfo(`音源 ${musicApi.name} 返回结果: ${resp_url}`)

					if (resp_url && resp_url !== '') {
						// 找到可用音源
						logInfo(`音源 ${musicApi.name} 测试成功，音质: ${quality}, URL: ${resp_url}`)
						return { status: '正常', url: resp_url }
					} else {
						logInfo(`音源 ${musicApi.name} 返回空URL，音质: ${quality}`)
					}
				} catch (err) {
					// 继续尝试下一个音质
					logError(`测试音源 ${musicApi.name} ${quality} 音质失败:`, err)
					logInfo(`错误详情: ${err.message || '未知错误'}`)
					// 尝试打印错误堆栈
					if (err.stack) {
						logInfo(`错误堆栈: ${err.stack}`)
					}
				}
			}

			// 所有音质都尝试失败
			logInfo(`音源 ${musicApi.name} 所有音质测试均失败`)
			return { status: '异常', error: '无法获取音乐URL' }
		} catch (error) {
			logError(`测试音源 ${musicApi?.name || '未知'} 时发生异常:`, error)
			if (error.stack) {
				logInfo(`异常错误堆栈: ${error.stack}`)
			}
			return {
				status: '异常',
				error: error.message === '请求超时' ? '请求超时' : error.message || '未知错误',
			}
		}
	}

	// 测试所有音源状态
	const testAllSources = async () => {
		if (!musicApis || !Array.isArray(musicApis) || musicApis.length === 0) {
			logInfo('没有可用的音源可测试')
			return
		}

		logInfo(`开始测试所有音源，共 ${musicApis.length} 个`)
		setIsLoading(true)
		const statusResults = { ...sourceStatus } // 复制当前状态作为基础

		for (const api of musicApis) {
			logInfo(`开始测试音源: ${api.name}`)
			statusResults[api.id] = { status: '测试中...' }
			sourceStatusStore.setValue({ ...statusResults }) // 更新到GlobalState
			const reloadedApi = myTrackPlayer.reloadMusicApi(api, true)
			const result = await testMusicSource(reloadedApi)
			statusResults[api.id] = result
			sourceStatusStore.setValue({ ...statusResults }) // 更新到GlobalState
			logInfo(`音源 ${api.name} 测试结果: ${result.status}`)
		}

		logInfo('所有音源测试完成')
		// 设置60秒冷却时间
		cooldownStore.setValue(60)
		setIsLoading(false)
	}

	const handlePressAction = async (id: string) => {
		// 如果点击的是测试音源按钮，则不关闭菜单并触发测试
		if (id === 'test_sources') {
			// 如果在冷却中，不执行操作
			if (cooldown > 0) return
			testAllSources()
			return
		}
		// 否则执行正常的音源选择逻辑
		onSelectSource(id)
	}

	// 获取状态对应的图标/文本
	const getStatusIndicator = (sourceId) => {
		if (!sourceStatus[sourceId]) {
			return ''
		}

		switch (sourceStatus[sourceId].status) {
			case '正常':
				return ' ✅'
			case '异常':
				return ' ❌'
			case '测试中...':
				return ' 🔄'
			default:
				return ''
		}
	}

	// 格式化倒计时显示
	const formatCooldown = () => {
		const minutes = Math.floor(cooldown / 60)
		const seconds = cooldown % 60
		return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`
	}

	// 创建音源列表actions
	const sourceActions = sources.map((source) => ({
		id: source.id,
		title: isDelete
			? `${i18n.t('settings.actions.delete.delete')} ${source.title}`
			: `${source.title}${getStatusIndicator(source.id)}`,
		state: isDelete ? 'off' : selectedApi && selectedApi.id === source.id ? 'on' : 'off',
		attributes: isDelete ? { destructive: true, disabled: false } : undefined,
	}))

	// 添加测试音源的按钮（仅在非删除模式下）
	if (!isDelete) {
		sourceActions.push({
			id: 'test_sources',
			title: isLoading
				? '测试中...'
				: cooldown > 0
					? `请勿频繁测试 ${formatCooldown()} `
					: i18n.t('settings.items.testSources') || '测试所有音源',
			attributes: cooldown > 0 || isLoading ? { destructive: false, disabled: true } : undefined,
			state: 'off',
		})
	}

	return (
		<MenuView
			onPressAction={({ nativeEvent: { event } }) => handlePressAction(event)}
			actions={sourceActions as any}
		>
			<TouchableOpacity style={[styles.menuTrigger]}>
				<Text style={[styles.menuTriggerText]}>
					{isDelete
						? i18n.t('settings.actions.delete.selectDelete')
						: selectedApi
							? `${selectedApi.name}`
							: i18n.t('settings.items.selectSource')}
				</Text>
			</TouchableOpacity>
		</MenuView>
	)
}

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
const importMusicSourceFromUrl = async () => {
	Alert.prompt(
		'导入音源',
		'请输入音源 URL',
		[
			{
				text: '取消',
				onPress: () => logInfo('取消导入'),
				style: 'cancel',
			},
			{
				text: '确定',
				onPress: async (url) => {
					if (!url) {
						Alert.alert('错误', 'URL 不能为空')
						return
					}

					try {
						const response = await fetch(url)
						if (!response.ok) {
							throw new Error(`HTTP error! status: ${response.status}`)
						}
						const sourceCode = await response.text()
						const utf8SourceCode = Buffer.from(sourceCode, 'utf8').toString('utf8')

						logInfo('获取到的源代码:', utf8SourceCode)

						// 这里需要添加处理源代码的逻辑，类似于 importMusicSourceFromFile 中的逻辑
						// 例如：解析源代码，创建 MusicApi 对象，并添加到 myTrackPlayer
						// 1. 创建模拟的 CommonJS 模块对象
						const module: { exports: ModuleExports } = { exports: {} }

						// 2. 创建模拟的 require 函数
						const require = () => {} // 如果文件中有其他 require 调用，需要在这里实现

						// 3. 将外部 JS 代码作为函数体执行
						const moduleFunc = new Function('module', 'exports', 'require', utf8SourceCode)

						// 4. 执行函数，填充 module.exports
						moduleFunc(module, module.exports, require)
						// const url = await module.exports.getMusicUrl('朵', '赵雷', '004IArbh3ytHgR', '128k')
						// logInfo(url + '123123')
						// 从模块导出创建 MusicApi 对象
						const musicApi: IMusic.MusicApi = {
							id: module.exports.id || '',
							platform: 'tx', // 平台目前默认tx
							author: module.exports.author || '',
							name: module.exports.name || '',
							version: module.exports.version || '',
							srcUrl: module.exports.srcUrl || '',
							script: utf8SourceCode, //
							isSelected: false,
							getMusicUrl: module.exports.getMusicUrl,
						}

						myTrackPlayer.addMusicApi(musicApi)
						return
					} catch (error) {
						logError('导入音源失败:', error)
						Alert.alert('错误', '导入音源失败，请检查 URL 是否正确')
					}
				},
			},
		],
		'plain-text',
	)
}
const importMusicSourceFromFile = async () => {
	try {
		const result = await DocumentPicker.getDocumentAsync({
			type: 'text/javascript',
			copyToCacheDirectory: false,
		})

		if (result.canceled === true) {
			logInfo('User canceled document picker')
			return
		}

		// logInfo('File selected:', result.assets[0].uri)
		const fileUri = decodeURIComponent(result.assets[0].uri)
		const fileContents = await RNFS.readFile(fileUri, 'utf8')
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
		return
	} catch (err) {
		logError('Error importing music source:', err)
		Alert.alert('导入失败', '无法导入音源，请查看日志，确保文件格式正确并稍后再试。')
		logError('导入音源失败' + err)
	}
}
const SettingModal = () => {
	const router = useRouter()
	const [currentQuality, setCurrentQuality] = useCurrentQuality()
	const [isQualitySelectorVisible, setIsQualitySelectorVisible] = useState(false)
	const [isLoading, setIsLoading] = useState(false)
	const apiState = nowApiState.useValue()
	const language = nowLanguage.useValue()
	const autoCacheLocal = autoCacheLocalStore.useValue()
	const isCachedIconVisible = isCachedIconVisibleStore.useValue()
	const songsNumsToLoad = songsNumsToLoadStore.useValue()



	const settingsData = [
		{
			title: i18n.t('settings.sections.appInfo'),
			data: [
				{ id: '1', title: 'CyMusic', type: 'link', icon: require('@/assets/144.png') },
				{ id: '2', title: i18n.t('settings.items.version'), type: 'value', value: CURRENT_VERSION },
				{ id: '3', title: i18n.t('settings.items.checkUpdate'), type: 'value' },
				{ id: '5', title: i18n.t('settings.items.projectLink'), type: 'value', value: '' },
				{ id: '9', title: i18n.t('settings.items.clearCache'), type: 'value', value: '' },
				{ id: '13', title: i18n.t('settings.items.viewLogs'), type: 'link' },
				{
					id: '15',
					title: i18n.t('settings.items.changeLanguage'),
					type: 'value',
					value: '',
				},
				{ id: '16', title: i18n.t('settings.items.isCachedIconVisible'), type: 'value', value: '' },
				{
					id: '17',
					title: i18n.t('settings.items.songsNumsToLoad'),
					type: 'value',
					value: '',
				},
			],
		},
		{
			title: i18n.t('settings.sections.audioSettings'),
			data: [
				{ id: '6', title: i18n.t('settings.items.clearPlaylist'), type: 'link' },
				{
					id: '14',
					title: i18n.t('settings.items.autoCacheLocal'),
					type: 'value',
				},
			],
		},
		{
			title: i18n.t('settings.sections.customSource'),
			data: [
				{ id: '11', title: i18n.t('settings.items.switchSource'), type: 'custom' },
				{
					id: '7',
					title: i18n.t('settings.items.sourceStatus'),
					type: 'value',
					value:
						apiState == '正常'
							? i18n.t('settings.items.normal')
							: i18n.t('settings.items.exception'),
				},
				{ id: '12', title: i18n.t('settings.items.deleteSource'), type: 'value', value: '' },
				{ id: '8', title: i18n.t('settings.items.importSource'), type: 'value' },
			],
		},
		{
			title: i18n.t('settings.sections.qualitySelection'),
			data: [{ id: '10', title: i18n.t('settings.items.currentQuality'), type: 'value' }],
		},
		{
			title: '插件管理',
			data: [
				{
					id: 'plugin_manager',
					title: '插件管理',
					type: 'link',
					value: '管理音源插件'
				},
			],
		},
	]
	const importMusicSourceMenu = (
		<MenuView
			onPressAction={({ nativeEvent: { event } }) => {
				switch (event) {
					case 'file':
						importMusicSourceFromFile()
						break
					case 'url':
						importMusicSourceFromUrl()
						break
				}
			}}
			actions={[
				{ id: 'file', title: i18n.t('settings.actions.import.fromFile') },
				{ id: 'url', title: i18n.t('settings.actions.import.fromUrl') },
			]}
		>
			<TouchableOpacity style={styles.menuTrigger}>
				<Text style={styles.menuTriggerText}>{i18n.t('settings.actions.import.title')}</Text>
			</TouchableOpacity>
		</MenuView>
	)
	const toggleAutoCacheLocalMenu = (
		<MenuView
			onPressAction={({ nativeEvent: { event } }) => {
				switch (event) {
					case 'on':
						myTrackPlayer.toggleAutoCacheLocal(true)
						break
					case 'off':
						myTrackPlayer.toggleAutoCacheLocal(false)
						break
				}
			}}
			actions={[
				{ id: 'on', title: i18n.t('settings.actions.autoCacheLocal.yes') },
				{ id: 'off', title: i18n.t('settings.actions.autoCacheLocal.no') },
			]}
		>
			<TouchableOpacity style={styles.menuTrigger}>
				<Text style={styles.menuTriggerText}>
					{/* 此处加空格为了增大点击区域 */}
					{autoCacheLocal == true
						? '             ' + i18n.t('settings.actions.autoCacheLocal.yes')
						: '             ' + i18n.t('settings.actions.autoCacheLocal.no')}
				</Text>
			</TouchableOpacity>
		</MenuView>
	)
	const toggleIsCachedIconVisibleMenu = (
		<MenuView
			onPressAction={({ nativeEvent: { event } }) => {
				switch (event) {
					case 'on':
						myTrackPlayer.toggleIsCachedIconVisible(true)
						break
					case 'off':
						myTrackPlayer.toggleIsCachedIconVisible(false)
						break
				}
			}}
			actions={[
				{ id: 'on', title: i18n.t('settings.actions.isCachedIconVisible.yes') },
				{ id: 'off', title: i18n.t('settings.actions.isCachedIconVisible.no') },
			]}
		>
			<TouchableOpacity style={styles.menuTrigger}>
				<Text style={styles.menuTriggerText}>
					{/* 此处加空格为了增大点击区域 */}
					{isCachedIconVisible == true
						? '             ' + i18n.t('settings.actions.isCachedIconVisible.yes')
						: '             ' + i18n.t('settings.actions.isCachedIconVisible.no')}
				</Text>
			</TouchableOpacity>
		</MenuView>
	)
	const toggleSongsNumsToLoadMenu = (
		<MenuView
			onPressAction={({ nativeEvent: { event } }) => {
				PersistStatus.set('music.songsNumsToLoad', parseInt(event))
				songsNumsToLoadStore.setValue(parseInt(event))
			}}
			actions={[
				{ id: '100', title: '100' },
				{ id: '200', title: '200' },
				{ id: '300', title: '300' },
			]}
		>
			<TouchableOpacity style={styles.menuTrigger}>
				<Text style={styles.menuTriggerText}>{'             ' + songsNumsToLoad}</Text>
			</TouchableOpacity>
		</MenuView>
	)
	const DismissPlayerSymbol = () => {
		const { top } = useSafeAreaInsets()
		return (
			<View style={[styles.dismissSymbol, { top: top - 25 }]}>
				<View style={styles.dismissBar} />
			</View>
		)
	}
	const handleClearCache = async () => {
		try {
			await myTrackPlayer.clearCache()
			Alert.alert(
				i18n.t('settings.actions.cache.success'),
				i18n.t('settings.actions.cache.successMessage'),
			)
		} catch (error) {
			Alert.alert(
				i18n.t('settings.actions.cache.error'),
				i18n.t('settings.actions.cache.errorMessage'),
			)
			console.error(error)
		}
	}
	const handleSelectSource = (sourceId) => {
		myTrackPlayer.setMusicApiAsSelectedById(sourceId)
	}
	const changeLanguageMenu = (
		<MenuView
			onPressAction={({ nativeEvent: { event } }) => {
				switch (event) {
					case 'zh':
						changeLanguage('zh')
						break
					case 'en':
						changeLanguage('en')
						break
				}
			}}
			actions={[
				{ id: 'zh', title: '中文' },
				{ id: 'en', title: 'English' },
			]}
		>
			<TouchableOpacity style={styles.menuTrigger}>
				<Text style={styles.menuTriggerText}>{language == 'zh' ? '中文' : 'English'}</Text>
			</TouchableOpacity>
		</MenuView>
	)

	const handleDeleteSource = (sourceId) => {
		myTrackPlayer.deleteMusicApiById(sourceId)
	}
	const checkForUpdates = async () => {
		setIsLoading(true)
		const timeoutPromise = new Promise((_, reject) =>
			setTimeout(() => reject(new Error('请求超时')), 10000),
		)
		try {
			const result = await Promise.race([
				fetch('https://api.github.com/repos/gyc-12/Cymusic/releases/latest'),
				timeoutPromise,
			])
			if (!(result instanceof Response)) {
				throw new Error('非预期的结果类型')
			}

			if (!result.ok) {
				throw new Error(`HTTP error! status: ${result.status}`)
			}
			const data = await result.json()
			const latestVersion = data.tag_name
			logInfo(CURRENT_VERSION + 'CURRENT_VERSIONCURRENT_VERSION' + latestVersion)

			if (latestVersion !== CURRENT_VERSION) {
				Alert.alert(
					i18n.t('settings.actions.checkUpdate.available'),
					`${i18n.t('settings.actions.checkUpdate.message')} ${latestVersion}`,
					[
						{
							text: i18n.t('settings.actions.checkUpdate.ok'),
							onPress: () => Linking.openURL(data.html_url),
						},
						{
							text: i18n.t('settings.actions.checkUpdate.cancel'),
							onPress: () => {},
							style: 'cancel',
						},
					],
				)
			} else {
				Alert.alert(
					i18n.t('settings.actions.checkUpdate.notAvailable'),
					i18n.t('settings.actions.checkUpdate.notAvailableMessage'),
				)
			}
		} catch (error) {
			logError(i18n.t('settings.actions.checkUpdate.error'), error)
			Alert.alert(
				i18n.t('settings.actions.checkUpdate.error'),
				i18n.t('settings.actions.checkUpdate.errorMessage'),
			)
		} finally {
			setIsLoading(false)
		}
	}

	const renderItem = (item, index, sectionData) => (
		<View key={item.id}>
			<TouchableOpacity
				key={item.id}
				style={[
					styles.item,
					index === 0 && styles.firstItem,
					index === sectionData.length - 1 && styles.lastItem,
				]}
				onPress={() => {
					if (item.title === i18n.t('settings.items.viewLogs')) {
						router.push('/(modals)/logScreen')
					}
					if (item.title === i18n.t('settings.items.projectLink')) {
						Linking.openURL('https://github.com/gyc-12/Cymusic').catch((err) =>
							logError("Couldn't load page", err),
						)
					} else if (item.title === i18n.t('settings.items.currentQuality')) {
						setIsQualitySelectorVisible(true)
					} else if (item.id === 'plugin_manager') {
						router.push('/(modals)/pluginManager')
					} else if (item.type === 'link') {
						if (item.title === i18n.t('settings.items.clearPlaylist')) {
							Alert.alert(
								i18n.t('settings.actions.clearPlaylist.title'),
								i18n.t('settings.actions.clearPlaylist.message'),
								[
									{ text: i18n.t('settings.actions.clearPlaylist.cancel'), style: 'cancel' },
									{
										text: i18n.t('settings.actions.clearPlaylist.confirm'),
										onPress: () => myTrackPlayer.clearToBePlayed(),
									},
								],
							)
						} else if (item.title === i18n.t('settings.items.importSource')) {
							// importMusicSourceFromFile()
						} else if (item.title === 'CyMusic') {
							showToast('CyMusic', 'success')
						}
						// logInfo(`Navigate to ${item.title}`)
					} else if (item.title === i18n.t('settings.items.checkUpdate')) {
						checkForUpdates()
					} else if (item.title === i18n.t('settings.items.clearCache')) {
						handleClearCache()
					}
				}}
			>
				{item.icon && <Image source={item.icon} style={styles.icon} />}
				<View style={styles.itemContent}>
					<Text style={styles.itemText}>{item.title}</Text>
					{item.type === 'switch' && (
						<Switch
							value={item.value}
							onValueChange={(newValue) => {
								logInfo(`${item.title} switched to ${newValue}`)
							}}
						/>
					)}
					{item.type === 'value' && <Text style={styles.itemValue}>{item.value}</Text>}
					{item.title === i18n.t('settings.items.currentQuality') && (
						<MusicQualityMenu currentQuality={currentQuality} onSelectQuality={setCurrentQuality} />
					)}
					{item.title === i18n.t('settings.items.switchSource') && (
						<MusicSourceMenu isDelete={false} onSelectSource={handleSelectSource} />
					)}
					{item.title === i18n.t('settings.items.deleteSource') && (
						<MusicSourceMenu isDelete={true} onSelectSource={handleDeleteSource} />
					)}
					{item.title === i18n.t('settings.items.importSource') && importMusicSourceMenu}
					{(item.type === 'link' || item.title === i18n.t('settings.items.projectLink')) &&
						!item.icon && <Text style={styles.arrowRight}>{'>'}</Text>}
					{item.title === i18n.t('settings.items.autoCacheLocal') && toggleAutoCacheLocalMenu}
					{item.title === i18n.t('settings.items.changeLanguage') && changeLanguageMenu}
					{item.title === i18n.t('settings.items.isCachedIconVisible') &&
						toggleIsCachedIconVisibleMenu}
					{item.title === i18n.t('settings.items.songsNumsToLoad') && toggleSongsNumsToLoadMenu}
				</View>
			</TouchableOpacity>
			{index !== sectionData.length - 1 && <View style={styles.separator} />}
		</View>
	)
	const GlobalLoading = () => (
		<View style={styles.loadingOverlay}>
			<ActivityIndicator size="large" color={colors.loading} />
		</View>
	)
	/*
  1. Create the config
*/
	const toastConfig = {
		/*
	  Overwrite 'success' type,
	  by modifying the existing `BaseToast` component
	*/
		success: (props) => (
			<BaseToast
				{...props}
				style={{ borderLeftColor: 'rgb(252,87,59)', backgroundColor: 'rgb(251,231,227)' }}
				contentContainerStyle={{ paddingHorizontal: 15 }}
				text1Style={{
					fontSize: 15,
					fontWeight: '400',
					color: 'rgb(252,87,59)',
				}}
			/>
		),
		/*
	  Overwrite 'error' type,
	  by modifying the existing `ErrorToast` component
	*/
		error: (props) => (
			<ErrorToast
				{...props}
				style={{ borderLeftColor: 'rgb(252,87,59)', backgroundColor: 'rgb(251,231,227)' }}
				contentContainerStyle={{ paddingHorizontal: 15 }}
				text1Style={{
					fontSize: 15,
					fontWeight: '400',
					color: 'rgb(252,87,59)',
				}}
			/>
		),
		/*
	  Or create a completely new type - `tomatoToast`,
	  building the layout from scratch.

	  I can consume any custom `props` I want.
	  They will be passed when calling the `show` method (see below)
	*/
	}



	return (
		<View style={styles.container}>
			<DismissPlayerSymbol />
			<Text style={styles.header}>{i18n.t('settings.title')}</Text>
			<ScrollView style={styles.scrollView}>
				{settingsData.map((section, index) => (
					<View key={index} style={styles.section}>
						<Text style={styles.sectionTitle}>{section.title}</Text>
						<View style={styles.sectionContent}>{section.data.map(renderItem)}</View>
					</View>
				))}
			</ScrollView>
			{isLoading && <GlobalLoading />}
			<Toast config={toastConfig} />
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: colors.background,
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
		height: 8,
		borderRadius: 8,
		backgroundColor: '#fff',
		opacity: 0.7,
	},
	header: {
		fontSize: 34,
		fontWeight: 'bold',
		padding: 20,
		paddingTop: 50,
		color: colors.text,
	},
	scrollView: {
		flex: 1,
	},
	section: {
		marginBottom: 20,
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: colors.text,
		marginLeft: 20,
		marginBottom: 5,
	},
	item: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 16,
		// 移除 borderBottomWidth 和 borderBottomColor
	},
	firstItem: {
		borderBottomWidth: 0,
	},
	lastItem: {
		borderBottomWidth: 0, // 确保最后一项没有底部边框
	},
	separator: {
		left: 16,
		right: 16,
		height: 1,
		backgroundColor: colors.maximumTrackTintColor,
	},
	sectionContent: {
		backgroundColor: 'rgb(32,32,32)',
		borderRadius: 10,
		marginHorizontal: 16,
		overflow: 'hidden', // 确保圆角不被分隔线覆盖
	},
	icon: {
		width: 30,
		height: 30,
		marginRight: 10,
		borderRadius: 6,
	},
	itemContent: {
		flex: 1,
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	itemText: {
		fontSize: 16,
		color: colors.text,
	},
	itemValue: {
		fontSize: 16,
		color: colors.textMuted,
	},
	arrowRight: {
		fontSize: 18,
		color: colors.textMuted,
	},
	menuTrigger: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	menuTriggerText: {
		fontSize: 16,
		color: colors.textMuted,
	},
	loadingOverlay: {
		position: 'absolute',
		left: 0,
		right: 0,
		top: 0,
		bottom: 0,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
	},

})

export default SettingModal
