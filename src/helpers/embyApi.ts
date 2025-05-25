import axios from 'axios';
import CryptoJS from 'crypto-js';
import he from 'he';
import qs from 'qs';

// 常量定义
const PAGE_SIZE = 50;
const LYRICS_API_BASE_URL = 'https://lrc.xms.mx';
const DURATION_TOLERANCE_SECONDS = 5;
const PROGRESS_REPORT_INTERVAL_MS = 10000;
const PLAYED_DURATION_INCREMENT_INTERVAL_MS = 1000;

const QQ_MATCH_CANDIDATES_LIMIT = 30;
const QQ_IMPORT_CONCURRENCY = 5;
const NCM_MATCH_CANDIDATES_LIMIT = 30;
const NCM_IMPORT_CONCURRENCY = 10;

const EMBY_CLIENT_NAME = 'CyMusic';
const EMBY_DEVICE_NAME = 'CyMusic Client (Emby Plugin)';
const EMBY_APP_VERSION = '1.1.7';

const ALL_SONGS_SHEET_INSTANCE_ID = 'emby_special_allsongs_sheet_instance';
const ALL_SONGS_FIXED_ARTWORK_URL = 'https://p1.music.126.net/oT-RHuPBJiD7WMoU7WG5Rw==/109951166093489621.jpg';
const FETCH_ALL_LIMIT = 999999;

const EXTERNAL_ARTWORK_CHECK_TIMEOUT_MS = 300;
const EXTERNAL_API_USER_AGENT = 'CyMusic/1.0.0';

// 类型定义
export interface EmbyConfig {
  url: string;
  username: string;
  password: string;
  deviceId?: string;
  uploadPlaylistToEmby?: boolean;
}

export interface EmbyTokenInfo {
  token: string;
  userId: string;
  serverId: string;
  expiry: number;
}

export interface EmbyPlaybackData {
  itemId: string;
  mediaSourceId: string;
  playSessionId: string;
  positionTicks: number;
}

// 全局状态
let embyConfig: EmbyConfig | null = null;
let embyTokenCache: EmbyTokenInfo | null = null;
let embyUserDetailsCache: any = null;
let currentPlayingTrackInfo: any = null;
let globalEmbyDeviceId: string | null = null;

// 工具函数
function getUserAgent(): string {
  return `CyMusic/${EMBY_APP_VERSION}`;
}

function normalize(str: string): string {
  if (!str) return '';
  let cleanedStr = str.replace(/(?:\s*[(（\[【].*?[)）\]】]\s*)$/, '');
  return cleanedStr
    .replace(/[\s!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~\u200B-\u200D\uFEFF]/gu, '')
    .toLowerCase();
}

function deduplicateTracks(tracks: any[]): any[] {
  const seen = new Set();
  return tracks.filter(function(track) {
    if (!track || !track.id) return false;
    const trackSignature = `${track.id}-${normalize(track.title)}-${normalize(track.artist)}`;
    if (seen.has(trackSignature)) return false;
    seen.add(trackSignature);
    return true;
  });
}

function normalizeUrl(url: string): string {
  if (!url) return '';
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = `http://${url}`;
  }
  return url.replace(/\/+$/, "");
}

function initializeGlobalDeviceId(): void {
  if (globalEmbyDeviceId) return;

  const configDeviceId = embyConfig?.deviceId;

  if (configDeviceId && configDeviceId.trim() !== "") {
    globalEmbyDeviceId = configDeviceId;
  } else {
    const username = embyConfig?.username;
    if (username && username.trim() !== "") {
      try {
        globalEmbyDeviceId = CryptoJS.MD5(username).toString(CryptoJS.enc.Hex);
      } catch (e) {
        globalEmbyDeviceId = 'e21cc73f4e89eb1fad0657fd667442df';
      }
    } else {
      globalEmbyDeviceId = 'e21cc73f4e89eb1fad0657fd667442df';
    }
  }
}

// 初始化配置
export function initializeEmby(config: EmbyConfig): void {
  embyConfig = config;
  initializeGlobalDeviceId();
}

// 获取当前配置
export function getEmbyConfig(): EmbyConfig | null {
  return embyConfig;
}

