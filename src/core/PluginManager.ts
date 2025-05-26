/**
 * 插件管理器
 * 负责插件的加载、卸载、更新和生命周期管理
 */

import PersistStatus from '../store/PersistStatus';
import {
  IPlugin,
  IPluginConfig,
  IPluginLoadOptions,
  IPluginManager,
  IPluginState,
  PluginError
} from '../types/PluginTypes';

export class PluginManager implements IPluginManager {
  private plugins: Map<string, IPluginState> = new Map();
  private configKey = 'plugin.configs' as const;

  constructor() {
    this.loadPluginConfig();
  }

  /**
   * 加载插件
   */
  async loadPlugin(source: string | File, options: IPluginLoadOptions = {}): Promise<IPluginState> {
    try {
      let pluginCode: string;
      let pluginId: string;

      // 获取插件代码
      if (typeof source === 'string') {
        if (source.startsWith('http')) {
          // 从URL加载
          const response = await fetch(source);
          if (!response.ok) {
            throw new Error(`Failed to fetch plugin from ${source}: ${response.statusText}`);
          }
          pluginCode = await response.text();
        } else {
          // 本地路径或直接的代码
          pluginCode = source;
        }
      } else {
        // 从文件加载
        pluginCode = await this.readFileAsText(source);
      }

      // 执行插件代码
      const pluginInstance = this.executePluginCode(pluginCode);

      // 验证插件
      this.validatePlugin(pluginInstance);

      pluginId = this.generatePluginId(pluginInstance.platform);

      // 检查是否已存在
      if (this.plugins.has(pluginId) && !options.overwrite) {
        throw new Error(`Plugin ${pluginId} already exists. Use overwrite option to replace it.`);
      }

      // 创建插件状态
      const pluginState: IPluginState = {
        id: pluginId,
        instance: pluginInstance,
        enabled: options.autoEnable ?? true,
        userVariables: options.userVariables ?? {},
        loadTime: Date.now(),
      };

      // 初始化用户变量
      if (pluginInstance.userVariables) {
        for (const variable of pluginInstance.userVariables) {
          if (!(variable.key in pluginState.userVariables)) {
            pluginState.userVariables[variable.key] = variable.defaultValue ?? '';
          }
        }
      }

      // 插件已加载，无需设置运行时环境

      // 存储插件
      this.plugins.set(pluginId, pluginState);

      // 保存配置
      await this.savePluginConfig();

      console.log(`Plugin ${pluginId} loaded successfully`);
      return pluginState;

    } catch (error) {
      console.error('Failed to load plugin:', error);
      throw new PluginError(
        `Failed to load plugin: ${error.message}`,
        'unknown',
        'loadPlugin',
        error
      );
    }
  }

