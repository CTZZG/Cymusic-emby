# CyMusic 插件架构重构总结

## 项目概述

本次重构将 CyMusic 从单一的 Emby 音乐客户端转变为支持多插件的通用音乐平台，实现了完整的插件化架构。

## 架构设计

### 核心组件

1. **PluginManager** (`src/core/PluginManager.ts`)
   - 插件生命周期管理
   - 插件加载、启用、禁用、删除
   - 插件实例管理和环境隔离

2. **PlaybackStatusReporter** (`src/core/PlaybackStatusReporter.ts`)
   - 播放状态回调系统
   - 支持播放开始、进度、暂停、停止事件
   - 自动分发给所有启用的插件

3. **PluginStore** (`src/store/pluginStore.ts`)
   - 插件状态管理
   - 持久化存储
   - 响应式更新

### 类型定义

- **IPluginState** (`src/types/PluginTypes.ts`)
  - 插件状态接口
  - 包含插件信息、配置、实例等

- **MediaTypes** (`src/types/MediaTypes.ts`)
  - 媒体类型定义
  - 支持音乐、专辑、艺人、歌单等

## 实现的功能

### Phase 1: 核心架构
✅ 插件管理器实现
✅ 播放状态回调系统
✅ 插件存储系统
✅ 类型定义和接口

### Phase 2: UI界面
✅ 插件管理页面
✅ 插件设置页面
✅ 插件卡片组件
✅ 从URL导入插件
✅ 插件变量配置
✅ 插件启用/禁用/删除/更新

### Phase 3: 搜索系统
✅ 按插件分组的搜索结果
✅ 级联TabView界面
✅ 多插件并行搜索
✅ 搜索结果聚合显示
✅ 支持多种媒体类型

### Phase 4: 播放系统
✅ 插件优先的音源获取
✅ 插件优先的歌词获取
✅ 播放状态回调集成
✅ 向后兼容Emby功能
✅ 应用启动时插件系统初始化

### Phase 5: 测试与优化
✅ 插件系统测试工具
✅ 插件调试页面
✅ 系统状态监控
✅ 完整性测试套件

## 插件接口规范

### 基本结构
```javascript
module.exports = {
    platform: "插件名称",
    version: "版本号",
    author: "作者",
    srcUrl: "源码地址",
    
    // 用户变量配置
    userVariables: [
        {
            key: "变量键",
            name: "显示名称",
            description: "描述",
            type: "text|password|number",
            defaultValue: "默认值"
        }
    ],
    
    // 支持的搜索类型
    supportedSearchType: ["music", "album", "artist", "sheet"],
    
    // 搜索功能
    async search(query, page, type) {
        return {
            isEnd: boolean,
            data: Array
        };
    },
    
    // 获取音源
    async getMediaSource(musicItem, quality) {
        return {
            url: "播放地址",
            headers: {}
        };
    },
    
    // 获取歌词
    async getLyric(musicItem) {
        return {
            rawLrc: "LRC格式歌词"
        };
    },
    
    // 播放状态回调
    playbackCallback: {
        async onPlaybackStart(musicItem) {},
        async onPlaybackProgress(musicItem, position, duration) {},
        async onPlaybackPause(musicItem) {},
        async onPlaybackStop(musicItem) {}
    }
};
```

### 环境API
插件可以通过 `env` 对象访问以下API：
- `env.fetch()` - 网络请求
- `env.log()` - 日志记录
- `env.getUserVariables()` - 获取用户配置

## 文件结构

```
src/
├── core/
│   ├── PluginManager.ts          # 插件管理器
│   └── PlaybackStatusReporter.ts # 播放状态回调
├── store/
│   └── pluginStore.ts            # 插件状态管理
├── types/
│   ├── PluginTypes.ts            # 插件类型定义
│   └── MediaTypes.ts             # 媒体类型定义
├── components/
│   ├── plugin/
│   │   └── PluginCard.tsx        # 插件卡片组件
│   └── search/
│       └── SearchResultsByPlugin.tsx # 搜索结果组件
├── app/(modals)/
│   ├── pluginManager.tsx         # 插件管理页面
│   ├── pluginSettings.tsx        # 插件设置页面
│   └── pluginDebug.tsx           # 插件调试页面
└── utils/
    └── pluginSystemTest.ts       # 插件系统测试
```

## 向后兼容性

- 保持现有Emby功能完全可用
- 原有的音源获取逻辑作为后备方案
- 现有用户界面和操作流程不变
- 渐进式迁移到插件系统

## 使用方式

### 1. 添加插件
- 在设置 → 插件管理 → 添加插件
- 输入插件URL或粘贴插件代码
- 系统自动验证和加载插件

### 2. 配置插件
- 在插件列表中点击设置按钮
- 配置插件所需的用户变量
- 保存配置后插件即可使用

### 3. 使用插件功能
- 搜索：自动在所有启用插件中搜索
- 播放：优先使用插件获取音源
- 歌词：优先使用插件获取歌词

### 4. 调试插件
- 在设置 → 插件调试
- 运行各种测试验证插件功能
- 查看系统状态和插件详情

## 技术特点

1. **模块化设计**：每个组件职责单一，易于维护
2. **类型安全**：完整的TypeScript类型定义
3. **响应式状态**：使用Zustand进行状态管理
4. **错误处理**：完善的错误捕获和用户提示
5. **性能优化**：插件并行执行，缓存机制
6. **安全隔离**：插件运行在受控环境中

## 扩展性

- 支持任意数量的插件
- 插件可以实现部分或全部功能
- 支持插件热更新和动态加载
- 可扩展新的媒体类型和功能

## 测试覆盖

- 插件加载和管理测试
- 搜索功能测试
- 音源获取测试
- 播放状态回调测试
- 存储功能测试
- 系统集成测试

## 未来规划

1. **插件市场**：建立官方插件仓库
2. **插件开发工具**：提供开发和调试工具
3. **更多媒体类型**：支持视频、播客等
4. **云同步**：插件配置云端同步
5. **社区生态**：鼓励社区贡献插件

## 总结

本次重构成功将CyMusic转变为一个开放、可扩展的音乐平台。通过插件化架构，用户可以：

- 使用多个音源服务
- 享受更丰富的功能
- 参与社区生态建设
- 获得持续的功能更新

插件系统的实现为CyMusic的未来发展奠定了坚实的基础，使其能够适应不断变化的音乐服务生态。
