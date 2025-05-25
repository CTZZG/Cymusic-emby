import { b64DecodeUnicode, decodeName } from '@/components/utils'
import { headers } from '@/components/utils/musicSdk/options.js'
import { formatSingerName } from '@/components/utils/musicSdk/utils'
import { httpFetch } from '@/components/utils/request'
import { fakeAudioMp3Uri } from '@/constants/images'
import { getSingerInfo } from '@/helpers/userApi/qq-music-api'
import axios from 'axios'
import { Alert } from 'react-native'
import { logError, logInfo } from '../logger'
const { DEV_URL_PREFIX, KW_URL } = {
	DEV_URL_PREFIX: 'https://dev.music.ximalaya.com/api/v1/track/url',
	KW_URL: 'https://www.kuwo.cn/api/v1/www/music/playUrl',
}

const withTimeout = (promise, ms) => {
	const timeout = new Promise((_, reject) =>
		setTimeout(() => reject(new Error('Request timed out')), ms),
	)
	return Promise.race([promise, timeout])
}

const fetchWithTimeout = (url, options, timeout = 5000) => {
	logInfo('----start----' + url)
	return new Promise((resolve, reject) => {
		const timer = setTimeout(() => {
			reject(new Error('Request timed out'))
		}, timeout)

		fetch(url, options)
			.then((response) => {
				clearTimeout(timer)
				resolve(response)
			})
			.catch((error) => {
				clearTimeout(timer)
				reject(error)
			})
	})
}

const handleBackupFetch = async (songInfo, options, type, fakeAudioMp3Uri) => {
	// return fetchWithTimeout(backupUrl, options, 5000)
	//   .then((backupResponse) => parseResponse(backupResponse))
	//   .then((backupBody) => {
	//     if (!backupBody || !backupBody.data || !backupBody.data.src) {
	//       logInfo('Backup fetch failed or no song_url in response');
	//       return { type, url: fakeAudioMp3Uri };
	//     }
	//     logInfo('Backup fetch success:', backupBody.data.src);
	//     return { type, url: backupBody.data.src };
	//   })
	//   .catch((backupError) => {
	//     logInfo('Backup fetch error:', backupError);
	//
	//     return { type, url: fakeAudioMp3Uri };
	//   });
	try {
		const url = await getMusicFromKw(songInfo, type)
		return { type, url: url }
	} catch (error) {
		logInfo('Backup fetch error:', error)
		Alert.alert('错误', '获取音乐失败，请稍后重试。', [
			{ text: '确定', onPress: () => logInfo('Alert closed') },
		])
		return { type, url: fakeAudioMp3Uri }
	}
}

export const myGetMusicUrl = (songInfo, type) => {
	const url = `${DEV_URL_PREFIX}${songInfo.id}/${type}`
	// const backupUrl = `${BACKUP_URL_PREFIX}${encodeURIComponent(songInfo.title)}&&n=1`;

	const options = {
		method: 'GET',
		headers: headers, // Define your headers object
		family: 4,
		credentials: 'include', // withCredentials: true equivalent in fetch
	}

	return handleBackupFetch(songInfo, options, type, fakeAudioMp3Uri)
		.then((result) => {
			if (result) {
				logInfo('获取成功（kw）：' + result.url)
				return result
			}
			logInfo('kw获取失败，尝试原始 URL')
			return fetchWithTimeout(url, options, 5000)
				.then((response) => parseResponse(response))
				.then((body) => {
					if (!body.data || (typeof body.data === 'string' && body.data.includes('error'))) {
						logInfo('Fetch 失败，返回错误')
						return null
					}
					logInfo('获取成功（原始）：' + body.data)
					return body.code === 0 ? { type, url: body.data } : null
				})
		})
		.catch((error) => {
			logInfo('获取失败:', error)
			Alert.alert('错误', '获取音乐失败，请稍后重试。', [
				{ text: '确定', onPress: () => logInfo('Alert closed') },
			])
			return null
		})
}

