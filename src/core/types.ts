// 插件系统类型定义

// 重用现有的音乐项类型，但添加插件系统需要的字段
export interface MusicItem {
  id: string;
  title: string;
  artist: string;
  album?: string;
  artwork?: string;
  duration?: number;
  url?: string;
  platform: string;
  _source?: string;
  isAlbum?: boolean;
  isArtist?: boolean;
  [key: string]: any;
}

export interface SearchResult {
  data: MusicItem[];
  hasMore: boolean;
  page?: number;
}

export interface LyricResult {
  rawLrc: string;
  translation?: string;
}

export interface AlbumDetail {
  id: string;
  title: string;
  artist: string;
  artwork?: string;
  description?: string;
  tracks: MusicItem[];
}

export interface ArtistDetail {
  id: string;
  name: string;
  avatar?: string;
  description?: string;
  albums?: AlbumDetail[];
  tracks?: MusicItem[];
}

export interface RecommendationResult {
  recentlyAdded?: MusicItem[];
  mostPlayed?: MusicItem[];
  recentlyPlayed?: MusicItem[];
  randomTracks?: MusicItem[];
}

export type SearchType = 'music' | 'album' | 'artist';

export interface ConfigField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'number' | 'boolean' | 'select';
  required?: boolean;
  placeholder?: string;
  options?: { label: string; value: any }[];
  defaultValue?: any;
}

export interface ConfigSchema {
  fields: ConfigField[];
}

export interface PluginConfig {
  [key: string]: any;
}

// 插件接口
export interface MusicPlugin {
  // 基本信息
  name: string;
  version: string;
  author: string;
  description: string;
  homepage?: string;

  // 核心功能
  search(keyword: string, type: SearchType, page?: number): Promise<SearchResult>;
  getPlayUrl(musicItem: MusicItem): Promise<string>;
  getLyric(musicItem: MusicItem): Promise<LyricResult | null>;

  // 可选功能
  getAlbumDetail?(albumId: string): Promise<AlbumDetail>;
  getArtistDetail?(artistId: string): Promise<ArtistDetail>;
  getRecommendations?(): Promise<RecommendationResult>;

  // 配置相关
  getConfigSchema?(): ConfigSchema;
  setConfig?(config: PluginConfig): void;
  getConfig?(): PluginConfig;
  testConnection?(): Promise<boolean>;

  // 生命周期
  onLoad?(): Promise<void>;
  onUnload?(): Promise<void>;
}

// 插件元数据
export interface PluginMetadata {
  name: string;
  version: string;
  author: string;
  description: string;
  homepage?: string;
  enabled: boolean;
  config?: PluginConfig;
  filePath?: string;
  source?: 'builtin' | 'imported' | 'downloaded';
}

// 插件状态
export interface PluginState {
  plugins: Map<string, MusicPlugin>;
  metadata: Map<string, PluginMetadata>;
  enabledPlugins: Set<string>;
  configs: Map<string, PluginConfig>;
}

// 南瓜插件适配器类型
export interface NanguaPlugin {
  platform: string;
  version: string;
  author?: string;
  description?: string;

  // 南瓜插件的标准方法
  search?: (query: any, page: number, type: string) => Promise<any>;
  getMediaSource?: (musicItem: any, quality?: string) => Promise<any>;
  getLyric?: (musicItem: any) => Promise<any>;
  getAlbumInfo?: (albumItem: any, page?: number) => Promise<any>;
  getArtistWorks?: (artistItem: any, page?: number, type?: string) => Promise<any>;

  // 其他可能的方法
  [key: string]: any;
}

// 插件导入结果
export interface PluginImportResult {
  success: boolean;
  plugin?: MusicPlugin;
  metadata?: PluginMetadata;
  error?: string;
}

// 插件验证结果
export interface PluginValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// 搜索聚合结果
export interface AggregatedSearchResult {
  results: Array<{
    pluginName: string;
    data: MusicItem[];
    hasMore: boolean;
  }>;
  totalCount: number;
}

// 插件事件
export type PluginEvent =
  | { type: 'plugin_loaded'; pluginName: string }
  | { type: 'plugin_unloaded'; pluginName: string }
  | { type: 'plugin_enabled'; pluginName: string }
  | { type: 'plugin_disabled'; pluginName: string }
  | { type: 'plugin_config_changed'; pluginName: string; config: PluginConfig }
  | { type: 'plugin_error'; pluginName: string; error: string };

// 插件管理器配置
export interface PluginManagerConfig {
  maxConcurrentSearches?: number;
  searchTimeout?: number;
  enablePluginValidation?: boolean;
  allowUnsafePlugins?: boolean;
}