// 认证相关函数
export async function getEmbyToken(forceRefresh: boolean = false): Promise<EmbyTokenInfo | null> {
  if (!embyConfig) {
    console.error('Emby config not initialized');
    return null;
  }

  initializeGlobalDeviceId();

  const { url, username, password } = embyConfig;

  if (!url || !username || !password) {
    return null;
  }

  const now = Date.now();
  if (!forceRefresh && embyTokenCache && embyTokenCache.expiry > now && embyTokenCache.userId) {
    return embyTokenCache;
  }

  const authUrl = `${normalizeUrl(url)}/Users/AuthenticateByName`;
  const headers = {
    'Content-Type': 'application/json',
    'X-Emby-Authorization': `Emby Client="${EMBY_CLIENT_NAME}", Device="${EMBY_DEVICE_NAME}", DeviceId="${globalEmbyDeviceId}", Version="${EMBY_APP_VERSION}"`,
    'User-Agent': getUserAgent()
  };

  try {
    const response = await axios.post(authUrl, { Username: username, Pw: password }, { headers: headers, timeout: 15000 });
    if (response.data && response.data.AccessToken && response.data.User && response.data.User.Id) {
      embyTokenCache = {
        token: response.data.AccessToken,
        userId: response.data.User.Id,
        serverId: response.data.ServerId,
        expiry: now + 23 * 60 * 60 * 1000
      };
      embyUserDetailsCache = response.data.User;
      return embyTokenCache;
    }
    return null;
  } catch (error) {
    console.error('Emby authentication failed:', error);
    return null;
  }
}

export async function getEmbyApiAuthHeaders(forceTokenRefresh: boolean = false): Promise<Record<string, string> | null> {
  initializeGlobalDeviceId();

  const tokenInfo = await getEmbyToken(forceTokenRefresh);
  if (!tokenInfo) return null;

  let authHeader = `Emby Client="${EMBY_CLIENT_NAME}", Device="${EMBY_DEVICE_NAME}", DeviceId="${globalEmbyDeviceId}", Version="${EMBY_APP_VERSION}"`;
  if (tokenInfo.token) {
    authHeader += `, Token="${tokenInfo.token}"`;
  }

  return {
    'X-Emby-Authorization': authHeader,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': getUserAgent()
  };
}

// HTTP请求封装
export async function httpEmby(
  method: string,
  path: string,
  params: Record<string, any> = {},
  data: any = null,
  retryAttempt: number = 0
): Promise<any> {
  if (!embyConfig) {
    console.error('Emby config not initialized');
    return null;
  }

  const fullUrl = `${normalizeUrl(embyConfig.url)}/${path.startsWith('/') ? path.substring(1) : path}`;
  let headers;
  try {
    headers = await getEmbyApiAuthHeaders(retryAttempt > 0);
    if (!headers) return null;
  } catch (authError) {
    return null;
  }

  const config = {
    method: method,
    url: fullUrl,
    headers: headers,
    timeout: 25000,
    paramsSerializer: function(p: any) { return qs.stringify(p, { arrayFormat: 'repeat' }); }
  };

  if (params && Object.keys(params).length > 0) {
    (config as any).params = params;
  }
  if (data) {
    (config as any).data = data;
  }

  try {
    const response = await axios(config);
    let totalCount = undefined;

    if (response.data && response.data.TotalRecordCount !== undefined) {
      totalCount = parseInt(response.data.TotalRecordCount, 10);
    } else if (response.headers && response.headers['x-total-count']) {
      totalCount = parseInt(response.headers['x-total-count'], 10);
    }

    if (method.toUpperCase() === 'GET' && totalCount !== undefined) {
      return { data: response.data, totalCount: totalCount, headers: response.headers };
    }
    return { data: response.data, headers: response.headers };
  } catch (error: any) {
    if (error.response) {
      if (error.response.status === 401 && retryAttempt === 0) {
        const refreshedTokenInfo = await getEmbyToken(true);
        if (refreshedTokenInfo) {
          return await httpEmby(method, path, params, data, 1);
        } else {
          return null;
        }
      }
    }
    console.error('Emby HTTP request failed:', error);
    return null;
  }
}