const parseResponse = async (response) => {
	try {
		return await response.json()
	} catch (e) {
		try {
			if (response.status == 404) {
				return '404'
			}
			return await response.text()
		} catch (e) {
			logInfo('Failed to parse response')
		}
	}
}

export const myGetLyric = async (musicItem) => {
	try {
		const requestObj = httpFetch(
			`https://c.y.qq.com/lyric/fcgi-bin/fcg_query_lyric_new.fcg?songmid=${musicItem.id}&g_tk=5381&loginUin=0&hostUin=0&format=json&inCharset=utf8&outCharset=utf-8&platform=yqq`,
			{
				headers: {
					Referer: 'https://y.qq.com/portal/player.html',
				},
			},
		)

		const { body } = await requestObj.promise
		if (body.code !== 0 || !body.lyric) {
			throw new Error('Get lyric failed')
		}

		return {
			lyric: decodeName(b64DecodeUnicode(body.lyric)),
			tlyric: decodeName(b64DecodeUnicode(body.trans)),
		}
	} catch (error) {
		logError('Error fetching lyrics:', error)
		return {
			lyric: '[00:00.00]暂无歌词',
			tlyric: '',
		}
	}
}

export async function getTopListDetail(topListItem) {
	let _a
	const res = await fetch(
		`https://u.y.qq.com/cgi-bin/musicu.fcg?g_tk=5381&data=%7B%22detail%22%3A%7B%22module%22%3A%22musicToplist.ToplistInfoServer%22%2C%22method%22%3A%22GetDetail%22%2C%22param%22%3A%7B%22topId%22%3A${topListItem.id}%2C%22offset%22%3A0%2C%22num%22%3A100%2C%22period%22%3A%22${(_a = topListItem.period) !== null && _a !== void 0 ? _a : ''}%22%7D%7D%2C%22comm%22%3A%7B%22ct%22%3A24%2C%22cv%22%3A0%7D%7D`,
		{
			method: 'GET',
			headers: {
				Cookie: 'uin=',
			},
			credentials: 'include',
		},
	).then((res) => res.json())

	return {
		...topListItem,
		musicList: res.detail.data.songInfoList.map(formatMusicItem),
	}
}

function formatMusicItem(_) {
	let _a, _b, _c
	const albumid = _.albumid || ((_a = _.album) === null || _a === void 0 ? void 0 : _a.id)
	const albummid = _.albummid || ((_b = _.album) === null || _b === void 0 ? void 0 : _b.mid)
	const albumname = _.albumname || ((_c = _.album) === null || _c === void 0 ? void 0 : _c.title)
	let artwork = ''
	// 处理 artwork
	if (_.album.name === '' || _.album.name === '空') {
		// 如果专辑名为空或'空'
		if (_.singer && _.singer.length > 0) {
			// 如果有歌手，使用第一个歌手的图片
			artwork = `https://y.gtimg.cn/music/photo_new/T001R500x500M000${_.singer[0].mid}.jpg`
		} else {
			// 如果没有歌手，artwork 保持为空字符串
			artwork = ''
		}
	} else {
		// 如果专辑名不为空，使用专辑图片
		artwork = `https://y.gtimg.cn/music/photo_new/T002R500x500M000${_.album.mid}.jpg`
	}
	return {
		id: _.mid || _.songid,
		songmid: _.id || _.songmid,
		title: _.title || _.songname,
		artist: _.singer.map((s) => s.name).join(', '),
		artwork: artwork ? artwork : undefined,
		album: albumname,
		lrc: _.lyric || undefined,
		albumid: albumid,
		albummid: albummid,
		url: 'Unknown',
	}
}
function formatMusicItemOfAlbum(item: any) {
	try {
		const albumid = item.albumid || item.album?.id
		const albummid = item.albummid || item.album?.mid
		const albumname = item.albumname || item.album?.title

		let artwork = ''
		if (item.album?.name === '' || item.album?.name === '空') {
			if (item.singer && item.singer.length > 0) {
				artwork = `https://y.gtimg.cn/music/photo_new/T001R500x500M000${item.singer[0].mid}.jpg`
			}
		} else {
			artwork = `https://y.gtimg.cn/music/photo_new/T002R500x500M000${albummid}.jpg`
		}

		return {
			id: item.mid || item.songid,
			songmid: item.id || item.songmid,
			title: item.title || item.songname,
			artist: item.singer.map((s: any) => s.name).join(', '),
			artwork: artwork || undefined,
			album: albumname,
			lrc: item.lyric || undefined,
			albumid: albumid,
			albummid: albummid,
			url: 'Unknown',
		}
	} catch (error) {
		console.error('Error in formatMusicItem:', error, 'for item:', item)
		return null // 或者返回一个默认对象
	}
}
export async function getTopLists() {
	const list = await fetch(
		'https://u.y.qq.com/cgi-bin/musicu.fcg?_=1577086820633&data=%7B%22comm%22%3A%7B%22g_tk%22%3A5381%2C%22uin%22%3A123456%2C%22format%22%3A%22json%22%2C%22inCharset%22%3A%22utf-8%22%2C%22outCharset%22%3A%22utf-8%22%2C%22notice%22%3A0%2C%22platform%22%3A%22h5%22%2C%22needNewCode%22%3A1%2C%22ct%22%3A23%2C%22cv%22%3A0%7D%2C%22topList%22%3A%7B%22module%22%3A%22musicToplist.ToplistInfoServer%22%2C%22method%22%3A%22GetAll%22%2C%22param%22%3A%7B%7D%7D%7D',
		{
			method: 'GET',
			headers: {
				Cookie: 'uin=',
			},
			credentials: 'include',
		},
	).then((res) => res.json())

	return list.topList.data.group.map((e) => ({
		title: e.groupName,
		data: e.toplist.map((_) => ({
			id: _.topId,
			description: _.intro,
			title: _.title.replace(/腾讯/g, '').trim(),
			period: _.period,
			coverImg: _.headPicUrl || _.frontPicUrl,
		})),
	}))
}

