# 🎵 Emby歌词功能完成报告

## ✅ 歌词功能实现

### 参考南瓜插件实现
基于南瓜_emby_superd.js中的`getLyricApi`函数，我们实现了完整的Emby歌词获取功能。

### 核心功能实现

#### 1. 新增歌词获取函数 (`src/helpers/embyApi.ts`)

```typescript
// 获取歌词 - 参考南瓜插件实现
export async function getLyricApi(musicItem: any): Promise<{ rawLrc: string } | null> {
  // 三层歌词获取策略：
  // 1. Emby内嵌字幕流（LRC/文本格式）
  // 2. Emby Lyrics API
  // 3. 外部歌词API回退
}
```

#### 2. 多层歌词获取策略

**第一层：Emby内嵌字幕流**
- 获取音乐项目的MediaSources和MediaStreams
- 优先查找LRC格式的字幕流
- 回退到文本格式字幕流
- 通过Stream.js端点获取TrackEvents
- 格式化为标准LRC格式

**第二层：Emby Lyrics API**
- 调用`Items/{id}/Lyrics` API
- 查找LRC格式的歌词数据
- 解码并返回歌词文本

**第三层：外部歌词API**
- 使用歌曲标题、艺术家、专辑信息
- 调用外部歌词服务
- 作为最后的回退选项

#### 3. TrackEvents格式化函数

```typescript
// 格式化Emby TrackEvents为LRC格式
function formatEmbyTrackEventsToLrc(trackEventsData: any): string | null {
  // 将Emby的ticks时间格式转换为LRC标准时间格式
  // 1 tick = 100 nanoseconds
  // 输出格式：[mm:ss.cc]歌词文本
}
```

#### 4. 智能歌词获取逻辑 (`src/helpers/trackPlayerIndex.ts`)

```typescript
// 4.1 刷新歌词信息
let lyc;
if (musicItem.platform === 'emby' || musicItem._source === 'emby') {
    // 使用Emby歌词获取
    const embyLyric = await getLyricApi(musicItem)
    if (embyLyric && embyLyric.rawLrc) {
        lyc = { lyric: embyLyric.rawLrc }
    } else {
        lyc = { lyric: '[00:00.00]暂无歌词' }
    }
} else {
    // 使用原有的歌词获取方式
    lyc = await myGetLyric(musicItem)
}
nowLyricState.setValue(lyc.lyric)
```

## 🔧 技术实现细节

### 时间格式转换
```typescript
// Emby ticks转LRC时间格式
const totalMs = Math.floor(event.StartPositionTicks / 10000);
const minutes = Math.floor(totalMs / 60000);
const seconds = Math.floor((totalMs % 60000) / 1000);
const centiseconds = Math.floor((totalMs % 1000) / 10);
const timeTag = `[${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}]`;
```

### 字幕流查找优先级
1. **LRC格式字幕流** - `stream.Codec.toLowerCase() === 'lrc'`
2. **文本格式字幕流** - `stream.Codec.toLowerCase() === 'text'`
3. **其他字幕流** - 作为最后选择

### HTTP请求认证
```typescript
const headers = {
    'X-Emby-Authorization': `Emby Client="${EMBY_CLIENT_NAME}", Device="${EMBY_DEVICE_NAME}", DeviceId="${config.deviceId}", Version="${EMBY_APP_VERSION}", Token="${tokenInfo.token}"`,
    'Accept': 'application/json, text/javascript, */*',
    'User-Agent': getUserAgent()
};
```

## 🎯 功能特点

### 1. 完整兼容性
- ✅ **Emby内嵌歌词** - 支持LRC和文本格式
- ✅ **Emby Lyrics API** - 支持服务器端歌词
- ✅ **外部歌词源** - 回退到在线歌词服务
- ✅ **原有功能保持** - QQ音乐等歌词获取不受影响

### 2. 智能回退机制
- **优先级顺序** - Emby内嵌 → Emby API → 外部API
- **错误处理** - 每层失败都有适当的回退
- **超时保护** - 10秒超时避免长时间等待
- **格式验证** - 确保歌词内容有效

