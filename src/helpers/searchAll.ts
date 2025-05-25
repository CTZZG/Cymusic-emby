// helpers/searchAll.ts

import {
	getEmbyToken,
	searchAlbumInternal,
	searchArtistInternal,
	searchMusicInternal
} from '@/helpers/embyApi'
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

    // 如果Emby不可用，返回空结果而不是回退到原有搜索
    // 这样避免了混合搜索结果的问题
    console.log('Emby not available, returning empty results for', type)
    return {
        data: [],
        hasMore: false,
    }
}

export default searchAll
