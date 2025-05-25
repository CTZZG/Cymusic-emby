// helpers/searchAll.ts

import {
	getEmbyToken,
	searchAlbumInternal,
	searchArtistInternal,
	searchMusicInternal
} from '@/helpers/embyApi'
import { searchArtist, searchMusic } from '@/helpers/userApi/xiaoqiu'
import { Track } from 'react-native-track-player'

const PAGE_SIZE = 20

type SearchType = 'songs' | 'artists' | 'albums'

const searchAll = async (
    searchText: string,
    page: number = 1,
    type: SearchType = 'songs',
): Promise<{ data: Track[]; hasMore: boolean }> => {
    console.log('search text+++', searchText, 'page:', page, 'type:', type)

    try {
        // 首先尝试使用Emby搜索
        const tokenInfo = await getEmbyToken()
        if (tokenInfo) {
            console.log('Using Emby search for', type)
            
            if (type === 'songs') {
                const result = await searchMusicInternal(searchText, page, PAGE_SIZE)
                return {
                    data: result.data.map((item: any) => ({
                        id: item.id,
                        title: item.title,
                        artist: item.artist,
                        album: item.album,
                        artwork: item.artwork,
                        duration: item.duration,
                        platform: 'emby',
                        url: item.url || '',
                        _source: 'emby'
                    })) as Track[],
                    hasMore: !result.isEnd
                }
            } else if (type === 'artists') {
				const result = await searchArtistInternal(searchText, page)
				return {
					data: result.data.map((artist: any) => ({
						id: artist.id,
						title: artist.name,
						artist: artist.name,
						artwork: artist.avatar,
						url: '', // 艺术家不需要播放URL，设为空字符串
						isArtist: true,
						platform: 'emby',
						_source: 'emby'
					})) as Track[],
					hasMore: !result.isEnd
				}
            } else if (type === 'albums') {
				const result = await searchAlbumInternal(searchText, page)
				return {
					data: result.data.map((album: any) => ({
						id: album.id,
						title: album.title,
						artist: album.artist,
						artwork: album.artwork,
						album: album.title,
						url: '', // 专辑不需要播放URL，设为空字符串
						isAlbum: true,
						platform: 'emby',
						_source: 'emby'
					})) as Track[],
					hasMore: !result.isEnd
				}
            }
        }
    } catch (error) {
        console.error('Emby search failed, falling back to original search:', error)
    }

    // 回退到原有的搜索逻辑
    console.log('Using fallback search for', type)
    let result
    if (type === 'songs') {
        console.log('search song')
        result = await searchMusic(searchText, page, PAGE_SIZE)
    } else if (type === 'artists') {
        console.log('search artist')
        result = await searchArtist(searchText, page)
        // Transform artist results to Track format
        result.data = result.data.map((artist) => ({
            id: artist.id,
            title: artist.name,
            artist: artist.name,
            artwork: artist.avatar,
            isArtist: true,
        })) as Track[]
    } else {
        // albums - 原有API可能不支持，返回空结果
        result = { data: [], hasMore: false }
    }

    const hasMore = result.data.length === PAGE_SIZE

    return {
        data: result.data as Track[],
        hasMore,
    }
}

export default searchAll