// 图片URL生成
export function generateEmbyArtworkUrl(
  itemId: string,
  imageType: string = 'Primary',
  imageTag?: string,
  maxWidth: number = 400,
  maxHeight: number = 400
): string | null {
  if (!embyConfig || !itemId) return null;

  let path = `/Items/${itemId}/Images/${imageType}`;

  let queryParams = [];
  if (maxWidth) queryParams.push(`maxWidth=${String(maxWidth)}`);
  if (maxHeight) queryParams.push(`maxHeight=${String(maxHeight)}`);
  if (imageTag) queryParams.push(`tag=${imageTag}`);
  queryParams.push('format=jpg');
  queryParams.push('quality=90');

  if (embyTokenCache?.token) {
    queryParams.push(`api_key=${embyTokenCache.token}`);
  }

  return `${normalizeUrl(embyConfig.url)}${path}?${queryParams.join('&')}`;
}

// 外部封面图获取
export async function buildExternalArtworkUrl(item: any): Promise<string | null> {
  if (!item || !item.title) {
    return null;
  }
  let urlToTest;
  try {
    let queryParams = [];
    queryParams.push(`title=${encodeURIComponent(item.title)}`);

    const artist = item.artist;
    if (artist && !['unknown artist', 'various artists'].includes(artist.toLowerCase())) {
      queryParams.push(`artist=${encodeURIComponent(artist)}`);
    }
    const album = item.album;
    if (album && !['unknown album'].includes(album.toLowerCase())) {
      queryParams.push(`album=${encodeURIComponent(album)}`);
    }
    urlToTest = `${LYRICS_API_BASE_URL}/cover?${queryParams.join('&')}`;
  } catch (e) {
    return null;
  }

  try {
    await axios.head(urlToTest, {
      timeout: EXTERNAL_ARTWORK_CHECK_TIMEOUT_MS,
      headers: { 'User-Agent': EXTERNAL_API_USER_AGENT }
    });
    return urlToTest;
  } catch (error) {
    return null;
  }
}

// 数据格式化函数
export async function formatMusicItem(embyItem: any): Promise<any> {
  const itemId = String(embyItem.Id);
  const title = embyItem.Name || "未知歌曲";
  let artistName = "未知艺术家";
  if (embyItem.ArtistItems && embyItem.ArtistItems.length > 0) {
    artistName = embyItem.ArtistItems.map(function(a: any) { return a.Name; }).join(' / ');
  } else if (embyItem.AlbumArtist) {
    artistName = embyItem.AlbumArtist;
  } else if (embyItem.Artists && embyItem.Artists.length > 0) {
    artistName = embyItem.Artists.join(' / ');
  }

  const album = embyItem.Album || "未知专辑";

  let artwork;

  if (embyItem.ImageTags && embyItem.ImageTags.Primary) {
    artwork = generateEmbyArtworkUrl(itemId, 'Primary', embyItem.ImageTags.Primary);
  } else if (embyItem.AlbumId && embyItem.AlbumPrimaryImageTag) {
    artwork = generateEmbyArtworkUrl(embyItem.AlbumId, 'Primary', embyItem.AlbumPrimaryImageTag);
  } else if (embyItem.ArtistItems && embyItem.ArtistItems.length > 0 && embyItem.ArtistItems[0].Id) {
    const primaryArtistId = String(embyItem.ArtistItems[0].Id);
    artwork = generateEmbyArtworkUrl(primaryArtistId, 'Backdrop');
  }

  const duration = embyItem.RunTimeTicks ? Math.round(embyItem.RunTimeTicks / 10000000) : undefined;
  let suffix;
  if (embyItem.MediaSources && embyItem.MediaSources.length > 0 && embyItem.MediaSources[0].Container) {
    suffix = embyItem.MediaSources[0].Container.toLowerCase();
  }

  const formattedItem = {
    id: itemId,
    title: he.decode(title),
    artist: he.decode(artistName),
    album: he.decode(album),
    artwork: artwork,
    duration: duration,
    platform: 'emby',
    url: '', // 将在播放时动态获取
    _albumId: embyItem.AlbumId ? String(embyItem.AlbumId) : undefined,
    _artistId: (embyItem.ArtistItems && embyItem.ArtistItems.length > 0 && embyItem.ArtistItems[0].Id) ? String(embyItem.ArtistItems[0].Id) : undefined,
    _mediaSources: embyItem.MediaSources,
    _imageTags: embyItem.ImageTags,
    _albumPrimaryImageTag: embyItem.AlbumPrimaryImageTag,
    _source: 'emby',
    _runTimeTicks: embyItem.RunTimeTicks
  };
  if (suffix) {
    (formattedItem as any).suffix = suffix;
  }
  return formattedItem;
}

