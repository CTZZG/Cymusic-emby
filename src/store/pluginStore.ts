import { create } from 'zustand';
import { PluginManager } from '../core/PluginManager';
import { 
  MusicPlugin, 
  PluginMetadata, 
  PluginConfig, 
  PluginImportResult,
  SearchResult,
  SearchType,
  MusicItem,
  LyricResult
} from '../core/types';
import { NanguaPluginAdapter, createNanguaPluginAdapter } from '../core/NanguaPluginAdapter';
import { embyPlugin } from '../plugins/emby/EmbyPlugin';
import PersistStatus from './PersistStatus';

interface PluginState {
  // 插件管理器
  pluginManager: PluginManager;
  
  // 插件列表
  plugins: Array<{ plugin: MusicPlugin; metadata: PluginMetadata }>;
  enabledPlugins: Array<{ plugin: MusicPlugin; metadata: PluginMetadata }>;
  
  // 状态
  isLoading: boolean;
  error: string | null;
  
  // 操作方法
  initializePlugins: () => Promise<void>;
  registerPlugin: (plugin: MusicPlugin, metadata?: Partial<PluginMetadata>) => Promise<boolean>;
  unregisterPlugin: (pluginName: string) => Promise<boolean>;
  enablePlugin: (pluginName: string) => boolean;
  disablePlugin: (pluginName: string) => boolean;
  setPluginConfig: (pluginName: string, config: PluginConfig) => Promise<boolean>;
  testPluginConnection: (pluginName: string) => Promise<boolean>;
  
  // 插件导入
  importPluginFromCode: (code: string, metadata?: Partial<PluginMetadata>) => Promise<PluginImportResult>;
  importNanguaPlugin: (code: string) => Promise<PluginImportResult>;
  
  // 音乐功能
  searchAll: (keyword: string, type?: SearchType, page?: number) => Promise<SearchResult[]>;
  getPlayUrl: (musicItem: MusicItem) => Promise<string>;
  getLyric: (musicItem: MusicItem) => Promise<LyricResult | null>;
  
  // 内部方法
  refreshPluginList: () => void;
  loadPersistedConfigs: () => void;
  savePluginConfig: (pluginName: string, config: PluginConfig) => void;
}

