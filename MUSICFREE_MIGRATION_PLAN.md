# CyMusic → MusicFree 架构改造计划

## 🎯 目标
将CyMusic改造为类似MusicFree的插件化架构，让所有音乐源都通过插件系统管理。

## 📋 改造阶段

### 第一阶段：插件系统基础 (1-2周)
1. **创建插件系统核心**
   - 定义插件接口标准
   - 实现插件管理器
   - 建立插件加载机制

2. **重构现有Emby集成**
   - 将当前Emby代码改造为插件
   - 保持现有功能不变
   - 测试插件化后的稳定性

### 第二阶段：插件管理界面 (1周)
1. **插件管理页面**
   - 插件列表显示
   - 插件启用/禁用
   - 插件配置界面

2. **插件导入功能**
   - 从文件导入插件
   - 从URL导入插件
   - 插件验证和安全检查

### 第三阶段：南瓜插件适配 (1周)
1. **南瓜插件适配器**
   - 分析南瓜_emby_superd.js结构
   - 创建适配层
   - 实现直接导入功能

2. **测试和优化**
   - 功能完整性测试
   - 性能优化
   - 错误处理完善

### 第四阶段：扩展和完善 (持续)
1. **更多插件支持**
   - 网易云音乐插件
   - QQ音乐插件
   - 其他音乐平台插件

2. **高级功能**
   - 插件热更新
   - 插件商店
   - 插件开发工具

## 🏗️ 技术架构

### 插件接口标准
```typescript
interface MusicPlugin {
  // 基本信息
  name: string;
  version: string;
  author: string;
  description: string;

  // 核心功能
  search(keyword: string, type: SearchType): Promise<SearchResult>;
  getPlayUrl(musicItem: MusicItem): Promise<string>;
  getLyric(musicItem: MusicItem): Promise<LyricResult>;

  // 可选功能
  getAlbumDetail?(albumId: string): Promise<AlbumDetail>;
  getArtistDetail?(artistId: string): Promise<ArtistDetail>;
  getRecommendations?(): Promise<RecommendationResult>;

  // 配置
  getConfigSchema?(): ConfigSchema;
  setConfig?(config: any): void;
  testConnection?(): Promise<boolean>;
}
```

### 插件管理器
```typescript
class PluginManager {
  private plugins: Map<string, MusicPlugin>;

  registerPlugin(plugin: MusicPlugin): void;
  unregisterPlugin(pluginName: string): void;
  getAllPlugins(): MusicPlugin[];
  getEnabledPlugins(): MusicPlugin[];

  // 聚合搜索
  async searchAll(keyword: string): Promise<SearchResult[]>;

  // 播放URL获取
  async getPlayUrl(musicItem: MusicItem): Promise<string>;

  // 歌词获取
  async getLyric(musicItem: MusicItem): Promise<LyricResult>;
}
```

## 📁 目录结构

```
src/
├── core/                    # 核心系统
│   ├── PluginSystem.ts     # 插件系统
│   ├── PluginManager.ts    # 插件管理器
│   ├── PluginLoader.ts     # 插件加载器
│   ├── PluginAdapter.ts    # 南瓜插件适配器
│   └── types.ts            # 类型定义
├── plugins/                # 插件目录
│   ├── emby/              # Emby插件
│   ├── local/             # 本地音乐插件
│   ├── netease/           # 网易云插件
│   └── template/          # 插件模板
├── store/
│   ├── pluginStore.ts     # 插件状态
│   └── configStore.ts     # 配置管理
└── components/
    ├── PluginManager/     # 插件管理界面
    └── PluginConfig/      # 插件配置界面
```

## 🔄 迁移策略

### 1. 渐进式迁移
- 保持现有功能正常运行
- 逐步将功能迁移到插件系统
- 向后兼容现有配置

### 2. 双轨运行
- 新插件系统与现有系统并行
- 用户可选择使用方式
- 逐步过渡到纯插件模式

### 3. 数据迁移
- 现有Emby配置自动迁移到插件配置
- 播放列表和收藏保持不变
- 用户设置平滑过渡

## 🎯 预期效果

### 用户体验
- 一键导入南瓜_emby_superd.js等插件
- 统一的插件管理界面
- 更丰富的音乐源选择

### 开发体验
- 标准化的插件开发接口
- 简化的插件开发流程
- 完善的开发文档和工具

### 系统架构
- 高度模块化的代码结构
- 易于扩展和维护
- 更好的错误隔离

## 📝 开发计划

### Week 1-2: 插件系统基础
- [ ] 定义插件接口
- [ ] 实现插件管理器
- [ ] 重构Emby为插件
- [ ] 基础测试

### Week 3: 插件管理界面
- [ ] 插件列表页面
- [ ] 插件配置界面
- [ ] 插件导入功能

### Week 4: 南瓜插件适配
- [ ] 分析南瓜插件结构
- [ ] 实现适配器
- [ ] 测试导入功能

### Week 5+: 扩展完善
- [ ] 更多插件支持
- [ ] 性能优化
- [ ] 文档完善

## 🚀 开始实施

### 创建新分支
```bash
git checkout -b feature/musicfree-architecture
```

### 已完成的文件
1. **核心系统**
   - `src/core/types.ts` - 插件系统类型定义
   - `src/core/PluginManager.ts` - 插件管理器
   - `src/core/NanguaPluginAdapter.ts` - 南瓜插件适配器

2. **插件实现**
   - `src/plugins/emby/EmbyPlugin.ts` - Emby插件示例

3. **状态管理**
   - `src/store/pluginStore.ts` - 插件状态管理

4. **UI组件**
   - `src/components/PluginManager/PluginList.tsx` - 插件列表组件

### 下一步操作

1. **集成到应用中**
   ```typescript
   // 在 _layout.tsx 中初始化插件系统
   import { usePluginStore } from '@/store/pluginStore';

   const App = () => {
     const { initializePlugins } = usePluginStore();

     useEffect(() => {
       initializePlugins();
     }, []);

     // ... 其他代码
   };
   ```

2. **创建插件管理页面**
   ```typescript
   // src/app/(modals)/pluginManager.tsx
   import PluginList from '@/components/PluginManager/PluginList';

   export default function PluginManagerScreen() {
     return <PluginList />;
   }
   ```

3. **测试南瓜插件导入**
   ```typescript
   import { usePluginActions } from '@/store/pluginStore';

   const { importNanguaPlugin } = usePluginActions();

   // 导入南瓜_emby_superd.js
   const result = await importNanguaPlugin(nanguaPluginCode);
   ```

### 测试计划

1. **基础功能测试**
   - 插件注册和卸载
   - 插件启用和禁用
   - 配置管理

2. **南瓜插件测试**
   - 导入南瓜_emby_superd.js
   - 搜索功能测试
   - 播放功能测试
   - 歌词功能测试

3. **集成测试**
   - 与现有功能的兼容性
   - 性能测试
   - 错误处理测试

这样可以保持主分支稳定，同时进行架构改造实验。