// 搜索功能
export async function searchMusicInternal(query: string, page: number, limit: number = PAGE_SIZE): Promise<{ isEnd: boolean, data: any[] }> {
  const tokenInfo = await getEmbyToken();
  if (!tokenInfo) return { isEnd: true, data: [] };

  const params = {
    SearchTerm: query,
    IncludeItemTypes: 'Audio',
    Recursive: true,
    UserId: tokenInfo.userId,
    StartIndex: (page - 1) * limit,
    Limit: limit,
    Fields: 'PrimaryImageAspectRatio,MediaSources,Path,Album,AlbumId,ArtistItems,AlbumArtist,RunTimeTicks,ProviderIds,ImageTags,UserData,ChildCount,AlbumPrimaryImageTag'
  };
  const result = await httpEmby('GET', 'Items', params);
  if (!result || !result.data) return { isEnd: true, data: [] };

  const items = result.data.Items ? result.data.Items : [];
  const totalCount = result.totalCount !== undefined ? result.totalCount : items.length;
  const isEnd = (params.StartIndex + items.length) >= totalCount;
  const formattedData = await Promise.all(items.map((item: any) => formatMusicItem(item)));
  return { isEnd: isEnd, data: formattedData };
}

export async function searchAlbumInternal(query: string, page: number): Promise<{ isEnd: boolean, data: any[] }> {
  const tokenInfo = await getEmbyToken();
  if (!tokenInfo) return { isEnd: true, data: [] };

  const params = {
    SearchTerm: query,
    IncludeItemTypes: 'MusicAlbum',
    Recursive: true,
    UserId: tokenInfo.userId,
    StartIndex: (page - 1) * PAGE_SIZE,
    Limit: PAGE_SIZE,
    Fields: 'PrimaryImageAspectRatio,ProductionYear,Genres,AlbumArtist,ArtistItems,SongCount,ImageTags,UserData,ChildCount,PremiereDate,DateCreated'
  };
  const result = await httpEmby('GET', 'Items', params);
  if (!result || !result.data) return { isEnd: true, data: [] };

  const items = result.data.Items ? result.data.Items : [];
  const totalCount = result.totalCount !== undefined ? result.totalCount : items.length;
  const isEnd = (params.StartIndex + items.length) >= totalCount;
  const formattedData = await Promise.all(items.map((item: any) => formatAlbumItem(item)));
  return { isEnd: isEnd, data: formattedData };
}

export async function searchArtistInternal(query: string, page: number): Promise<{ isEnd: boolean, data: any[] }> {
  const tokenInfo = await getEmbyToken();
  if (!tokenInfo) return { isEnd: true, data: [] };

  const params = {
    SearchTerm: query,
    IncludeItemTypes: 'MusicArtist',
    Recursive: true,
    UserId: tokenInfo.userId,
    StartIndex: (page - 1) * PAGE_SIZE,
    Limit: PAGE_SIZE,
    Fields: 'PrimaryImageAspectRatio,ImageTags,UserData,Overview,ChildCount'
  };
  const result = await httpEmby('GET', 'Items', params);
  if (!result || !result.data) return { isEnd: true, data: [] };

  const items = result.data.Items ? result.data.Items : [];
  const totalCount = result.totalCount !== undefined ? result.totalCount : items.length;
  const isEnd = (params.StartIndex + items.length) >= totalCount;
  const formattedData = await Promise.all(items.map((item: any) => formatArtistItem(item)));
  return { isEnd: isEnd, data: formattedData };
}

