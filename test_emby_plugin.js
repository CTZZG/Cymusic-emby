/**
 * 测试用的Emby插件
 * 基于南瓜_emby_superd.js的简化版本，用于验证插件系统
 */

// 插件基本信息
const plugin = {
    platform: "Emby",
    version: "1.0.0",
    author: "CyMusic",
    srcUrl: "https://example.com/emby_plugin.js",
    
    // 用户变量配置
    userVariables: [
        {
            key: "serverUrl",
            name: "服务器地址",
            description: "Emby服务器的完整地址，例如：http://192.168.1.100:8096",
            type: "text",
            defaultValue: ""
        },
        {
            key: "username",
            name: "用户名",
            description: "Emby用户名",
            type: "text",
            defaultValue: ""
        },
        {
            key: "password",
            name: "密码",
            description: "Emby密码",
            type: "password",
            defaultValue: ""
        },
        {
            key: "deviceId",
            name: "设备ID",
            description: "设备标识符（可选）",
            type: "text",
            defaultValue: "CyMusic"
        }
    ],
    
    // 支持的搜索类型
    supportedSearchType: ["music", "album", "artist", "sheet"],
    
    // 缓存策略
    cacheControl: "cache",
    
    // 搜索功能
    async search(query, page, type) {
        const serverUrl = env.getUserVariables().serverUrl;
        const username = env.getUserVariables().username;
        const password = env.getUserVariables().password;
        
        if (!serverUrl || !username || !password) {
            throw new Error("请先配置Emby服务器信息");
        }
        
        try {
            // 获取访问令牌
            const token = await this.getAccessToken();
            if (!token) {
                throw new Error("获取访问令牌失败");
            }
            
            // 构建搜索参数
            const searchParams = {
                searchTerm: query,
                IncludeItemTypes: this.getItemTypeForSearch(type),
                Limit: 20,
                StartIndex: (page - 1) * 20,
                Recursive: true,
                Fields: "BasicSyncInfo,CanDelete,PrimaryImageAspectRatio,ProductionYear,Status,EndDate"
            };
            
            const url = `${serverUrl}/Users/${token.userId}/Items?${new URLSearchParams(searchParams)}`;
            
            const response = await env.fetch(url, {
                headers: {
                    'X-Emby-Token': token.token,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`搜索请求失败: ${response.status}`);
            }
            
            const data = await response.json();
            
            return {
                isEnd: data.Items.length < 20,
                data: data.Items.map(item => this.convertToStandardFormat(item, type))
            };
            
        } catch (error) {
            env.log('error', `搜索失败: ${error.message}`);
            throw error;
        }
    },
    
    // 获取音源
    async getMediaSource(musicItem, quality) {
        const serverUrl = env.getUserVariables().serverUrl;
        const deviceId = env.getUserVariables().deviceId || 'CyMusic';
        
        try {
            const token = await this.getAccessToken();
            if (!token) {
                throw new Error("获取访问令牌失败");
            }
            
            // 获取播放信息
            const playbackInfoUrl = `${serverUrl}/Items/${musicItem.id}/PlaybackInfo`;
            const playbackInfoData = {
                UserId: token.userId,
                Id: musicItem.id,
                EnableDirectPlay: true,
                EnableDirectStream: true,
                AllowVideoStreamCopy: true,
                AllowAudioStreamCopy: true,
                IsPlayback: true,
                AutoOpenLiveStream: false
            };
            
            const playbackResponse = await env.fetch(playbackInfoUrl, {
                method: 'POST',
                headers: {
                    'X-Emby-Token': token.token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(playbackInfoData)
            });
            
            if (!playbackResponse.ok) {
                throw new Error(`获取播放信息失败: ${playbackResponse.status}`);
            }
            
            const playbackInfo = await playbackResponse.json();
            
            if (playbackInfo.MediaSources && playbackInfo.MediaSources.length > 0) {
                const mediaSource = playbackInfo.MediaSources[0];
                const streamUrl = `${serverUrl}/Audio/${musicItem.id}/stream?Static=true&MediaSourceId=${mediaSource.Id}&DeviceId=${deviceId}&api_key=${token.token}`;
                
                return {
                    url: streamUrl,
                    headers: {
                        'User-Agent': 'CyMusic/1.0'
                    }
                };
            }
            
            throw new Error("未找到可用的媒体源");
            
        } catch (error) {
            env.log('error', `获取音源失败: ${error.message}`);
            throw error;
        }
    },
    
    // 获取歌词
    async getLyric(musicItem) {
        const serverUrl = env.getUserVariables().serverUrl;
        
        try {
            const token = await this.getAccessToken();
            if (!token) {
                return { rawLrc: "" };
            }
            
            // 获取音乐详情，包含媒体流信息
            const itemUrl = `${serverUrl}/Users/${token.userId}/Items/${musicItem.id}?Fields=MediaSources,MediaStreams`;
            
            const response = await env.fetch(itemUrl, {
                headers: {
                    'X-Emby-Token': token.token,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                return { rawLrc: "" };
            }
            
            const itemData = await response.json();
            
            // 检查是否有内嵌歌词
            if (itemData.MediaSources && itemData.MediaSources[0] && itemData.MediaSources[0].MediaStreams) {
                for (const stream of itemData.MediaSources[0].MediaStreams) {
                    if (stream.Type === 'Subtitle' && stream.Extradata) {
                        const lrcContent = stream.Extradata;
                        if (lrcContent && lrcContent.includes('[') && lrcContent.includes(']')) {
                            return { rawLrc: lrcContent };
                        }
                    }
                }
            }
            
            return { rawLrc: "" };
            
        } catch (error) {
            env.log('error', `获取歌词失败: ${error.message}`);
            return { rawLrc: "" };
        }
    },
    
    // 播放状态回调
    playbackCallback: {
        async onPlaybackStart(musicItem) {
            env.log('info', `开始播放: ${musicItem.title}`);
            // 可以在这里上报播放开始状态到Emby服务器
        },
        
        async onPlaybackProgress(musicItem, position, duration) {
            // 定期上报播放进度到Emby服务器
            if (position % 30 === 0) { // 每30秒上报一次
                env.log('info', `播放进度: ${musicItem.title} - ${position}/${duration}`);
            }
        },
        
        async onPlaybackPause(musicItem) {
            env.log('info', `暂停播放: ${musicItem.title}`);
        },
        
        async onPlaybackStop(musicItem) {
            env.log('info', `停止播放: ${musicItem.title}`);
        }
    },
    
    // 辅助方法：获取访问令牌
    async getAccessToken() {
        const serverUrl = env.getUserVariables().serverUrl;
        const username = env.getUserVariables().username;
        const password = env.getUserVariables().password;
        const deviceId = env.getUserVariables().deviceId || 'CyMusic';
        
        try {
            const authUrl = `${serverUrl}/Users/authenticatebyname`;
            const authData = {
                Username: username,
                Pw: password,
                PasswordMd5: "", // 可以使用MD5加密
            };
            
            const response = await env.fetch(authUrl, {
                method: 'POST',
                headers: {
                    'X-Emby-Authorization': `MediaBrowser Client="CyMusic", Device="Mobile", DeviceId="${deviceId}", Version="1.0.0"`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(authData)
            });
            
            if (!response.ok) {
                throw new Error(`认证失败: ${response.status}`);
            }
            
            const authResult = await response.json();
            
            return {
                token: authResult.AccessToken,
                userId: authResult.User.Id
            };
            
        } catch (error) {
            env.log('error', `获取访问令牌失败: ${error.message}`);
            return null;
        }
    },
    
    // 辅助方法：根据搜索类型获取Emby项目类型
    getItemTypeForSearch(type) {
        switch (type) {
            case 'music': return 'Audio';
            case 'album': return 'MusicAlbum';
            case 'artist': return 'MusicArtist';
            case 'sheet': return 'Playlist';
            default: return 'Audio';
        }
    },
    
    // 辅助方法：转换为标准格式
    convertToStandardFormat(item, type) {
        const serverUrl = env.getUserVariables().serverUrl;
        
        const baseItem = {
            platform: "Emby",
            id: item.Id,
        };
        
        switch (type) {
            case 'music':
                return {
                    ...baseItem,
                    title: item.Name,
                    artist: item.Artists ? item.Artists.join(', ') : item.AlbumArtist || '未知艺人',
                    album: item.Album || '未知专辑',
                    duration: item.RunTimeTicks ? Math.floor(item.RunTimeTicks / 10000000) : 0,
                    artwork: item.ImageTags && item.ImageTags.Primary 
                        ? `${serverUrl}/Items/${item.Id}/Images/Primary?maxHeight=300&maxWidth=300&quality=90`
                        : undefined
                };
                
            case 'album':
                return {
                    ...baseItem,
                    title: item.Name,
                    artist: item.AlbumArtist || '未知艺人',
                    artwork: item.ImageTags && item.ImageTags.Primary 
                        ? `${serverUrl}/Items/${item.Id}/Images/Primary?maxHeight=300&maxWidth=300&quality=90`
                        : undefined,
                    worksNum: item.ChildCount || 0
                };
                
            case 'artist':
                return {
                    ...baseItem,
                    name: item.Name,
                    avatar: item.ImageTags && item.ImageTags.Primary 
                        ? `${serverUrl}/Items/${item.Id}/Images/Primary?maxHeight=300&maxWidth=300&quality=90`
                        : undefined
                };
                
            case 'sheet':
                return {
                    ...baseItem,
                    title: item.Name,
                    artist: '系统歌单',
                    artwork: item.ImageTags && item.ImageTags.Primary 
                        ? `${serverUrl}/Items/${item.Id}/Images/Primary?maxHeight=300&maxWidth=300&quality=90`
                        : undefined,
                    worksNum: item.ChildCount || 0
                };
                
            default:
                return baseItem;
        }
    }
};

// 导出插件
module.exports = plugin;
