import { formatAlbumItem, getEmbyToken, httpEmby } from '@/helpers/embyApi'
import { create } from 'zustand'

interface AlbumState {
  albums: any[]
  allAlbums: any[]
  page: number
  hasMore: boolean
  isLoading: boolean
  fetchAlbums: (refresh?: boolean) => Promise<void>
}

const PAGE_SIZE = 20

export const useAlbumsStore = create<AlbumState>((set, get) => ({
  albums: [],
  allAlbums: [],
  page: 1,
  hasMore: true,
  isLoading: false,

  fetchAlbums: async (refresh = false) => {
    try {
      const { allAlbums, page, isLoading } = get()

      if (isLoading) return

      if (refresh || allAlbums.length === 0) {
        // 只在刷新或首次加载时请求数据
        set({ isLoading: true })

        // 检查Emby配置
        const tokenInfo = await getEmbyToken()
        if (!tokenInfo) {
          console.error('Emby not configured or authentication failed')
          set({ allAlbums: [], albums: [] })
        } else {
          // 使用Emby API获取所有专辑
          const params = {
            IncludeItemTypes: 'MusicAlbum',
            Recursive: true,
            UserId: tokenInfo.userId,
            StartIndex: 0,
            Limit: 2000, // 获取更多数据
            Fields: 'PrimaryImageAspectRatio,ProductionYear,Genres,AlbumArtist,ArtistItems,SongCount,ImageTags,UserData,ChildCount,PremiereDate,DateCreated',
            SortBy: 'SortName',
            SortOrder: 'Ascending'
          }

          const result = await httpEmby('GET', `Users/${tokenInfo.userId}/Items`, params)
          if (result && result.data && result.data.Items) {
            const formattedAlbums = await Promise.all(
              result.data.Items.map((item: any) => formatAlbumItem(item))
            )
            set({ allAlbums: formattedAlbums })
          } else {
            // 如果Emby请求失败，显示空列表
            set({ allAlbums: [] })
          }
        }
      }

      set({ isLoading: true })
      const currentPage = refresh ? 1 : page
      const start = (currentPage - 1) * PAGE_SIZE
      const end = start + PAGE_SIZE
      const newAlbums = get().allAlbums.slice(start, end)

      set((state) => ({
        albums: refresh ? newAlbums : [...state.albums, ...newAlbums],
        page: currentPage + 1,
        hasMore: end < get().allAlbums.length,
        isLoading: false,
      }))
    } catch (error) {
      console.error('Failed to fetch albums:', error)
      set({ isLoading: false })
    }
  },
}))

export const useAlbums = () => {
  const { albums, fetchAlbums } = useAlbumsStore()
  return { albums, fetchAlbums }
}

export const useAllAlbums = () => {
  const allAlbums = useAlbumsStore((state) => state.allAlbums)
  return allAlbums
}

export const useAlbumsLoading = () => {
  return useAlbumsStore((state) => state.isLoading)
}

export const useAlbumsHasMore = () => {
  return useAlbumsStore((state) => state.hasMore)
}