// 格式化专辑数据
export async function formatAlbumItem(embyAlbum: any): Promise<any> {
  const albumId = String(embyAlbum.Id);
  const title = embyAlbum.Name || "未知专辑";
  const artist = embyAlbum.AlbumArtist || (embyAlbum.ArtistItems && embyAlbum.ArtistItems.length > 0 ? embyAlbum.ArtistItems.map(function(a: any){return a.Name;}).join(' / ') : "未知艺术家");

  let artwork = await buildExternalArtworkUrl({ title: title, artist: artist });

  if (!artwork) {
    const tokenInfo = await getEmbyToken();
    if (tokenInfo && tokenInfo.userId) {
      const tracksParams = {
        ParentId: albumId,
        IncludeItemTypes: 'Audio',
        Recursive: false,
        UserId: tokenInfo.userId,
        Fields: 'PrimaryImageAspectRatio,ImageTags,AlbumId,AlbumPrimaryImageTag',
        SortBy: 'ParentIndexNumber,SortName',
        SortOrder: 'Descending',
        Limit: 1
      };

      try {
        const tracksResult = await httpEmby('GET', `Users/${tokenInfo.userId}/Items`, tracksParams);
        if (tracksResult && tracksResult.data && tracksResult.data.Items && tracksResult.data.Items.length > 0) {
          const lastSongRaw = tracksResult.data.Items[0];
          if (lastSongRaw.ImageTags && lastSongRaw.ImageTags.Primary) {
            artwork = generateEmbyArtworkUrl(String(lastSongRaw.Id), 'Primary', lastSongRaw.ImageTags.Primary);
          } else if (lastSongRaw.AlbumId && lastSongRaw.AlbumPrimaryImageTag) {
            artwork = generateEmbyArtworkUrl(lastSongRaw.AlbumId, 'Primary', lastSongRaw.AlbumPrimaryImageTag);
          }
        }
      } catch (e) {}
    }
  }

  let description = `歌曲数: ${embyAlbum.SongCount || embyAlbum.ChildCount || '?'}`;
  if (embyAlbum.ProductionYear) description += ` | 年份: ${embyAlbum.ProductionYear}`;
  if (embyAlbum.Genres && embyAlbum.Genres.length > 0) description += ` | 类型: ${embyAlbum.Genres.join(', ')}`;

  return {
    id: albumId,
    title: he.decode(title),
    artist: he.decode(artist),
    artwork: artwork,
    description: he.decode(description),
    date: embyAlbum.PremiereDate ? embyAlbum.PremiereDate.substring(0,10) : (embyAlbum.ProductionYear ? String(embyAlbum.ProductionYear) : undefined),
    worksNum: embyAlbum.SongCount || embyAlbum.ChildCount,
    _songCount: embyAlbum.SongCount || embyAlbum.ChildCount,
    _productionYear: embyAlbum.ProductionYear,
    _genres: embyAlbum.Genres,
    _imageTags: embyAlbum.ImageTags,
  };
}

// 格式化艺术家数据
export async function formatArtistItem(embyArtist: any): Promise<any> {
  const artistId = String(embyArtist.Id);
  const name = embyArtist.Name || "未知艺术家";

  let avatar = await buildExternalArtworkUrl({ artist: name });

  if (!avatar && embyArtist.ImageTags && embyArtist.ImageTags.Primary) {
    avatar = generateEmbyArtworkUrl(artistId, 'Primary', embyArtist.ImageTags.Primary, 300, 300);
  }

  const userData = embyArtist.UserData;

  return {
    id: artistId,
    name: he.decode(name),
    avatar: avatar,
    description: embyArtist.Overview,
    fans: userData && userData.PlayCount !== undefined ? userData.PlayCount : undefined,
    worksNum: embyArtist.ChildCount,
  };
}