  /**
   * 卸载插件
   */
  async unloadPlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new PluginError(`Plugin ${pluginId} not found`, pluginId);
    }

    try {
      // 移除插件
      this.plugins.delete(pluginId);

      // 保存配置
      await this.savePluginConfig();

      console.log(`Plugin ${pluginId} unloaded successfully`);
    } catch (error) {
      console.error(`Failed to unload plugin ${pluginId}:`, error);
      throw new PluginError(
        `Failed to unload plugin: ${error.message}`,
        pluginId,
        'unloadPlugin',
        error
      );
    }
  }

  /**
   * 更新插件
   */
  async updatePlugin(pluginId: string): Promise<IPluginState> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new PluginError(`Plugin ${pluginId} not found`, pluginId);
    }

    const srcUrl = plugin.instance.srcUrl;
    if (!srcUrl) {
      throw new PluginError(`Plugin ${pluginId} has no update URL`, pluginId);
    }

    try {
      // 保存当前配置
      const currentVariables = { ...plugin.userVariables };
      const currentEnabled = plugin.enabled;

      // 卸载当前插件
      await this.unloadPlugin(pluginId);

      // 重新加载插件
      const newPlugin = await this.loadPlugin(srcUrl, {
        autoEnable: currentEnabled,
        userVariables: currentVariables,
        overwrite: true
      });

      console.log(`Plugin ${pluginId} updated successfully`);
      return newPlugin;

    } catch (error) {
      console.error(`Failed to update plugin ${pluginId}:`, error);
      throw new PluginError(
        `Failed to update plugin: ${error.message}`,
        pluginId,
        'updatePlugin',
        error
      );
    }
  }

  /**
   * 获取插件
   */
  getPlugin(pluginId: string): IPluginState | null {
    return this.plugins.get(pluginId) ?? null;
  }

  /**
   * 获取所有插件
   */
  getAllPlugins(): IPluginState[] {
    return Array.from(this.plugins.values());
  }

  /**
   * 获取启用的插件
   */
  getEnabledPlugins(): IPluginState[] {
    return this.getAllPlugins().filter(plugin => plugin.enabled);
  }

  /**
   * 启用插件
   */
  async enablePlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new PluginError(`Plugin ${pluginId} not found`, pluginId);
    }

    plugin.enabled = true;
    await this.savePluginConfig();
    console.log(`Plugin ${pluginId} enabled`);
  }

  /**
   * 禁用插件
   */
  async disablePlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new PluginError(`Plugin ${pluginId} not found`, pluginId);
    }

    plugin.enabled = false;
    await this.savePluginConfig();
    console.log(`Plugin ${pluginId} disabled`);
  }

  /**
   * 设置插件变量
   */
  async setPluginVariable(pluginId: string, key: string, value: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new PluginError(`Plugin ${pluginId} not found`, pluginId);
    }

    plugin.userVariables[key] = value;
    await this.savePluginConfig();
  }

  /**
   * 获取插件变量
   */
  getPluginVariable(pluginId: string, key: string): string | undefined {
    const plugin = this.plugins.get(pluginId);
    return plugin?.userVariables[key];
  }

  /**
   * 保存插件配置
   */
  async savePluginConfig(): Promise<void> {
    const configs: IPluginConfig[] = this.getAllPlugins().map(plugin => ({
      id: plugin.id,
      name: plugin.instance.platform,
      source: plugin.instance.srcUrl ?? '',
      enabled: plugin.enabled,
      userVariables: plugin.userVariables,
      installTime: plugin.loadTime,
      updateTime: Date.now()
    }));

    PersistStatus.set(this.configKey, configs);
  }

  /**
   * 加载插件配置
   */
  async loadPluginConfig(): Promise<void> {
    try {
      const configs: IPluginConfig[] = PersistStatus.get(this.configKey) ?? [];

      for (const config of configs) {
        if (config.source) {
          try {
            await this.loadPlugin(config.source, {
              autoEnable: config.enabled,
              userVariables: config.userVariables,
              overwrite: true
            });
          } catch (error) {
            console.error(`Failed to load plugin ${config.id} from config:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load plugin config:', error);
    }
  }

  /**
   * 执行插件代码
   */
  private executePluginCode(code: string): IPlugin {
    try {
      // 创建一个简单的模块环境
      const module = { exports: {} };
      const exports = module.exports;

      // 创建一个函数来执行插件代码
      const pluginFunction = new Function('module', 'exports', 'require', code);

      // 提供一个简单的require函数
      const require = (name: string) => {
        throw new Error(`Module ${name} is not available in plugin environment`);
      };

      // 执行插件代码
      pluginFunction(module, exports, require);

      return module.exports as IPlugin;
    } catch (error) {
      throw new Error(`Failed to execute plugin code: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 验证插件
   */
  private validatePlugin(plugin: any): asserts plugin is IPlugin {
    if (!plugin || typeof plugin !== 'object') {
      throw new Error('Plugin must be an object');
    }

    if (!plugin.platform || typeof plugin.platform !== 'string') {
      throw new Error('Plugin must have a platform name');
    }

    if (plugin.platform === '本地') {
      throw new Error('Plugin platform cannot be "本地"');
    }
  }

  /**
   * 生成插件ID
   */
  private generatePluginId(platform: string): string {
    return `plugin_${platform}_${Date.now()}`;
  }

  /**
   * 读取文件为文本
   */
  private async readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }
}

// 单例实例
export const pluginManager = new PluginManager();