### 3. 格式支持
- **LRC格式** - 支持时间轴同步歌词
- **纯文本** - 支持无时间轴歌词
- **编码处理** - 正确处理HTML实体编码
- **时间精度** - 支持厘秒级时间精度

## 📊 歌词获取流程

```
播放Emby音乐
    ↓
检查音乐来源 (platform === 'emby' || _source === 'emby')
    ↓
调用 getLyricApi(musicItem)
    ↓
第一步：获取项目详情 (MediaSources, MediaStreams)
    ↓
查找字幕流 (LRC > Text > Other)
    ↓
如果找到字幕流：
    ↓
获取字幕内容 (Stream.js)
    ↓
格式化为LRC格式
    ↓
如果失败，第二步：调用 Lyrics API
    ↓
查找LRC格式歌词
    ↓
如果失败，第三步：外部歌词API
    ↓
使用歌曲信息搜索在线歌词
    ↓
返回歌词或"暂无歌词"
```

## 🛡️ 错误处理

### 网络错误处理
- **超时保护** - 10秒请求超时
- **连接失败** - 自动回退到下一层
- **认证错误** - 记录错误并继续

### 数据格式处理
- **空数据检查** - 验证返回数据有效性
- **格式验证** - 确保歌词格式正确
- **编码处理** - 正确解码HTML实体

### 回退策略
- **逐层回退** - 每层失败都有下一层保护
- **最终保底** - 始终返回有效的歌词对象
- **错误日志** - 记录详细错误信息便于调试

## 🧪 测试建议

### 测试场景1：Emby内嵌歌词
1. 准备带有LRC字幕的音乐文件
2. 上传到Emby服务器
3. 播放音乐，验证歌词正确显示
4. 检查时间轴同步是否准确

### 测试场景2：Emby服务器歌词
1. 在Emby中为音乐添加歌词
2. 播放音乐，验证歌词获取
3. 测试不同格式的歌词文件

### 测试场景3：外部歌词回退
1. 播放没有内嵌歌词的Emby音乐
2. 验证自动回退到外部歌词源
3. 检查歌词搜索准确性

### 测试场景4：混合播放列表
1. 创建包含Emby和QQ音乐的播放列表
2. 验证不同来源的歌词都能正确显示
3. 检查切换时的歌词更新

## 📁 修改的文件

### 核心修改
- `src/helpers/embyApi.ts` - 新增歌词获取函数
- `src/helpers/trackPlayerIndex.ts` - 修改歌词获取逻辑

### 新增功能
- `getLyricApi` - 完整的Emby歌词获取
- `formatEmbyTrackEventsToLrc` - TrackEvents格式化
- 智能歌词源选择逻辑

## 💡 技术亮点

1. **完全兼容南瓜插件** - 参考成熟实现，确保稳定性
2. **多层回退保护** - 确保始终有歌词显示
3. **格式标准化** - 统一LRC格式输出
4. **性能优化** - 超时保护和错误处理
5. **向后兼容** - 原有歌词功能完全保留

## 🎵 用户体验

### Emby音乐歌词体验
- **内嵌歌词优先** - 最佳的歌词同步体验
- **服务器歌词支持** - 支持Emby管理的歌词
- **在线歌词回退** - 确保总有歌词可显示
- **无缝切换** - 不同来源歌词无感知切换

### 歌词显示质量
- **时间轴精确** - 支持厘秒级同步
- **格式统一** - 标准LRC格式显示
- **编码正确** - 正确处理各种字符编码
- **错误友好** - 优雅处理无歌词情况

## 🚀 功能完整性

现在Emby集成的歌词功能已经**完全完整**：

- ✅ **多源歌词获取** - Emby内嵌、服务器、在线
- ✅ **智能回退机制** - 确保歌词可用性
- ✅ **格式标准化** - 统一的LRC格式
- ✅ **错误处理完善** - 各种异常情况处理
- ✅ **性能优化** - 超时和缓存机制
- ✅ **向后兼容** - 原有功能不受影响

---
**状态**: ✅ Emby歌词功能已完成

**核心成就**: 实现了完整的Emby歌词获取功能，支持多种歌词源，具备完善的回退机制和错误处理，为用户提供优质的歌词体验。