export async function getKwId(songInfo) {
	const encodedSongInfo = encodeURIComponent(songInfo.title + ' ' + songInfo.artist)
	const searchUrl = `https://search.kuwo.cn/r.s?client=kt&all=${encodedSongInfo}&pn=0&rn=25&uid=794762570&ver=kwplayer_ar_9.2.2.1&vipver=1&show_copyright_off=1&newver=1&ft=music&cluster=0&strategy=2012&encoding=utf8&rformat=json&vermerge=1&mobi=1&issubtitle=1`
	logInfo('searchUrl::::::' + searchUrl)

	try {
		// Make a request to the search URL
		const response = await fetch(searchUrl)
		if (!response.ok) {
			throw new Error('Network response was not ok')
		}

		// Parse the JSON response
		const data = await response.json()

		if (data.abslist && data.abslist.length > 0) {
			const dcTargetId = data.abslist[0].DC_TARGETID
			logInfo('DC_TARGETID::::::' + dcTargetId)
			return dcTargetId
		} else {
			throw new Error('No results found')
		}
	} catch (error) {
		logError('请求出错:', error)
	}
}
export async function getUrlFromKw(kwId: string, quality: string) {
	// Construct the source URL using the provided kwId and quality
	switch (quality) {
		case 'flac':
			quality = '2000k' + quality
			break
		case '128k':
			quality = quality + 'mp3'
			break
		case '320k':
			quality = quality + 'mp3'
			break
		default:
			quality = '128kmp3'
	}
	const sourceUrl = `${KW_URL}${kwId}&br=${quality}`
	logInfo('sourceUrl::::::' + sourceUrl)

	try {
		// Make a request to the source URL
		const response = await fetch(sourceUrl)
		if (!response.ok) {
			throw new Error('Network response was not ok')
		}

		// Read the response as text
		const responseText = await response.text()

		// Extract the URL from the response
		const urlMatch = responseText.match(/url=(https?:\/\/\S+)/)

		if (urlMatch && urlMatch[1]) {
			const url = urlMatch[1].trim() // Trim any extra whitespace or newlines
			logInfo('Extracted URL::::::' + url)
			return url
		} else {
			throw new Error('URL not found in response')
		}
	} catch (error) {
		logError('请求出错:', error)
		return null // Return null or handle the error as needed
	}
}
export async function getMusicFromKw(songInfo, quality: string) {
	const id = await getKwId(songInfo)
	const url = await getUrlFromKw(id, quality)
	return url
}
export async function getPlayListFromQ(playListID: string) {
	const url = `https://c.y.qq.com/v8/fcg-bin/fcg_v8_playlist_cp.fcg?newsong=1&id=${playListID}&format=json&inCharset=GB2312&outCharset=utf-8`

	try {
		const response = await fetch(url)
		const data = await response.json()
		if (response.status != 200) {
			throw new Error('请求失败')
		}

		if (!data.data || !data.data.cdlist || !Array.isArray(data.data.cdlist)) {
			throw new Error('Invalid data structure')
		}

		const songList = data.data.cdlist.flatMap((cd) => cd.songlist || [])
		const artwork = data.data.cdlist[0].logo.replace(/http:/, 'https:')

		const formattedSongs = songList.map((item) => ({
			artist: formatSingerName(item.singer, 'name') || 'Unknown Artist',
			title: item.title || 'Untitled Song',
			album: item.album?.name || 'Unknown Album',
			id: item.mid || 'default_songmid',
			artwork:
				item.album?.name === '' || item.album?.name === '空'
					? item.singer?.length
						? `https://y.gtimg.cn/music/photo_new/T001R500x500M000${item.singer[0].mid}.jpg`
						: ''
					: `https://y.gtimg.cn/music/photo_new/T002R500x500M000${item.album?.mid}.jpg`,
			singerImg: item.singer?.length
				? `https://y.gtimg.cn/music/photo_new/T001R500x500M000${item.singer[0].mid}.jpg`
				: '',
			url: item.url || 'Unknown',
			genre: item.genre || 'Unknown Genre',
			date: item.releaseDate || 'Unknown Release Date',
			duration: item.interval || 0,
		}))

		return {
			success: true,
			id: playListID,
			platform: 'QQ',
			artist: data.data.cdlist[0].nickname,
			name: data.data.cdlist[0].dissname,
			artwork: artwork,
			title: data.data.cdlist[0].desc,
			songs: formattedSongs,
		}
	} catch (error) {
		logError('Error fetching playlist:', error)
		return {
			success: false,
			error: error.message,
		}
	}
}

