import { 
  MusicPlugin, 
  PluginMetadata, 
  PluginConfig, 
  SearchResult, 
  SearchType, 
  MusicItem, 
  LyricResult,
  AggregatedSearchResult,
  PluginEvent,
  PluginManagerConfig
} from './types';

export class PluginManager {
  private plugins: Map<string, MusicPlugin> = new Map();
  private metadata: Map<string, PluginMetadata> = new Map();
  private enabledPlugins: Set<string> = new Set();
  private configs: Map<string, PluginConfig> = new Map();
  private eventListeners: Array<(event: PluginEvent) => void> = [];
  private config: PluginManagerConfig;

  constructor(config: PluginManagerConfig = {}) {
    this.config = {
      maxConcurrentSearches: 5,
      searchTimeout: 10000,
      enablePluginValidation: true,
      allowUnsafePlugins: false,
      ...config
    };
  }

  // 事件监听
  addEventListener(listener: (event: PluginEvent) => void): void {
    this.eventListeners.push(listener);
  }

  removeEventListener(listener: (event: PluginEvent) => void): void {
    const index = this.eventListeners.indexOf(listener);
    if (index > -1) {
      this.eventListeners.splice(index, 1);
    }
  }

  private emitEvent(event: PluginEvent): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in plugin event listener:', error);
      }
    });
  }

  // 注册插件
  async registerPlugin(plugin: MusicPlugin, metadata?: Partial<PluginMetadata>): Promise<boolean> {
    try {
      const pluginMetadata: PluginMetadata = {
        name: plugin.name,
        version: plugin.version,
        author: plugin.author,
        description: plugin.description,
        homepage: plugin.homepage,
        enabled: true,
        source: 'imported',
        ...metadata
      };

      // 验证插件
      if (this.config.enablePluginValidation) {
        const validation = this.validatePlugin(plugin);
        if (!validation.valid) {
          console.error('Plugin validation failed:', validation.errors);
          return false;
        }
      }

      // 如果插件已存在，先卸载
      if (this.plugins.has(plugin.name)) {
        await this.unregisterPlugin(plugin.name);
      }

      // 注册插件
      this.plugins.set(plugin.name, plugin);
      this.metadata.set(plugin.name, pluginMetadata);
      
      if (pluginMetadata.enabled) {
        this.enabledPlugins.add(plugin.name);
      }

      // 设置配置
      if (pluginMetadata.config) {
        this.configs.set(plugin.name, pluginMetadata.config);
        if (plugin.setConfig) {
          plugin.setConfig(pluginMetadata.config);
        }
      }

      // 调用插件的onLoad方法
      if (plugin.onLoad) {
        await plugin.onLoad();
      }

      this.emitEvent({ type: 'plugin_loaded', pluginName: plugin.name });
      
      if (pluginMetadata.enabled) {
        this.emitEvent({ type: 'plugin_enabled', pluginName: plugin.name });
      }

      console.log(`Plugin "${plugin.name}" registered successfully`);
      return true;
    } catch (error) {
      console.error(`Failed to register plugin "${plugin.name}":`, error);
      this.emitEvent({ 
        type: 'plugin_error', 
        pluginName: plugin.name, 
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  // 卸载插件
  async unregisterPlugin(pluginName: string): Promise<boolean> {
    try {
      const plugin = this.plugins.get(pluginName);
      if (!plugin) {
        return false;
      }

      // 调用插件的onUnload方法
      if (plugin.onUnload) {
        await plugin.onUnload();
      }

      // 移除插件
      this.plugins.delete(pluginName);
      this.metadata.delete(pluginName);
      this.enabledPlugins.delete(pluginName);
      this.configs.delete(pluginName);

      this.emitEvent({ type: 'plugin_unloaded', pluginName });
      console.log(`Plugin "${pluginName}" unregistered successfully`);
      return true;
    } catch (error) {
      console.error(`Failed to unregister plugin "${pluginName}":`, error);
      return false;
    }
  }

  // 启用插件
  enablePlugin(pluginName: string): boolean {
    const metadata = this.metadata.get(pluginName);
    if (!metadata || !this.plugins.has(pluginName)) {
      return false;
    }

    metadata.enabled = true;
    this.enabledPlugins.add(pluginName);
    this.emitEvent({ type: 'plugin_enabled', pluginName });
    return true;
  }

  // 禁用插件
  disablePlugin(pluginName: string): boolean {
    const metadata = this.metadata.get(pluginName);
    if (!metadata) {
      return false;
    }

    metadata.enabled = false;
    this.enabledPlugins.delete(pluginName);
    this.emitEvent({ type: 'plugin_disabled', pluginName });
    return true;
  }

  // 获取所有插件
  getAllPlugins(): Array<{ plugin: MusicPlugin; metadata: PluginMetadata }> {
    const result: Array<{ plugin: MusicPlugin; metadata: PluginMetadata }> = [];
    
    for (const [name, plugin] of this.plugins) {
      const metadata = this.metadata.get(name);
      if (metadata) {
        result.push({ plugin, metadata });
      }
    }
    
    return result;
  }

  // 获取启用的插件
  getEnabledPlugins(): Array<{ plugin: MusicPlugin; metadata: PluginMetadata }> {
    return this.getAllPlugins().filter(({ metadata }) => metadata.enabled);
  }

  // 获取特定插件
  getPlugin(pluginName: string): MusicPlugin | undefined {
    return this.plugins.get(pluginName);
  }

  // 获取插件元数据
  getPluginMetadata(pluginName: string): PluginMetadata | undefined {
    return this.metadata.get(pluginName);
  }

  // 设置插件配置
  async setPluginConfig(pluginName: string, config: PluginConfig): Promise<boolean> {
    const plugin = this.plugins.get(pluginName);
    const metadata = this.metadata.get(pluginName);
    
    if (!plugin || !metadata) {
      return false;
    }

    try {
      this.configs.set(pluginName, config);
      metadata.config = config;
      
      if (plugin.setConfig) {
        plugin.setConfig(config);
      }

      this.emitEvent({ type: 'plugin_config_changed', pluginName, config });
      return true;
    } catch (error) {
      console.error(`Failed to set config for plugin "${pluginName}":`, error);
      return false;
    }
  }

  // 获取插件配置
  getPluginConfig(pluginName: string): PluginConfig | undefined {
    return this.configs.get(pluginName);
  }

  // 验证插件
  private validatePlugin(plugin: MusicPlugin): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 检查必需的属性
    if (!plugin.name || typeof plugin.name !== 'string') {
      errors.push('Plugin name is required and must be a string');
    }
    if (!plugin.version || typeof plugin.version !== 'string') {
      errors.push('Plugin version is required and must be a string');
    }
    if (!plugin.author || typeof plugin.author !== 'string') {
      errors.push('Plugin author is required and must be a string');
    }

    // 检查必需的方法
    if (typeof plugin.search !== 'function') {
      errors.push('Plugin must implement search method');
    }
    if (typeof plugin.getPlayUrl !== 'function') {
      errors.push('Plugin must implement getPlayUrl method');
    }
    if (typeof plugin.getLyric !== 'function') {
      errors.push('Plugin must implement getLyric method');
    }

    // 检查可选方法的类型
    if (plugin.getConfigSchema && typeof plugin.getConfigSchema !== 'function') {
      warnings.push('getConfigSchema should be a function');
    }
    if (plugin.setConfig && typeof plugin.setConfig !== 'function') {
      warnings.push('setConfig should be a function');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  // 聚合搜索
  async searchAll(keyword: string, type: SearchType = 'music', page: number = 1): Promise<AggregatedSearchResult> {
    const enabledPlugins = this.getEnabledPlugins();
    const searchPromises = enabledPlugins.map(async ({ plugin, metadata }) => {
      try {
        const result = await Promise.race([
          plugin.search(keyword, type, page),
          new Promise<SearchResult>((_, reject) => 
            setTimeout(() => reject(new Error('Search timeout')), this.config.searchTimeout)
          )
        ]);
        
        return {
          pluginName: metadata.name,
          data: result.data,
          hasMore: result.hasMore,
          success: true
        };
      } catch (error) {
        console.error(`Search failed for plugin "${metadata.name}":`, error);
        return {
          pluginName: metadata.name,
          data: [],
          hasMore: false,
          success: false,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    });

    const results = await Promise.all(searchPromises);
    const successfulResults = results.filter(r => r.success);
    
    return {
      results: successfulResults,
      totalCount: successfulResults.reduce((sum, r) => sum + r.data.length, 0)
    };
  }

  // 获取播放URL
  async getPlayUrl(musicItem: MusicItem): Promise<string | null> {
    const plugin = this.plugins.get(musicItem.platform);
    if (!plugin || !this.enabledPlugins.has(musicItem.platform)) {
      throw new Error(`Plugin "${musicItem.platform}" not found or disabled`);
    }

    try {
      return await plugin.getPlayUrl(musicItem);
    } catch (error) {
      console.error(`Failed to get play URL from plugin "${musicItem.platform}":`, error);
      throw error;
    }
  }

  // 获取歌词
  async getLyric(musicItem: MusicItem): Promise<LyricResult | null> {
    const plugin = this.plugins.get(musicItem.platform);
    if (!plugin || !this.enabledPlugins.has(musicItem.platform)) {
      return null;
    }

    try {
      return await plugin.getLyric(musicItem);
    } catch (error) {
      console.error(`Failed to get lyric from plugin "${musicItem.platform}":`, error);
      return null;
    }
  }

  // 测试插件连接
  async testPluginConnection(pluginName: string): Promise<boolean> {
    const plugin = this.plugins.get(pluginName);
    if (!plugin || !plugin.testConnection) {
      return false;
    }

    try {
      return await plugin.testConnection();
    } catch (error) {
      console.error(`Connection test failed for plugin "${pluginName}":`, error);
      return false;
    }
  }
}
