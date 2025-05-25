import { 
  MusicPlugin, 
  MusicItem, 
  SearchResult, 
  SearchType, 
  LyricResult,
  ConfigSchema,
  PluginConfig,
  RecommendationResult
} from '../../core/types';

// 重用现有的Emby API
import { 
  initializeEmby,
  getEmbyToken,
  searchMusicInternal,
  searchAlbumInternal,
  searchArtistInternal,
  getLyricApi,
  getHomeRecommendations,
  getEmbyPlayUrl
} from '../../helpers/embyApi';

export class EmbyPlugin implements MusicPlugin {
  public name = 'Emby';
  public version = '1.0.0';
  public author = 'CyMusic Team';
  public description = 'Emby媒体服务器插件';
  public homepage = 'https://emby.media';

  private config: PluginConfig = {};
  private isInitialized = false;

  // 搜索功能
  async search(keyword: string, type: SearchType, page: number = 1): Promise<SearchResult> {
    await this.ensureInitialized();

    try {
      let result;
      
      switch (type) {
        case 'music':
          result = await searchMusicInternal(keyword, page);
          break;
        case 'album':
          result = await searchAlbumInternal(keyword, page);
          break;
        case 'artist':
          result = await searchArtistInternal(keyword, page);
          break;
        default:
          result = await searchMusicInternal(keyword, page);
      }

      return {
        data: result.data.map(item => this.formatMusicItem(item, type)),
        hasMore: !result.isEnd,
        page
      };
    } catch (error) {
      console.error('Emby search failed:', error);
      throw error;
    }
  }

  // 获取播放URL
  async getPlayUrl(musicItem: MusicItem): Promise<string> {
    await this.ensureInitialized();

    try {
      const url = await getEmbyPlayUrl(musicItem);
      if (!url) {
        throw new Error('Failed to get play URL from Emby');
      }
      return url;
    } catch (error) {
      console.error('Failed to get Emby play URL:', error);
      throw error;
    }
  }

  // 获取歌词
  async getLyric(musicItem: MusicItem): Promise<LyricResult | null> {
    await this.ensureInitialized();

    try {
      const result = await getLyricApi(musicItem);
      return result;
    } catch (error) {
      console.error('Failed to get Emby lyric:', error);
      return null;
    }
  }

  // 获取推荐内容
  async getRecommendations(): Promise<RecommendationResult> {
    await this.ensureInitialized();

    try {
      const recommendations = await getHomeRecommendations();
      if (!recommendations) {
        return {};
      }

      return {
        recentlyAdded: recommendations.recentlyAdded?.map(item => this.formatMusicItem(item, 'music')),
        mostPlayed: recommendations.mostPlayed?.map(item => this.formatMusicItem(item, 'music')),
        recentlyPlayed: recommendations.recentlyPlayed?.map(item => this.formatMusicItem(item, 'music')),
        randomTracks: recommendations.randomTracks?.map(item => this.formatMusicItem(item, 'music'))
      };
    } catch (error) {
      console.error('Failed to get Emby recommendations:', error);
      return {};
    }
  }

  // 获取配置架构
  getConfigSchema(): ConfigSchema {
    return {
      fields: [
        {
          key: 'url',
          label: '服务器地址',
          type: 'text',
          required: true,
          placeholder: 'http://192.168.1.100:8096'
        },
        {
          key: 'username',
          label: '用户名',
          type: 'text',
          required: true,
          placeholder: '输入Emby用户名'
        },
        {
          key: 'password',
          label: '密码',
          type: 'password',
          required: true,
          placeholder: '输入Emby密码'
        },
        {
          key: 'deviceId',
          label: '设备ID',
          type: 'text',
          required: false,
          placeholder: '留空将自动生成'
        },
        {
          key: 'uploadPlaylistToEmby',
          label: '上传歌单到Emby',
          type: 'boolean',
          defaultValue: false
        }
      ]
    };
  }

  // 设置配置
  setConfig(config: PluginConfig): void {
    this.config = { ...config };
    this.isInitialized = false; // 重置初始化状态
  }

  // 获取配置
  getConfig(): PluginConfig {
    return { ...this.config };
  }

  // 测试连接
  async testConnection(): Promise<boolean> {
    if (!this.isConfigValid()) {
      return false;
    }

    try {
      // 临时初始化以测试连接
      initializeEmby({
        url: this.config.url as string,
        username: this.config.username as string,
        password: this.config.password as string,
        deviceId: this.config.deviceId as string,
        uploadPlaylistToEmby: this.config.uploadPlaylistToEmby as boolean
      });

      const tokenInfo = await getEmbyToken(true);
      return !!tokenInfo;
    } catch (error) {
      console.error('Emby connection test failed:', error);
      return false;
    }
  }

  // 插件加载时调用
  async onLoad(): Promise<void> {
    console.log('Emby plugin loaded');
    if (this.isConfigValid()) {
      await this.ensureInitialized();
    }
  }

  // 插件卸载时调用
  async onUnload(): Promise<void> {
    console.log('Emby plugin unloaded');
    this.isInitialized = false;
  }

  // 私有方法：确保已初始化
  private async ensureInitialized(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (!this.isConfigValid()) {
      throw new Error('Emby plugin not configured');
    }

    try {
      initializeEmby({
        url: this.config.url as string,
        username: this.config.username as string,
        password: this.config.password as string,
        deviceId: this.config.deviceId as string,
        uploadPlaylistToEmby: this.config.uploadPlaylistToEmby as boolean
      });

      // 验证连接
      const tokenInfo = await getEmbyToken();
      if (!tokenInfo) {
        throw new Error('Failed to authenticate with Emby server');
      }

      this.isInitialized = true;
      console.log('Emby plugin initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Emby plugin:', error);
      throw error;
    }
  }

  // 私有方法：检查配置是否有效
  private isConfigValid(): boolean {
    return !!(
      this.config.url &&
      this.config.username &&
      this.config.password
    );
  }

  // 私有方法：格式化音乐项
  private formatMusicItem(item: any, type: SearchType): MusicItem {
    const musicItem: MusicItem = {
      id: item.id,
      title: item.title,
      artist: item.artist,
      album: item.album,
      artwork: item.artwork,
      duration: item.duration,
      platform: this.name,
      _source: 'emby',
      ...item // 保留原始数据
    };

    // 根据类型设置特殊标记
    if (type === 'album') {
      musicItem.isAlbum = true;
    } else if (type === 'artist') {
      musicItem.isArtist = true;
    }

    return musicItem;
  }
}

// 导出插件实例
export const embyPlugin = new EmbyPlugin();