interface Album {
	album_mid: string
	album_name: string
	singer_mid: string
	singer_name: string
}

interface Song {
	songname: string
	songmid: string
}

// 获取专辑列表
export async function getAlbumList(singerMid: string): Promise<Album[]> {
	const url = `https://u.y.qq.com/cgi-bin/musicu.fcg?callback=getUCGI2613146679247198&g_tk=5381&jsonpCallback=getUCGI2613146679247198&loginUin=0&hostUin=0&format=jsonp&inCharset=utf8&outCharset=utf-8&notice=0&platform=yqq&needNewCode=0&data=%7B%22singerAlbum%22%3A%7B%22method%22%3A%22get_singer_album%22%2C%22param%22%3A%7B%22singermid%22%3A%22${singerMid}%22%2C%22order%22%3A%22time%22%2C%22begin%22%3A0%2C%22num%22%3A100%2C%22exstatus%22%3A1%7D%2C%22module%22%3A%22music.web_singer_info_svr%22%7D%7D`
	const headers = {
		Referer: `https://y.qq.com/n/yqq/singer/${singerMid}.html`,
	}
	const coverJpgUrlPre = 'https://y.gtimg.cn/music/photo_new/T002R800x800M000'
	try {
		const response = await axios.get(url, { headers })
		const data = JSON.parse(response.data.slice(24, -1))
		const albumList = data.singerAlbum.data.list

		return albumList.map((item: any) => ({
			album_mid: item.album_mid,
			album_name: item.album_name,
			singer_mid: item.singer_mid,
			singer_name: item.singer_name,
			artwork: `${coverJpgUrlPre}${item.album_mid}.jpg?max_age=2592000`,
		}))
	} catch (error) {
		logError('Error fetching album list:', error)
		return []
	}
}

