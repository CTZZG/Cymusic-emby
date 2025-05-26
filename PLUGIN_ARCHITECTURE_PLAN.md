# CyMusic 插件化架构改造计划

## 🎯 目标
将CyMusic改造成框架+插件的形式，所有功能都通过自定义音源（插件）实现，最终目标是直接导入南瓜_emby_superd.js就能使用。

## 📋 改造范围

### 1. 核心架构调整

#### 1.1 插件系统核心
- **插件管理器** (`src/core/PluginManager.ts`)
  - 插件加载、卸载、更新
  - 插件生命周期管理
  - 插件间通信协调
  - 插件环境变量管理

- **插件运行时** (`src/core/PluginRuntime.ts`)
  - 插件沙箱环境
  - API调用代理
  - 错误处理和日志
  - 播放状态回调接口

#### 1.2 数据类型定义
- **基础媒体类型** (`src/types/MediaTypes.ts`)
  - IMusicItem, IAlbumItem, IArtistItem
  - IMusicSheetItem, IComment
  - 基于basic-type.md实现

- **插件协议类型** (`src/types/PluginTypes.ts`)
  - 插件接口定义
  - 回调函数类型
  - 环境变量类型
  - 基于protocol.md实现

### 2. UI界面改造

#### 2.1 设置页面重构
- **移除**: 当前的Emby配置界面
- **新增**: 插件管理入口
  - 插件列表展示
  - 从URL/本地导入插件
  - 插件环境变量配置
  - 插件启用/禁用开关

#### 2.2 主页改造
- **保持**: 现有布局结构
- **调整**: 数据来源改为插件聚合
  - 推荐歌单 → 各插件的getRecommendSheetsByTag
  - 榜单 → 各插件的getTopLists
  - 最近播放 → 本地存储 + 插件回调
  - 本地音乐 → 保持现有逻辑

#### 2.3 搜索页面重构
- **新架构**: 级联TabView
  ```
  搜索结果
  ├── 歌曲
  │   ├── 插件A (10首)
  │   ├── 插件B (8首)
  │   └── 插件C (12首)
  ├── 专辑
  │   ├── 插件A (5个)
  │   └── 插件B (3个)
  ├── 歌单
  └── 作者
  ```

### 3. 播放系统改造

#### 3.1 播放状态回调
- **新增回调接口**:
  ```typescript
  interface PlaybackCallback {
    onPlaybackStart?(musicItem: IMusicItem): void;
    onPlaybackProgress?(position: number, duration: number): void;
    onPlaybackPause?(): void;
    onPlaybackStop?(): void;
    onPlaybackError?(error: Error): void;
  }
  ```

#### 3.2 音源获取重构
- **统一接口**: 所有音源通过插件的getMediaSource获取
- **回退机制**: 插件失败时的处理策略
- **缓存策略**: 支持插件定义的cacheControl

### 4. 数据存储改造

#### 4.1 插件数据存储
- **插件配置**: `plugins.json`
- **环境变量**: `plugin-variables.json`
- **插件缓存**: `plugin-cache/`

#### 4.2 用户数据迁移
- **歌单数据**: 保持现有格式
- **播放历史**: 扩展支持插件来源标识
- **收藏数据**: 添加插件平台字段

## 🔧 技术实现

### 1. 插件加载机制
```typescript
class PluginManager {
  async loadPlugin(source: string | File): Promise<Plugin>
  async unloadPlugin(pluginId: string): Promise<void>
  async updatePlugin(pluginId: string): Promise<void>
  getPlugin(pluginId: string): Plugin | null
  getAllPlugins(): Plugin[]
  setPluginVariable(pluginId: string, key: string, value: string): void
}
```

### 2. 插件运行环境
```typescript
interface PluginEnvironment {
  getUserVariables(): Record<string, string>
  setUserVariable(key: string, value: string): void
  log(level: 'info' | 'warn' | 'error', message: string): void
  fetch(url: string, options?: RequestInit): Promise<Response>
}
```

### 3. 播放状态回调
```typescript
interface PlaybackStatusReporter {
  reportPlaybackStart(musicItem: IMusicItem): void
  reportPlaybackProgress(position: number, duration: number): void
  reportPlaybackPause(): void
  reportPlaybackStop(): void
  reportPlaybackError(error: Error): void
}
```

## 📁 文件结构

```
src/
├── core/
│   ├── PluginManager.ts          # 插件管理器
│   ├── PluginRuntime.ts          # 插件运行时
│   └── PlaybackStatusReporter.ts # 播放状态回调
├── types/
│   ├── MediaTypes.ts             # 媒体类型定义
│   ├── PluginTypes.ts            # 插件类型定义
│   └── PlaybackTypes.ts          # 播放回调类型
├── store/
│   ├── pluginStore.ts            # 插件状态管理
│   └── pluginVariableStore.ts    # 插件变量管理
├── app/(modals)/
│   ├── pluginManager.tsx         # 插件管理页面
│   └── pluginSettings.tsx        # 插件设置页面
└── components/
    ├── plugin/
    │   ├── PluginList.tsx         # 插件列表组件
    │   ├── PluginCard.tsx         # 插件卡片组件
    │   └── PluginVariables.tsx    # 插件变量配置
    └── search/
        └── SearchResultsByPlugin.tsx # 按插件分组的搜索结果
```

## 🚀 实施步骤

### Phase 1: 基础架构 (1-2周)
1. 创建插件类型定义
2. 实现插件管理器核心
3. 创建插件运行时环境
4. 实现基础的插件加载/卸载

### Phase 2: UI改造 (1-2周)
1. 创建插件管理页面
2. 重构设置页面
3. 实现插件变量配置界面
4. 调整主页数据源

### Phase 3: 搜索系统 (1周)
1. 重构搜索页面为级联TabView
2. 实现按插件分组的搜索结果
3. 优化搜索性能和用户体验

### Phase 4: 播放系统 (1周)
1. 实现播放状态回调接口
2. 重构音源获取逻辑
3. 集成插件的播放相关方法
4. 测试播放功能完整性

### Phase 5: 测试与优化 (1周)
1. 导入南瓜_emby_superd.js测试
2. 性能优化和错误处理
3. 用户体验优化
4. 文档完善

## 🎯 最终目标验证

### 成功标准
1. ✅ 能够直接导入南瓜_emby_superd.js
2. ✅ 所有Emby功能正常工作
3. ✅ 播放状态正确回调给插件
4. ✅ 搜索结果按插件正确分组
5. ✅ 插件环境变量配置正常
6. ✅ 插件更新机制工作正常

### 兼容性保证
- 现有用户数据完全兼容
- 现有播放列表和收藏保持不变
- 平滑的迁移体验

这个计划将CyMusic转变为一个真正的插件化音乐播放器框架，为后续扩展更多音源提供了坚实的基础。