export const usePluginStore = create<PluginState>((set, get) => {
  const pluginManager = new PluginManager({
    maxConcurrentSearches: 5,
    searchTimeout: 10000,
    enablePluginValidation: true,
    allowUnsafePlugins: false
  });

  // 监听插件事件
  pluginManager.addEventListener((event) => {
    console.log('Plugin event:', event);
    
    // 刷新插件列表
    get().refreshPluginList();
    
    // 保存配置
    if (event.type === 'plugin_config_changed') {
      get().savePluginConfig(event.pluginName, event.config);
    }
  });

  return {
    pluginManager,
    plugins: [],
    enabledPlugins: [],
    isLoading: false,
    error: null,

    // 初始化插件系统
    initializePlugins: async () => {
      set({ isLoading: true, error: null });
      
      try {
        // 加载持久化的配置
        get().loadPersistedConfigs();
        
        // 注册内置插件
        await get().registerPlugin(embyPlugin, {
          source: 'builtin',
          enabled: true
        });
        
        // 加载用户导入的插件
        const importedPlugins = PersistStatus.get('plugins.imported') || [];
        for (const pluginData of importedPlugins) {
          try {
            if (pluginData.type === 'nangua') {
              await get().importNanguaPlugin(pluginData.code);
            } else {
              await get().importPluginFromCode(pluginData.code, pluginData.metadata);
            }
          } catch (error) {
            console.error(`Failed to load imported plugin:`, error);
          }
        }
        
        get().refreshPluginList();
        set({ isLoading: false });
      } catch (error) {
        console.error('Failed to initialize plugins:', error);
        set({ 
          isLoading: false, 
          error: error instanceof Error ? error.message : String(error)
        });
      }
    },

    // 注册插件
    registerPlugin: async (plugin: MusicPlugin, metadata?: Partial<PluginMetadata>) => {
      try {
        const success = await pluginManager.registerPlugin(plugin, metadata);
        if (success) {
          get().refreshPluginList();
        }
        return success;
      } catch (error) {
        console.error('Failed to register plugin:', error);
        set({ error: error instanceof Error ? error.message : String(error) });
        return false;
      }
    },

    // 卸载插件
    unregisterPlugin: async (pluginName: string) => {
      try {
        const success = await pluginManager.unregisterPlugin(pluginName);
        if (success) {
          get().refreshPluginList();
          
          // 从持久化存储中移除
          const importedPlugins = PersistStatus.get('plugins.imported') || [];
          const updatedPlugins = importedPlugins.filter((p: any) => p.name !== pluginName);
          PersistStatus.set('plugins.imported', updatedPlugins);
        }
        return success;
      } catch (error) {
        console.error('Failed to unregister plugin:', error);
        set({ error: error instanceof Error ? error.message : String(error) });
        return false;
      }
    },

    // 启用插件
    enablePlugin: (pluginName: string) => {
      const success = pluginManager.enablePlugin(pluginName);
      if (success) {
        get().refreshPluginList();
      }
      return success;
    },

    // 禁用插件
    disablePlugin: (pluginName: string) => {
      const success = pluginManager.disablePlugin(pluginName);
      if (success) {
        get().refreshPluginList();
      }
      return success;
    },

    // 设置插件配置
    setPluginConfig: async (pluginName: string, config: PluginConfig) => {
      try {
        const success = await pluginManager.setPluginConfig(pluginName, config);
        if (success) {
          get().savePluginConfig(pluginName, config);
        }
        return success;
      } catch (error) {
        console.error('Failed to set plugin config:', error);
        set({ error: error instanceof Error ? error.message : String(error) });
        return false;
      }
    },

    // 测试插件连接
    testPluginConnection: async (pluginName: string) => {
      try {
        return await pluginManager.testPluginConnection(pluginName);
      } catch (error) {
        console.error('Plugin connection test failed:', error);
        return false;
      }
    },

    // 从代码导入插件
    importPluginFromCode: async (code: string, metadata?: Partial<PluginMetadata>) => {
      try {
        // 这里需要实现安全的代码执行
        // 暂时返回错误，需要进一步实现
        throw new Error('Direct code import not implemented yet');
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    },

    // 导入南瓜插件
    importNanguaPlugin: async (code: string) => {
      try {
        const adapter = createNanguaPluginAdapter(code);
        const success = await get().registerPlugin(adapter, {
          source: 'imported',
          enabled: true
        });
        
        if (success) {
          // 保存到持久化存储
          const importedPlugins = PersistStatus.get('plugins.imported') || [];
          importedPlugins.push({
            name: adapter.name,
            type: 'nangua',
            code: code,
            metadata: {
              name: adapter.name,
              version: adapter.version,
              author: adapter.author,
              description: adapter.description
            }
          });
          PersistStatus.set('plugins.imported', importedPlugins);
        }
        
        return {
          success,
          plugin: success ? adapter : undefined,
          metadata: success ? pluginManager.getPluginMetadata(adapter.name) : undefined
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    },

    // 聚合搜索
    searchAll: async (keyword: string, type: SearchType = 'music', page: number = 1) => {
      try {
        const result = await pluginManager.searchAll(keyword, type, page);
        return result.results.map(r => ({
          data: r.data,
          hasMore: r.hasMore,
          page,
          pluginName: r.pluginName
        }));
      } catch (error) {
        console.error('Search failed:', error);
        throw error;
      }
    },

    // 获取播放URL
    getPlayUrl: async (musicItem: MusicItem) => {
      try {
        return await pluginManager.getPlayUrl(musicItem);
      } catch (error) {
        console.error('Failed to get play URL:', error);
        throw error;
      }
    },

    // 获取歌词
    getLyric: async (musicItem: MusicItem) => {
      try {
        return await pluginManager.getLyric(musicItem);
      } catch (error) {
        console.error('Failed to get lyric:', error);
        return null;
      }
    },

    // 刷新插件列表
    refreshPluginList: () => {
      const allPlugins = pluginManager.getAllPlugins();
      const enabledPlugins = pluginManager.getEnabledPlugins();
      
      set({
        plugins: allPlugins,
        enabledPlugins: enabledPlugins
      });
    },

    // 加载持久化的配置
    loadPersistedConfigs: () => {
      const configs = PersistStatus.get('plugins.configs') || {};
      
      Object.entries(configs).forEach(([pluginName, config]) => {
        pluginManager.setPluginConfig(pluginName, config as PluginConfig);
      });
    },

    // 保存插件配置
    savePluginConfig: (pluginName: string, config: PluginConfig) => {
      const configs = PersistStatus.get('plugins.configs') || {};
      configs[pluginName] = config;
      PersistStatus.set('plugins.configs', configs);
    }
  };
});

// 导出便捷的hooks
export const usePlugins = () => {
  const store = usePluginStore();
  return {
    plugins: store.plugins,
    enabledPlugins: store.enabledPlugins,
    isLoading: store.isLoading,
    error: store.error
  };
};

export const usePluginActions = () => {
  const store = usePluginStore();
  return {
    initializePlugins: store.initializePlugins,
    registerPlugin: store.registerPlugin,
    unregisterPlugin: store.unregisterPlugin,
    enablePlugin: store.enablePlugin,
    disablePlugin: store.disablePlugin,
    setPluginConfig: store.setPluginConfig,
    testPluginConnection: store.testPluginConnection,
    importNanguaPlugin: store.importNanguaPlugin
  };
};

export const usePluginMusic = () => {
  const store = usePluginStore();
  return {
    searchAll: store.searchAll,
    getPlayUrl: store.getPlayUrl,
    getLyric: store.getLyric
  };
};
