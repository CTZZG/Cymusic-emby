/**
 * 插件状态管理
 */

import { create } from 'zustand';
import { pluginManager } from '../core/PluginManager';
import { IPluginState } from '../types/PluginTypes';

interface PluginStoreState {
  // 状态
  plugins: IPluginState[];
  loading: boolean;
  error: string | null;

  // 操作
  loadPlugins: () => Promise<void>;
  addPlugin: (source: string | File, autoEnable?: boolean) => Promise<void>;
  removePlugin: (pluginId: string) => Promise<void>;
  updatePlugin: (pluginId: string) => Promise<void>;
  enablePlugin: (pluginId: string) => Promise<void>;
  disablePlugin: (pluginId: string) => Promise<void>;
  setPluginVariable: (pluginId: string, key: string, value: string) => Promise<void>;
  refreshPlugins: () => void;
  clearError: () => void;
  getPlugin: (pluginId: string) => IPluginState | undefined;
}

export const usePluginStore = create<PluginStoreState>((set, get) => ({
  // 初始状态
  plugins: [],
  loading: false,
  error: null,

  // 加载所有插件
  loadPlugins: async () => {
    set({ loading: true, error: null });

    try {
      await pluginManager.loadPluginConfig();
      const plugins = pluginManager.getAllPlugins();
      set({ plugins, loading: false });
    } catch (error) {
      console.error('Failed to load plugins:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to load plugins',
        loading: false
      });
    }
  },

  // 添加插件
  addPlugin: async (source: string | File, autoEnable = true) => {
    set({ loading: true, error: null });

    try {
      await pluginManager.loadPlugin(source, { autoEnable });
      const plugins = pluginManager.getAllPlugins();
      set({ plugins, loading: false });
    } catch (error) {
      console.error('Failed to add plugin:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to add plugin',
        loading: false
      });
      throw error;
    }
  },

  // 移除插件
  removePlugin: async (pluginId: string) => {
    set({ loading: true, error: null });

    try {
      await pluginManager.unloadPlugin(pluginId);
      const plugins = pluginManager.getAllPlugins();
      set({ plugins, loading: false });
    } catch (error) {
      console.error('Failed to remove plugin:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to remove plugin',
        loading: false
      });
      throw error;
    }
  },

  // 更新插件
  updatePlugin: async (pluginId: string) => {
    set({ loading: true, error: null });

    try {
      await pluginManager.updatePlugin(pluginId);
      const plugins = pluginManager.getAllPlugins();
      set({ plugins, loading: false });
    } catch (error) {
      console.error('Failed to update plugin:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to update plugin',
        loading: false
      });
      throw error;
    }
  },

  // 启用插件
  enablePlugin: async (pluginId: string) => {
    set({ error: null });

    try {
      await pluginManager.enablePlugin(pluginId);
      const plugins = pluginManager.getAllPlugins();
      set({ plugins });
    } catch (error) {
      console.error('Failed to enable plugin:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to enable plugin'
      });
      throw error;
    }
  },

  // 禁用插件
  disablePlugin: async (pluginId: string) => {
    set({ error: null });

    try {
      await pluginManager.disablePlugin(pluginId);
      const plugins = pluginManager.getAllPlugins();
      set({ plugins });
    } catch (error) {
      console.error('Failed to disable plugin:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to disable plugin'
      });
      throw error;
    }
  },

  // 设置插件变量
  setPluginVariable: async (pluginId: string, key: string, value: string) => {
    set({ error: null });

    try {
      await pluginManager.setPluginVariable(pluginId, key, value);
      const plugins = pluginManager.getAllPlugins();
      set({ plugins });
    } catch (error) {
      console.error('Failed to set plugin variable:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to set plugin variable'
      });
      throw error;
    }
  },

  // 刷新插件列表
  refreshPlugins: () => {
    const plugins = pluginManager.getAllPlugins();
    set({ plugins });
  },

  // 清除错误
  clearError: () => {
    set({ error: null });
  },

  // 获取插件
  getPlugin: (pluginId: string) => {
    const { plugins } = get();
    return plugins.find(plugin => plugin.id === pluginId);
  }
}));

// 选择器函数
export const selectEnabledPlugins = (state: PluginStoreState) =>
  state.plugins.filter(plugin => plugin.enabled);

export const selectPluginById = (pluginId: string) => (state: PluginStoreState) =>
  state.plugins.find(plugin => plugin.id === pluginId);

export const selectPluginsByPlatform = (platform: string) => (state: PluginStoreState) =>
  state.plugins.filter(plugin => plugin.instance.platform === platform);

export const selectPluginsWithSearch = (state: PluginStoreState) =>
  state.plugins.filter(plugin =>
    plugin.enabled &&
    plugin.instance.search &&
    typeof plugin.instance.search === 'function'
  );

export const selectPluginsWithMediaSource = (state: PluginStoreState) =>
  state.plugins.filter(plugin =>
    plugin.enabled &&
    plugin.instance.getMediaSource &&
    typeof plugin.instance.getMediaSource === 'function'
  );

export const selectPluginsWithLyrics = (state: PluginStoreState) =>
  state.plugins.filter(plugin =>
    plugin.enabled &&
    plugin.instance.getLyric &&
    typeof plugin.instance.getLyric === 'function'
  );

export const selectPluginsWithTopLists = (state: PluginStoreState) =>
  state.plugins.filter(plugin =>
    plugin.enabled &&
    plugin.instance.getTopLists &&
    typeof plugin.instance.getTopLists === 'function'
  );

export const selectPluginsWithRecommendSheets = (state: PluginStoreState) =>
  state.plugins.filter(plugin =>
    plugin.enabled &&
    plugin.instance.getRecommendSheetsByTag &&
    typeof plugin.instance.getRecommendSheetsByTag === 'function'
  );

// 插件统计信息
export const usePluginStats = () => {
  const plugins = usePluginStore(state => state.plugins);

  return {
    total: plugins.length,
    enabled: plugins.filter(p => p.enabled).length,
    disabled: plugins.filter(p => !p.enabled).length,
    withErrors: plugins.filter(p => p.error).length,
    withSearch: plugins.filter(p => p.instance.search).length,
    withMediaSource: plugins.filter(p => p.instance.getMediaSource).length,
    withLyrics: plugins.filter(p => p.instance.getLyric).length,
    withTopLists: plugins.filter(p => p.instance.getTopLists).length,
    withRecommendSheets: plugins.filter(p => p.instance.getRecommendSheetsByTag).length
  };
};

// 初始化插件store
export const initializePluginStore = async () => {
  try {
    await usePluginStore.getState().loadPlugins();
    console.log('Plugin store initialized successfully');
  } catch (error) {
    console.error('Failed to initialize plugin store:', error);
  }
};
