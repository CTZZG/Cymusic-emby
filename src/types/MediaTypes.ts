/**
 * 基础媒体类型定义
 * 基于 MusicFree 的基本媒体类型规范
 */

// 基础类型：所有媒体类型都继承自此
export interface IMediaBase {
  /** 媒体来源（插件名） */
  platform: string;
  /** 媒体ID */
  id: string;
}

// 音乐类型
export interface IMusicItem extends IMediaBase {
  /** 作者 */
  artist: string;
  /** 歌曲标题 */
  title: string;
  /** 时长(s) */
  duration?: number;
  /** 专辑名 */
  album?: string;
  /** 专辑封面图 */
  artwork?: string;
  /** 默认音源 */
  url?: string;
  /** 歌词URL */
  lrc?: string;
  /** 歌词文本 */
  rawLrc?: string;
  /** 其他扩展字段 */
  [k: string | number | symbol]: any;
}

// 作者类型
export interface IArtistItem extends IMediaBase {
  /** 作者名 */
  name: string;
  /** 粉丝数 */
  fans?: number;
  /** 简介 */
  description?: string;
  /** 头像 */
  avatar?: string;
  /** 作者的单曲列表 */
  musicList?: IMusicItem[];
  /** 作者的专辑列表 */
  albumList?: IAlbumItem[];
}

// 专辑类型
export interface IAlbumItem extends IMediaBase {
  /** 封面图 */
  artwork?: string;
  /** 标题 */
  title: string;
  /** 描述 */
  description?: string;
  /** 作品总数 */
  worksNum?: number;
  /** 播放次数 */
  playCount?: number;
  /** 播放列表 */
  musicList?: IMusicItem[];
  /** 专辑创建日期 */
  createAt?: number;
  /** 专辑作者 */
  artist?: string;
}

// 歌单类型
export interface IMusicSheetItem extends IMediaBase {
  /** 作者 */
  artist: string;
  /** 歌单标题 */
  title: string;
  /** 时长(s) */
  duration?: number;
  /** 专辑名 */
  album?: string;
  /** 专辑封面图 */
  artwork?: string;
  /** 默认音源 */
  url?: string;
  /** 歌词URL */
  lrc?: string;
  /** 歌词文本 */
  rawLrc?: string;
  /** 描述 */
  description?: string;
  /** 作品总数 */
  worksNum?: number;
  /** 播放次数 */
  playCount?: number;
  /** 播放列表 */
  musicList?: IMusicItem[];
  /** 歌单创建日期 */
  createAt?: number;
  /** 其他扩展字段 */
  [k: string | number | symbol]: any;
}

// 评论类型
export interface IComment {
  id?: string;
  /** 用户名 */
  nickName: string;
  /** 头像 */
  avatar?: string;
  /** 评论内容 */
  comment: string;
  /** 点赞数 */
  like?: number;
  /** 评论时间 */
  createAt?: number;
  /** 地址 */
  location?: string;
  /** 回复 */
  replies?: Omit<IComment, 'replies'>[];
}

// 搜索结果类型
export type SupportMediaType = 'music' | 'album' | 'artist' | 'sheet' | 'lyric';

export type SupportMediaItem = {
  music: IMusicItem;
  album: IAlbumItem;
  artist: IArtistItem;
  sheet: IMusicSheetItem;
  lyric: IMusicItem;
};

export interface ISearchResult<T extends SupportMediaType> {
  isEnd?: boolean;
  data: SupportMediaItem[T][];
}

// 媒体源结果
export interface IMediaSourceResult {
  /** 请求URL所需要的headers */
  headers?: Record<string, string>;
  /** 请求URL所需要的user-agent */
  userAgent?: string;
  /** 音源 */
  url: string;
}

// 歌词源
export interface ILyricSource {
  /** 文本格式的歌词 */
  rawLrc?: string;
  /** 文本格式的翻译 */
  translation?: string;
}

// Tag相关类型
export interface ITag {
  /** tag 的唯一标识 */
  id: string;
  /** tag 标题 */
  title: string;
}

export interface ITagGroup {
  /** 分组标题 */
  title: string;
  /** tag 列表 */
  data: ITag[];
}

export interface IGetRecommendSheetTagsResult {
  /** 固定的tag */
  pinned?: ITag[];
  /** 更多面板中的tag */
  data?: ITagGroup[];
}

// 榜单分组信息
export interface IMusicSheetGroupItem {
  title?: string;
  data: Array<IMusicSheetItem>;
}

// 专辑信息获取结果
export interface IGetAlbumInfoResult {
  isEnd?: boolean;
  musicList: IMusicItem[];
  albumItem?: Partial<IAlbumItem>;
}

// 歌单信息获取结果
export interface IGetSheetInfoResult {
  isEnd?: boolean;
  musicList: IMusicItem[];
  sheetItem?: Partial<IMusicSheetItem>;
}

// 榜单详情结果
export interface ITopListInfoResult {
  isEnd?: boolean;
  topListItem?: IMusicSheetItem;
  musicList?: IMusicItem[];
}

// 作者作品类型
export type ArtistMediaType = 'music' | 'album';

// 音质类型
export type QualityType = "low" | "standard" | "high" | "super";