// 根据专辑ID
export async function getMusicByAlbumId(albumMid: string, singerName: string): Promise<void> {
	const url = `https://c.y.qq.com/v8/fcg-bin/fcg_v8_album_info_cp.fcg?albummid=${albumMid}&g_tk=5381&jsonpCallback=albuminfoCallback&loginUin=0&hostUin=0&format=jsonp&inCharset=utf8&outCharset=utf-8&notice=0&platform=yqq&needNewCode=0`
	const coverJpgUrlPre = 'https://y.gtimg.cn/music/photo_new/T002R800x800M000'
	const headers = {
		Referer: 'https://y.qq.com/portal/player.html',
	}
	try {
		const response = await axios.get(url, { headers })
		const data = JSON.parse(response.data.slice(19, -1))
		const songList: Song[] = data.data.list
		data.data.list.flatMap((item: any) => ({
			artist: singerName,
			title: item.songname,
			album: data.data.albumname,
			id: item.songmid,
			artwork: `${coverJpgUrlPre}${albumMid}.jpg?max_age=2592000`,
			singerImg: `https://y.gtimg.cn/music/photo_new/T001R500x500M000${albumMid}.jpg?max_age=2592000`,
			url: 'Unknown',
			genre: 'Unknown Genre',
			date: 'Unknown Release Date',
			duration: 0,
		}))
	} catch (error) {
		logError('Error get music by album ID:', error)
	}
}
export async function getSingerMidBySingerName(singerName: string) {
	// 去除歌手名称中的空格
	const url = `https://c.y.qq.com/soso/fcgi-bin/client_search_cp?p=1&n=2&w=${encodeURIComponent(singerName)}&format=json`
	try {
		// console.log('singerName++', singerName)
		const response = await fetch(url)
		if (!response.ok) {
			throw new Error('Network response was not ok')
		}
		const results = await response.json()
		if (results.code !== 0 || !results.data || !results.data.song || !results.data.song.list) {
			throw new Error('Invalid response structure')
		}

		const songList = results.data.song.list
		// logInfo(songList)

		// 查找匹配歌手名和歌曲名的项
		for (const song of songList) {
			// 在歌手列表中查找匹配的歌手
			// 先尝试完全匹配
			const exactMatch = song.singer.find((s) => s.name.toLowerCase() === singerName.toLowerCase())
			if (exactMatch) {
				return exactMatch.mid
			}
			// 如果没有完全匹配，再尝试模糊匹配
			const matchingSinger = song.singer.find(
				(s) => similarity(s.name, singerName) > 0.3, // 0.7 是相似度阈值，可以根据需要调整
			)
			if (matchingSinger) {
				logInfo('模糊匹配歌手:', matchingSinger.name)
				return matchingSinger.mid
			}
		}

		logInfo(`没有找到歌手 ${singerName} `)
		return null
	} catch (error) {
		logError('请求出错 of getSingerMidBySongName:', error)
		return null
	}
}

