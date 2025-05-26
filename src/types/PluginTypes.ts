/**
 * 插件系统类型定义
 * 基于 MusicFree 插件协议规范
 */

import {
  IMusicItem,
  IAlbumItem,
  IArtistItem,
  IMusicSheetItem,
  IComment,
  SupportMediaType,
  ISearchResult,
  IMediaSourceResult,
  ILyricSource,
  IGetAlbumInfoResult,
  IGetSheetInfoResult,
  ITopListInfoResult,
  IMusicSheetGroupItem,
  IGetRecommendSheetTagsResult,
  ITag,
  ArtistMediaType,
  QualityType
} from './MediaTypes';

// 用户变量定义
export interface IUserVariable {
  /** 变量键 */
  key: string;
  /** 变量名称 */
  name?: string;
  /** 变量描述 */
  description?: string;
  /** 变量类型 */
  type?: 'text' | 'password' | 'number' | 'boolean';
  /** 默认值 */
  defaultValue?: string;
}

// 插件提示文案
export interface IPluginHints {
  /** 导入歌单时的提示 */
  importMusicSheet?: string[];
  /** 导入单曲时的提示 */
  importMusicItem?: string[];
}

// 缓存策略
export type CacheControl = 'cache' | 'no-cache' | 'no-store';

// 插件环境接口
export interface IPluginEnvironment {
  /** 获取用户变量 */
  getUserVariables(): Record<string, string>;
  /** 设置用户变量 */
  setUserVariable(key: string, value: string): void;
  /** 日志记录 */
  log(level: 'info' | 'warn' | 'error', message: string): void;
  /** 网络请求 */
  fetch(url: string, options?: RequestInit): Promise<Response>;
}

// 播放状态回调接口
export interface IPlaybackCallback {
  /** 播放开始 */
  onPlaybackStart?(musicItem: IMusicItem): Promise<void> | void;
  /** 播放进度更新 */
  onPlaybackProgress?(musicItem: IMusicItem, position: number, duration: number): Promise<void> | void;
  /** 播放暂停 */
  onPlaybackPause?(musicItem: IMusicItem): Promise<void> | void;
  /** 播放停止 */
  onPlaybackStop?(musicItem: IMusicItem): Promise<void> | void;
  /** 播放错误 */
  onPlaybackError?(musicItem: IMusicItem, error: Error): Promise<void> | void;
  /** 播放完成 */
  onPlaybackComplete?(musicItem: IMusicItem): Promise<void> | void;
}

// 插件接口定义
export interface IPlugin {
  /** 插件名称 */
  platform: string;
  /** 插件作者 */
  author?: string;
  /** 插件版本号 */
  version?: string;
  /** 插件更新地址 */
  srcUrl?: string;
  /** 主键 */
  primaryKey?: string[];
  /** 缓存策略 */
  cacheControl?: CacheControl;
  /** 提示文案 */
  hints?: IPluginHints;
  /** 用户变量 */
  userVariables?: IUserVariable[];
  /** 支持的搜索类型 */
  supportedSearchType?: SupportMediaType[];

  // 插件方法
  /** 搜索 */
  search?<T extends SupportMediaType>(
    query: string,
    page: number,
    type: T
  ): Promise<ISearchResult<T>>;

  /** 获取音源 */
  getMediaSource?(
    mediaItem: IMusicItem,
    quality?: QualityType
  ): Promise<IMediaSourceResult | null>;

  /** 获取音乐详情 */
  getMusicInfo?(musicItem: IMusicItem): Promise<Partial<IMusicItem> | null>;

  /** 获取歌词 */
  getLyric?(musicItem: IMusicItem): Promise<ILyricSource | null>;

  /** 获取专辑详情 */
  getAlbumInfo?(albumItem: IAlbumItem, page: number): Promise<IGetAlbumInfoResult>;

  /** 获取歌单详情 */
  getMusicSheetInfo?(sheetItem: IMusicSheetItem, page: number): Promise<IGetSheetInfoResult>;

  /** 获取作者作品 */
  getArtistWorks?<T extends ArtistMediaType>(
    artistItem: IArtistItem,
    page: number,
    type: T
  ): Promise<ISearchResult<T>>;

  /** 导入单曲 */
  importMusicItem?(urlLike: string): Promise<IMusicItem>;

  /** 导入歌单 */
  importMusicSheet?(urlLike: string): Promise<IMusicItem[]>;

  /** 获取榜单列表 */
  getTopLists?(): Promise<IMusicSheetGroupItem[]>;

  /** 获取榜单详情 */
  getTopListDetail?(topListItem: IMusicSheetItem, page: number): Promise<ITopListInfoResult>;

  /** 获取推荐歌单标签 */
  getRecommendSheetTags?(): Promise<IGetRecommendSheetTagsResult>;

  /** 获取某个标签下的歌单 */
  getRecommendSheetsByTag?(
    tag: ITag,
    page?: number
  ): Promise<{
    isEnd: boolean;
    data: Array<IMusicSheetItem>;
  }>;

  /** 获取音乐评论 */
  getMusicComments?(musicItem: IMusicItem): Promise<{
    isEnd: boolean;
    data: Array<IComment>;
  }>;

  // 播放状态回调（可选）
  playbackCallback?: IPlaybackCallback;
}

// 插件状态
export interface IPluginState {
  /** 插件ID */
  id: string;
  /** 插件实例 */
  instance: IPlugin;
  /** 是否启用 */
  enabled: boolean;
  /** 用户变量 */
  userVariables: Record<string, string>;
  /** 加载时间 */
  loadTime: number;
  /** 错误信息 */
  error?: string;
}

// 插件配置
export interface IPluginConfig {
  /** 插件ID */
  id: string;
  /** 插件名称 */
  name: string;
  /** 插件源（URL或本地路径） */
  source: string;
  /** 是否启用 */
  enabled: boolean;
  /** 用户变量 */
  userVariables: Record<string, string>;
  /** 安装时间 */
  installTime: number;
  /** 最后更新时间 */
  updateTime: number;
}

// 插件加载选项
export interface IPluginLoadOptions {
  /** 是否立即启用 */
  autoEnable?: boolean;
  /** 用户变量 */
  userVariables?: Record<string, string>;
  /** 是否覆盖已存在的插件 */
  overwrite?: boolean;
}

// 插件管理器接口
export interface IPluginManager {
  /** 加载插件 */
  loadPlugin(source: string | File, options?: IPluginLoadOptions): Promise<IPluginState>;
  /** 卸载插件 */
  unloadPlugin(pluginId: string): Promise<void>;
  /** 更新插件 */
  updatePlugin(pluginId: string): Promise<IPluginState>;
  /** 获取插件 */
  getPlugin(pluginId: string): IPluginState | null;
  /** 获取所有插件 */
  getAllPlugins(): IPluginState[];
  /** 获取启用的插件 */
  getEnabledPlugins(): IPluginState[];
  /** 启用插件 */
  enablePlugin(pluginId: string): Promise<void>;
  /** 禁用插件 */
  disablePlugin(pluginId: string): Promise<void>;
  /** 设置插件变量 */
  setPluginVariable(pluginId: string, key: string, value: string): Promise<void>;
  /** 获取插件变量 */
  getPluginVariable(pluginId: string, key: string): string | undefined;
  /** 保存插件配置 */
  savePluginConfig(): Promise<void>;
  /** 加载插件配置 */
  loadPluginConfig(): Promise<void>;
}

// 插件错误类型
export class PluginError extends Error {
  constructor(
    message: string,
    public pluginId: string,
    public method?: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'PluginError';
  }
}
