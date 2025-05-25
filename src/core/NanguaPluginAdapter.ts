import { 
  MusicPlugin, 
  NanguaPlugin, 
  MusicItem, 
  SearchResult, 
  SearchType, 
  LyricResult,
  ConfigSchema,
  PluginConfig
} from './types';

/**
 * 南瓜插件适配器
 * 将南瓜_emby_superd.js等插件适配为CyMusic插件格式
 */
export class NanguaPluginAdapter implements MusicPlugin {
  public name: string;
  public version: string;
  public author: string;
  public description: string;
  public homepage?: string;

  private nanguaPlugin: NanguaPlugin;
  private config: PluginConfig = {};

  constructor(nanguaPlugin: NanguaPlugin) {
    this.nanguaPlugin = nanguaPlugin;
    this.name = nanguaPlugin.platform || 'Unknown Plugin';
    this.version = nanguaPlugin.version || '1.0.0';
    this.author = nanguaPlugin.author || 'Unknown Author';
    this.description = nanguaPlugin.description || 'Adapted from Nangua plugin';
    this.homepage = nanguaPlugin.homepage;
  }

  // 搜索功能适配
  async search(keyword: string, type: SearchType, page: number = 1): Promise<SearchResult> {
    if (!this.nanguaPlugin.search) {
      throw new Error('Search method not implemented in Nangua plugin');
    }

    try {
      // 构建南瓜插件的查询对象
      const query = {
        keyword,
        type: this.mapSearchType(type)
      };

      const result = await this.nanguaPlugin.search(query, page, type);
      
      return {
        data: this.formatSearchResults(result, type),
        hasMore: this.extractHasMore(result),
        page
      };
    } catch (error) {
      console.error(`Search failed in Nangua plugin "${this.name}":`, error);
      throw error;
    }
  }

  // 获取播放URL
  async getPlayUrl(musicItem: MusicItem): Promise<string> {
    if (!this.nanguaPlugin.getMediaSource) {
      throw new Error('getMediaSource method not implemented in Nangua plugin');
    }

    try {
      const result = await this.nanguaPlugin.getMediaSource(musicItem, 'standard');
      
      if (typeof result === 'string') {
        return result;
      }
      
      if (result && result.url) {
        return result.url;
      }
      
      throw new Error('Invalid media source result');
    } catch (error) {
      console.error(`Failed to get play URL from Nangua plugin "${this.name}":`, error);
      throw error;
    }
  }

  // 获取歌词
  async getLyric(musicItem: MusicItem): Promise<LyricResult | null> {
    if (!this.nanguaPlugin.getLyric) {
      return null;
    }

    try {
      const result = await this.nanguaPlugin.getLyric(musicItem);
      
      if (!result) {
        return null;
      }

      if (typeof result === 'string') {
        return { rawLrc: result };
      }

      if (result.rawLrc) {
        return {
          rawLrc: result.rawLrc,
          translation: result.translation
        };
      }

      if (result.lyric) {
        return { rawLrc: result.lyric };
      }

      return null;
    } catch (error) {
      console.error(`Failed to get lyric from Nangua plugin "${this.name}":`, error);
      return null;
    }
  }

  // 获取专辑详情（如果支持）
  async getAlbumDetail?(albumId: string) {
    if (!this.nanguaPlugin.getAlbumInfo) {
      throw new Error('getAlbumInfo method not implemented in Nangua plugin');
    }

    try {
      const albumItem = { id: albumId };
      const result = await this.nanguaPlugin.getAlbumInfo(albumItem, 1);
      
      return this.formatAlbumDetail(result);
    } catch (error) {
      console.error(`Failed to get album detail from Nangua plugin "${this.name}":`, error);
      throw error;
    }
  }

  // 获取艺术家详情（如果支持）
  async getArtistDetail?(artistId: string) {
    if (!this.nanguaPlugin.getArtistWorks) {
      throw new Error('getArtistWorks method not implemented in Nangua plugin');
    }

    try {
      const artistItem = { id: artistId };
      const result = await this.nanguaPlugin.getArtistWorks(artistItem, 1, 'music');
      
      return this.formatArtistDetail(result);
    } catch (error) {
      console.error(`Failed to get artist detail from Nangua plugin "${this.name}":`, error);
      throw error;
    }
  }

  // 获取配置架构
  getConfigSchema?(): ConfigSchema {
    // 根据南瓜插件的特点，通常需要服务器配置
    return {
      fields: [
        {
          key: 'serverUrl',
          label: '服务器地址',
          type: 'text',
          required: true,
          placeholder: 'http://your-server:port'
        },
        {
          key: 'username',
          label: '用户名',
          type: 'text',
          required: true
        },
        {
          key: 'password',
          label: '密码',
          type: 'password',
          required: true
        },
        {
          key: 'deviceId',
          label: '设备ID',
          type: 'text',
          required: false,
          placeholder: '留空自动生成'
        }
      ]
    };
  }