// 获取播放列表中的歌曲
export async function getEmbyPlaylistTracks(playlistId: string): Promise<any[]> {
  const tokenInfo = await getEmbyToken();
  if (!tokenInfo) return [];

  const params = {
    ParentId: playlistId,
    IncludeItemTypes: 'Audio',
    Recursive: false,
    UserId: tokenInfo.userId,
    Fields: 'PrimaryImageAspectRatio,MediaSources,Path,Album,AlbumId,ArtistItems,AlbumArtist,RunTimeTicks,ProviderIds,ImageTags,UserData,ChildCount,AlbumPrimaryImageTag',
    SortBy: 'SortName',
    SortOrder: 'Ascending'
  };

  const result = await httpEmby('GET', `Users/${tokenInfo.userId}/Items`, params);
  if (!result || !result.data || !result.data.Items) return [];

  const formattedTracks = await Promise.all(
    result.data.Items.map((item: any) => formatMusicItem(item))
  );

  return formattedTracks;
}

// 格式化Emby TrackEvents为LRC格式
function formatEmbyTrackEventsToLrc(trackEventsData: any): string | null {
  if (!trackEventsData || !trackEventsData.TrackEvents) return null;

  let lrcContent = '';
  for (const event of trackEventsData.TrackEvents) {
    if (event.StartPositionTicks && event.Text) {
      // 将ticks转换为时间格式 (1 tick = 100 nanoseconds)
      const totalMs = Math.floor(event.StartPositionTicks / 10000);
      const minutes = Math.floor(totalMs / 60000);
      const seconds = Math.floor((totalMs % 60000) / 1000);
      const centiseconds = Math.floor((totalMs % 1000) / 10);

      const timeTag = `[${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}]`;
      lrcContent += `${timeTag}${event.Text}\n`;
    }
  }

  return lrcContent || null;
}

