import { requestMsg } from '../../message'
import { httpFetch } from '../../request'
import { headers, timeout } from '../options'
import { getMediaSource } from '@/helpers/userApi/xiaoqiu'

const api_ikun = {
	getMusicUrl(songInfo, type) {
    console.log('ikun>????s')
		const requestObj = httpFetch(`http://110.42.111.49:1314/url/tx/${songInfo.id}/${type}`, {
			method: 'get',
			timeout,
			headers,
			family: 4,
		})
		requestObj.promise = requestObj.promise.then(async ({ body }) => {
			// console.log(body.data)
			if (!body.data||(typeof body.data === 'string' && body.data.includes('error') ))
			{
				const resp = await getMediaSource(songInfo, '128k')
				console.log('获取成功：' + resp)
				return Promise.resolve({ type, url: resp.url })
			}
			console.log('获取成功：' + body.data)
			return body.code === 0
				? Promise.resolve({ type, url: body.data })
				: Promise.reject(new Error(requestMsg.fail))
		})

		return requestObj.promise
	},
	getPic(songInfo) {
		return {
			promise: Promise.resolve(
				`https://y.gtimg.cn/music/photo_new/T002R500x500M000${songInfo.albumId}.jpg`,
			),
		}
	},
}

export default api_ikun