  // 设置配置
  setConfig?(config: PluginConfig): void {
    this.config = { ...config };
    
    // 如果南瓜插件有配置方法，调用它
    if (this.nanguaPlugin.setConfig) {
      this.nanguaPlugin.setConfig(config);
    }
  }

  // 获取配置
  getConfig?(): PluginConfig {
    return { ...this.config };
  }

  // 测试连接
  async testConnection?(): Promise<boolean> {
    if (this.nanguaPlugin.testConnection) {
      try {
        return await this.nanguaPlugin.testConnection();
      } catch (error) {
        return false;
      }
    }

    // 如果没有测试方法，尝试进行一个简单的搜索测试
    try {
      await this.search('test', 'music', 1);
      return true;
    } catch (error) {
      return false;
    }
  }

  // 私有方法：映射搜索类型
  private mapSearchType(type: SearchType): string {
    switch (type) {
      case 'music':
        return 'music';
      case 'album':
        return 'album';
      case 'artist':
        return 'artist';
      default:
        return 'music';
    }
  }

  // 私有方法：格式化搜索结果
  private formatSearchResults(result: any, type: SearchType): MusicItem[] {
    if (!result || !Array.isArray(result.data)) {
      return [];
    }

    return result.data.map((item: any) => this.formatMusicItem(item, type));
  }

  // 私有方法：格式化音乐项
  private formatMusicItem(item: any, type: SearchType): MusicItem {
    const baseItem: MusicItem = {
      id: item.id || item.songmid || item.mid || String(Math.random()),
      title: item.title || item.name || item.songname || 'Unknown Title',
      artist: item.artist || item.singer || item.artistname || 'Unknown Artist',
      album: item.album || item.albumname,
      artwork: item.artwork || item.pic || item.image,
      duration: item.duration || item.time,
      platform: this.name,
      ...item // 保留原始数据
    };

    // 根据类型设置特殊标记
    if (type === 'album') {
      baseItem.isAlbum = true;
    } else if (type === 'artist') {
      baseItem.isArtist = true;
    }

    return baseItem;
  }

  // 私有方法：提取是否有更多数据
  private extractHasMore(result: any): boolean {
    if (result && typeof result.hasMore === 'boolean') {
      return result.hasMore;
    }
    
    if (result && result.data && Array.isArray(result.data)) {
      // 如果返回的数据少于预期，可能没有更多数据
      return result.data.length >= 20; // 假设每页20条
    }
    
    return false;
  }

  // 私有方法：格式化专辑详情
  private formatAlbumDetail(result: any): any {
    if (!result) {
      throw new Error('Invalid album detail result');
    }

    return {
      id: result.id,
      title: result.title || result.name,
      artist: result.artist || result.artistname,
      artwork: result.artwork || result.pic,
      description: result.description,
      tracks: Array.isArray(result.tracks) 
        ? result.tracks.map((track: any) => this.formatMusicItem(track, 'music'))
        : []
    };
  }

  // 私有方法：格式化艺术家详情
  private formatArtistDetail(result: any): any {
    if (!result) {
      throw new Error('Invalid artist detail result');
    }

    return {
      id: result.id,
      name: result.name || result.title,
      avatar: result.avatar || result.pic,
      description: result.description,
      tracks: Array.isArray(result.tracks)
        ? result.tracks.map((track: any) => this.formatMusicItem(track, 'music'))
        : []
    };
  }
}

/**
 * 从南瓜插件代码创建适配器
 */
export function createNanguaPluginAdapter(pluginCode: string): NanguaPluginAdapter {
  try {
    // 创建一个安全的执行环境
    const sandbox = {
      console,
      fetch,
      setTimeout,
      clearTimeout,
      setInterval,
      clearInterval,
      Promise,
      JSON,
      Date,
      Math,
      RegExp,
      String,
      Number,
      Boolean,
      Array,
      Object,
      Error,
      // 添加其他可能需要的全局对象
    };

    // 执行插件代码
    const func = new Function(...Object.keys(sandbox), pluginCode + '\n; return this;');
    const pluginContext = func.apply({}, Object.values(sandbox));

    // 提取插件对象
    let nanguaPlugin: NanguaPlugin;
    
    if (pluginContext.plugin) {
      nanguaPlugin = pluginContext.plugin;
    } else if (pluginContext.default) {
      nanguaPlugin = pluginContext.default;
    } else {
      // 尝试从上下文中提取插件方法
      nanguaPlugin = {
        platform: pluginContext.platform || 'Unknown',
        version: pluginContext.version || '1.0.0',
        search: pluginContext.search,
        getMediaSource: pluginContext.getMediaSource,
        getLyric: pluginContext.getLyric,
        getAlbumInfo: pluginContext.getAlbumInfo,
        getArtistWorks: pluginContext.getArtistWorks,
        ...pluginContext
      };
    }

    return new NanguaPluginAdapter(nanguaPlugin);
  } catch (error) {
    console.error('Failed to create Nangua plugin adapter:', error);
    throw new Error(`Failed to parse Nangua plugin: ${error instanceof Error ? error.message : String(error)}`);
  }
}