export async function searchMusicInfoByName(songName: string, singerName?: string) {
	const url = `https://c.y.qq.com/soso/fcgi-bin/music_search_new_platform?searchid=53806572956004615&t=1&aggr=1&cr=1&catZhida=1&lossless=0&flag_qc=0&p=1&n=20&w=${encodeURIComponent(songName)}`
	const url1 = `https://c.y.qq.com/soso/fcgi-bin/client_search_cp?p=1&n=5&w=${encodeURIComponent(songName)}&format=json`
	try {
		const response = await fetch(url1)
		if (!response.ok) {
			throw new Error('Network response was not ok')
		}
		const jsonData = await response.json()
		// console.log('data::::::' + JSON.stringify(jsonData.data.song.list))
		if (jsonData.code !== 0 || !jsonData.data || !jsonData.data.song || !jsonData.data.song.list) {
			throw new Error('Invalid response structure')
		}

		let filteredList = jsonData.data.song.list

		if (singerName) {
			filteredList = filteredList.filter((item: any) => {
				if (item.songmid == '') {
					return false
				}

				return JSON.stringify(item).toLowerCase().includes(singerName.toLowerCase())
			})

			return {
				songmid: filteredList[0].songmid,
				singerName:
					formatSingerName(filteredList[0].singer.replace(/;/g, '、'), 'name') || 'Unknown Artist',
				songName: filteredList[0].songname,
				albummid: filteredList[0].albummid,
				albumName: filteredList[0].albumname,
				artwork: `https://y.gtimg.cn/music/photo_new/T002R800x800M000${filteredList[0].albummid}.jpg`,
			}
		} else {
			filteredList = filteredList.filter((item: any) => {
				if (item.songmid == '') {
					return false
				}
				return true
			})
			return {
				songmid: filteredList[0].songmid,
				singerName: formatSingerName(filteredList[0].singer, 'name') || 'Unknown Artist',
				songName: filteredList[0].songname,
				albummid: filteredList[0].albummid,
				albumName: filteredList[0].albumname,
				artwork: `https://y.gtimg.cn/music/photo_new/T002R800x800M000${filteredList[0].albummid}.jpg?max_age=2592000`,
			}
		}
	} catch (error) {
		logError('请求url1出错 of searchMusicInfoByName:', error)
		try {
			console.log('url::::::' + url)
			const response = await fetch(url)
			if (!response.ok) {
				throw new Error('Network response was not ok')
			}

			const rawData = await response.text()
			const jsonData = JSON.parse(rawData.replace(/^callback\(|\)$/g, ''))

			if (
				jsonData.code !== 0 ||
				!jsonData.data ||
				!jsonData.data.song ||
				!jsonData.data.song.list
			) {
				throw new Error('Invalid response structure')
			}

			let filteredList = jsonData.data.song.list

			if (singerName) {
				filteredList = filteredList.filter((item: any) =>
					JSON.stringify(item).toLowerCase().includes(singerName.toLowerCase()),
				)
				const matchedTrack = filteredList[0]
				const fields = matchedTrack.f.split('|')
				return {
					songmid: fields[20] || undefined,
					singerName: fields[3]?.replace(/;/g, '、') || 'Unknown Artist',
					songName: songName,
					albummid: fields[22],
					albumName: filteredList[0].albumName_hilight,
					artwork:
						fields[22] != undefined
							? `https://y.gtimg.cn/music/photo_new/T002R800x800M000${fields[22]}.jpg?max_age=2592000`
							: undefined,
				}
			} else {
				return {
					songmid: filteredList[0].songmid,
					singerName: formatSingerName(filteredList[0].singer, 'name') || 'Unknown Artist',
					songName: filteredList[0].songname,
					albummid: filteredList[0].albummid,
					albumName: filteredList[0].albumname,
					artwork: `https://y.gtimg.cn/music/photo_new/T002R800x800M000${filteredList[0].albummid}.jpg?max_age=2592000`,
				}
			}
		} catch (error) {
			logError('请求url出错 of searchMusicInfoByName:', error)
			return null
		}
	}
}

export async function getSingerDetail(singerMid: string) {
	try {
		const response = await getSingerInfo(singerMid)
		const jsonData = await response
		// logInfo(jsonData)

		if (!jsonData.singer || !jsonData.singer.data || !jsonData.singer.data.songlist) {
			throw new Error('Invalid response structure')
		}
		// logInfo(jsonData.singer.data)

		return {
			singerImg: `https://y.gtimg.cn/music/photo_new/T001R500x500M000${singerMid}.jpg`,
			title: jsonData.singer.data.singer_info.name,
			id: singerMid,
			musicList: jsonData.singer.data.songlist.map(formatMusicItem),
		}
	} catch (error) {
		logError('请求出错 of getSingerDetail:', error)
		return null
	}
}

