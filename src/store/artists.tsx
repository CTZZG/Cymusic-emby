import { formatArtistItem, getEmbyToken, httpEmby } from '@/helpers/embyApi'
import { create } from 'zustand'

interface ArtistState {
  artists: any[]
  allArtists: any[]
  page: number
  hasMore: boolean
  isLoading: boolean
  fetchArtists: (refresh?: boolean) => Promise<void>
}

const PAGE_SIZE = 20

export const useArtistsStore = create<ArtistState>((set, get) => ({
  artists: [],
  allArtists: [],
  page: 1,
  hasMore: true,
  isLoading: false,

  fetchArtists: async (refresh = false) => {
    try {
      const { allArtists, page, isLoading } = get()

      if (isLoading) return

      if (refresh || allArtists.length === 0) {
        // 只在刷新或首次加载时请求数据
        set({ isLoading: true })

        // 检查Emby配置
        const tokenInfo = await getEmbyToken()
        if (!tokenInfo) {
          console.error('Emby not configured or authentication failed')
          set({ allArtists: [], artists: [] })
        } else {
          // 使用Emby API获取所有艺术家
          const params = {
            IncludeItemTypes: 'MusicArtist',
            Recursive: true,
            UserId: tokenInfo.userId,
            StartIndex: 0,
            Limit: 2000, // 获取更多数据
            Fields: 'PrimaryImageAspectRatio,ImageTags,UserData,Overview,ChildCount',
            SortBy: 'SortName',
            SortOrder: 'Ascending'
          }

          const result = await httpEmby('GET', `Users/${tokenInfo.userId}/Items`, params)
          if (result && result.data && result.data.Items) {
            const formattedArtists = await Promise.all(
              result.data.Items.map((item: any) => formatArtistItem(item))
            )
            set({ allArtists: formattedArtists })
          } else {
            // 如果Emby请求失败，显示空列表
            set({ allArtists: [] })
          }
        }
      }

      set({ isLoading: true })
      const currentPage = refresh ? 1 : page
      const start = (currentPage - 1) * PAGE_SIZE
      const end = start + PAGE_SIZE
      const newArtists = get().allArtists.slice(start, end)

      set((state) => ({
        artists: refresh ? newArtists : [...state.artists, ...newArtists],
        page: currentPage + 1,
        hasMore: end < get().allArtists.length,
        isLoading: false,
      }))
    } catch (error) {
      console.error('Failed to fetch artists:', error)
      set({ isLoading: false })
    }
  },
}))

export const useArtists = () => {
  const { artists, fetchArtists } = useArtistsStore()
  return { artists, fetchArtists }
}

export const useAllArtists = () => {
  const allArtists = useArtistsStore((state) => state.allArtists)
  return allArtists
}

export const useArtistsLoading = () => {
  return useArtistsStore((state) => state.isLoading)
}

export const useArtistsHasMore = () => {
  return useArtistsStore((state) => state.hasMore)
}