// 获取歌词 - 参考南瓜插件实现
export async function getLyricApi(musicItem: any): Promise<{ rawLrc: string } | null> {
  const tokenInfo = await getEmbyToken();
  const config = getEmbyConfig();

  if (tokenInfo && tokenInfo.userId && config?.url && musicItem && musicItem.id) {
    try {
      // 第一步：获取音乐项目详情
      const itemDetailsParams = {
        UserId: tokenInfo.userId,
        Fields: 'MediaSources,MediaStreams'
      };

      const itemDetailsResult = await httpEmby('GET', `Users/${tokenInfo.userId}/Items/${musicItem.id}`, itemDetailsParams);

      if (itemDetailsResult && itemDetailsResult.data) {
        const itemData = itemDetailsResult.data;
        let mediaSourceId = null;
        let subtitleIndex = null;
        let subtitleCodec = null;

        // 获取MediaSource ID
        if (itemData.MediaSources && itemData.MediaSources.length > 0) {
          const preferredSource = itemData.MediaSources.find((s: any) => !s.IsInfiniteStream) || itemData.MediaSources[0];
          if (preferredSource) mediaSourceId = preferredSource.Id;
        }

        // 如果没有找到MediaSource，尝试通过PlaybackInfo获取
        if (!mediaSourceId) {
          const playbackInfoRequestBody = { UserId: tokenInfo.userId, Id: musicItem.id };
          const playbackDataResult = await httpEmby('POST', `Items/${musicItem.id}/PlaybackInfo`, {}, playbackInfoRequestBody);
          if (playbackDataResult && playbackDataResult.data && playbackDataResult.data.MediaSources && playbackDataResult.data.MediaSources.length > 0) {
            const preferredPbSource = playbackDataResult.data.MediaSources.find((s: any) => !s.IsInfiniteStream) || playbackDataResult.data.MediaSources[0];
            if (preferredPbSource) mediaSourceId = preferredPbSource.Id;
          }
        }

        // 查找字幕流
        if (itemData.MediaStreams) {
          const lrcStream = itemData.MediaStreams.find((stream: any) => {
            return stream.Type === 'Subtitle' && stream.Codec && stream.Codec.toLowerCase() === 'lrc';
          });

          if (lrcStream) {
            subtitleIndex = lrcStream.Index;
            subtitleCodec = 'lrc';
          } else {
            const textSubtitleStream = itemData.MediaStreams.find((stream: any) => {
              return stream.Type === 'Subtitle' && ((stream.Codec && stream.Codec.toLowerCase() === 'text') || !lrcStream);
            });
            if (textSubtitleStream) {
              subtitleIndex = textSubtitleStream.Index;
              subtitleCodec = textSubtitleStream.Codec;
            }
          }
        }

        // 如果找到了字幕流，尝试获取字幕内容
        if (mediaSourceId && subtitleIndex !== null) {
          const streamJsPath = `/Items/${musicItem.id}/${mediaSourceId}/Subtitles/${subtitleIndex}/Stream.js`;
          const streamJsUrl = `${config.url}${streamJsPath}`;

          const queryParams = {
            'MediaBrowser Client': EMBY_CLIENT_NAME,
            'Device': EMBY_DEVICE_NAME,
            'DeviceId': config.deviceId || 'cymusic',
            'Version': EMBY_APP_VERSION,
            'Token': tokenInfo.token
          };

          const queryString = Object.entries(queryParams)
            .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
            .join('&');

          const headers = {
            'X-Emby-Authorization': `Emby Client="${EMBY_CLIENT_NAME}", Device="${EMBY_DEVICE_NAME}", DeviceId="${config.deviceId || 'cymusic'}", Version="${EMBY_APP_VERSION}", Token="${tokenInfo.token}"`,
            'Accept': 'application/json, text/javascript, */*',
            'User-Agent': getUserAgent()
          };

          try {
            const response = await fetch(`${streamJsUrl}?${queryString}`, {
              method: 'GET',
              headers: headers,
              signal: AbortSignal.timeout(10000)
            });

            if (response.ok) {
              const streamData = await response.json();
              if (streamData && streamData.TrackEvents) {
                const lrcContent = formatEmbyTrackEventsToLrc(streamData);
                if (lrcContent) {
                  return { rawLrc: he.decode(lrcContent) };
                }
              }
            }
          } catch (streamError) {
            console.log('Failed to get subtitle stream:', streamError);
          }
        }
      }
    } catch (itemDetailsError) {
      console.log('Failed to get item details:', itemDetailsError);
    }

    // 第二步：尝试通过Lyrics API获取歌词
    try {
      const lyricDataResult = await httpEmby('GET', `Items/${musicItem.id}/Lyrics`, { UserId: tokenInfo.userId });
      if (lyricDataResult && lyricDataResult.data) {
        const lyricData = lyricDataResult.data;
        if (lyricData && lyricData.Lyrics && lyricData.Lyrics.length > 0) {
          const lrcLyric = lyricData.Lyrics.find((l: any) => {
            return l.Format && l.Format.toLowerCase() === 'lrc' && l.Type === 'Lyric';
          });
          if (lrcLyric && lrcLyric.Text) {
            return { rawLrc: he.decode(lrcLyric.Text) };
          }
        }
      }
    } catch (e) {
      console.log('Failed to get lyrics from Lyrics API:', e);
    }
  }

  // 第三步：如果Emby没有歌词，尝试外部歌词API
  if (!musicItem.title) return null;

  try {
    let queryParams = [];
    queryParams.push(`title=${encodeURIComponent(musicItem.title)}`);

    const artist = musicItem.artist;
    if (artist && !['unknown artist', 'various artists'].includes(artist.toLowerCase())) {
      queryParams.push(`artist=${encodeURIComponent(artist)}`);
    }

    const album = musicItem.album;
    if (album && !['unknown album'].includes(album.toLowerCase())) {
      queryParams.push(`album=${encodeURIComponent(album)}`);
    }

    const response = await fetch(`${LYRICS_API_BASE_URL}/lyrics?${queryParams.join('&')}`, {
      method: 'GET',
      headers: { 'User-Agent': EXTERNAL_API_USER_AGENT },
      signal: AbortSignal.timeout(10000)
    });

    if (response.ok) {
      const data = await response.text();
      if (data && typeof data === 'string' && data.trim()) {
        if (!data.toLowerCase().includes('not found') && data.length > 10) {
          return { rawLrc: he.decode(data) };
        }
      }
    }
  } catch (e) {
    console.log('Failed to get lyrics from external API:', e);
  }

  return null;
}