// 获取专辑歌曲信息
// API: https://i.y.qq.com/v8/fcg-bin/fcg_v8_album_info_cp.fcg
//
// albummid: 专辑的 MID
export const getAlbumSongList = async (albummid, origin = false) => {
	try {
		const response = await fetch(
			'https://i.y.qq.com/v8/fcg-bin/fcg_v8_album_info_cp.fcg?platform=h5page&albummid=ALBUMMID&g_tk=938407465&uin=0&format=json&inCharset=utf-8&outCharset=utf-8&notice=0&platform=h5&needNewCode=1&_=1459961045571'.replaceAll(
				'ALBUMMID',
				albummid,
			),
		)
		const jsonData = await response.json()
		// console.log('Raw jsonData:', JSON.stringify(jsonData, null, 2))

		if (origin) return jsonData

		// console.log('jsonData.data:', jsonData.data)
		// console.log('jsonData.data.name:', jsonData.data?.name)

		if (jsonData && jsonData.data) {
			const result = {
				singerImg: `https://y.gtimg.cn/music/photo_new/T002R800x800M000${albummid}.jpg`,
				title: jsonData.data.name || '未知专辑',
				id: albummid,
				musicList: (jsonData.data.list || []).map(formatMusicItemOfAlbum),
			}
			// console.log('Returning result:', result)
			return result
		} else {
			console.error('Invalid data structure:', jsonData)
			return {
				singerImg: '',
				title: '未知专辑',
				id: albummid,
				musicList: [],
			}
		}
	} catch (err) {
		console.error('Error in getAlbumSongList:', err)
		return {
			singerImg: '',
			title: '未知专辑',
			id: albummid,
			musicList: [],
		}
	}
}

function similarity(s1, s2) {
	let longer = s1
	let shorter = s2
	if (s1.length < s2.length) {
		longer = s2
		shorter = s1
	}
	const longerLength = longer.length
	if (longerLength === 0) {
		return 1.0
	}
	return (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength)
}

function editDistance(s1, s2) {
	s1 = s1.toLowerCase()
	s2 = s2.toLowerCase()

	const costs = []
	for (let i = 0; i <= s1.length; i++) {
		let lastValue = i
		for (let j = 0; j <= s2.length; j++) {
			if (i === 0) {
				costs[j] = j
			} else {
				if (j > 0) {
					let newValue = costs[j - 1]
					if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
						newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1
					}
					costs[j - 1] = lastValue
					lastValue = newValue
				}
			}
		}
		if (i > 0) {
			costs[s2.length] = lastValue
		}
	}
	return costs[s2.length]
}
const searchTypeMap = {
	0: 'song',
	2: 'album',
	1: 'singer',
	3: 'songlist',
	7: 'song',
	12: 'mv',
}

const searchHeaders = {
	referer: 'https://y.qq.com',
	'user-agent':
		'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
	Cookie: 'uin=',
}

interface ArtistItem {
	singerName: string
	singerID: string
	singerMID: string
	singerPic: string
	songNum: number
}

function formatArtistItem(item: ArtistItem) {
	return {
		name: item.singerName,
		id: item.singerID,
		singerMID: item.singerMID,
		avatar: item.singerPic,
		worksNum: item.songNum,
	}
}

async function searchBase(query: string, page: number, type: number, pageSize?: number) {
	const res = (
		await axios({
			url: 'https://u.y.qq.com/cgi-bin/musicu.fcg',
			method: 'POST',
			data: {
				req_1: {
					method: 'DoSearchForQQMusicDesktop',
					module: 'music.search.SearchCgiService',
					param: {
						num_per_page: pageSize,
						page_num: page,
						query: query,
						search_type: type,
					},
				},
			},
			headers: headers,
			xsrfCookieName: 'XSRF-TOKEN',
			withCredentials: true,
		})
	).data

	return {
		isEnd: res.req_1.data.meta.sum <= page * (pageSize || 20),
		data: res.req_1.data.body[searchTypeMap[type]].list,
	}
}

export async function searchArtist(query: string, page: number) {
	const artists = await searchBase(query, page, 1)
	return {
		isEnd: artists.isEnd,
		data: artists.data.map(formatArtistItem),
	}
}
