/**
 * 插件运行时环境
 * 提供插件执行的沙箱环境和API代理
 */

import { IPlugin, IPluginEnvironment } from '../types/PluginTypes';

export class PluginRuntime {
  private environments: Map<string, IPluginEnvironment> = new Map();

  /**
   * 在沙箱环境中执行插件代码
   */
  async executePlugin(pluginCode: string): Promise<IPlugin> {
    try {
      // 创建沙箱环境
      const sandbox = this.createSandbox();
      
      // 在沙箱中执行插件代码
      const result = this.evaluateInSandbox(pluginCode, sandbox);
      
      // 验证返回结果
      if (!result || typeof result !== 'object') {
        throw new Error('Plugin must export an object');
      }

      return result as IPlugin;
    } catch (error) {
      console.error('Failed to execute plugin:', error);
      throw new Error(`Plugin execution failed: ${error.message}`);
    }
  }

  /**
   * 设置插件环境
   */
  setPluginEnvironment(pluginId: string, userVariables: Record<string, string>): void {
    const environment: IPluginEnvironment = {
      getUserVariables: () => ({ ...userVariables }),
      
      setUserVariable: (key: string, value: string) => {
        userVariables[key] = value;
      },
      
      log: (level: 'info' | 'warn' | 'error', message: string) => {
        const prefix = `[Plugin:${pluginId}]`;
        switch (level) {
          case 'info':
            console.log(prefix, message);
            break;
          case 'warn':
            console.warn(prefix, message);
            break;
          case 'error':
            console.error(prefix, message);
            break;
        }
      },
      
      fetch: async (url: string, options?: RequestInit) => {
        // 添加用户代理和其他默认头
        const defaultHeaders = {
          'User-Agent': 'CyMusic/1.0',
          ...options?.headers
        };
        
        return fetch(url, {
          ...options,
          headers: defaultHeaders
        });
      }
    };

    this.environments.set(pluginId, environment);
  }

  /**
   * 获取插件环境
   */
  getPluginEnvironment(pluginId: string): IPluginEnvironment | undefined {
    return this.environments.get(pluginId);
  }

  /**
   * 清理插件环境
   */
  cleanupPlugin(pluginId: string): void {
    this.environments.delete(pluginId);
  }

  /**
   * 创建沙箱环境
   */
  private createSandbox(): any {
    // 创建一个受限的全局环境
    const sandbox = {
      // 允许的全局对象
      console: {
        log: console.log.bind(console),
        warn: console.warn.bind(console),
        error: console.error.bind(console),
        info: console.info.bind(console)
      },
      
      // 网络请求
      fetch: fetch.bind(window),
      
      // 基础JavaScript对象
      Object: Object,
      Array: Array,
      String: String,
      Number: Number,
      Boolean: Boolean,
      Date: Date,
      Math: Math,
      JSON: JSON,
      RegExp: RegExp,
      Error: Error,
      
      // Promise和异步支持
      Promise: Promise,
      setTimeout: setTimeout.bind(window),
      clearTimeout: clearTimeout.bind(window),
      setInterval: setInterval.bind(window),
      clearInterval: clearInterval.bind(window),
      
      // 模块导出
      module: { exports: {} },
      exports: {},
      
      // 环境变量访问器（将在插件执行时注入）
      env: null,
      
      // 阻止访问危险的全局对象
      window: undefined,
      document: undefined,
      location: undefined,
      navigator: undefined,
      localStorage: undefined,
      sessionStorage: undefined,
      indexedDB: undefined,
      
      // 常用的编码解码函数
      encodeURIComponent: encodeURIComponent,
      decodeURIComponent: decodeURIComponent,
      encodeURI: encodeURI,
      decodeURI: decodeURI,
      btoa: btoa,
      atob: atob
    };

    return sandbox;
  }

  /**
   * 在沙箱中执行代码
   */
  private evaluateInSandbox(code: string, sandbox: any): any {
    try {
      // 创建函数参数列表
      const paramNames = Object.keys(sandbox);
      const paramValues = Object.values(sandbox);
      
      // 包装代码以确保正确的模块导出
      const wrappedCode = `
        (function(${paramNames.join(', ')}) {
          "use strict";
          ${code}
          return module.exports || exports;
        })
      `;
      
      // 创建函数并执行
      const func = eval(wrappedCode);
      const result = func(...paramValues);
      
      return result;
    } catch (error) {
      console.error('Sandbox execution error:', error);
      throw new Error(`Code execution failed: ${error.message}`);
    }
  }

  /**
   * 为插件调用注入环境
   */
  injectEnvironment(pluginId: string, method: Function): Function {
    const environment = this.environments.get(pluginId);
    if (!environment) {
      throw new Error(`Environment for plugin ${pluginId} not found`);
    }

    // 返回一个包装函数，自动注入环境
    return function(...args: any[]) {
      // 将环境对象绑定到全局 env 变量
      const originalEnv = (globalThis as any).env;
      (globalThis as any).env = environment;
      
      try {
        return method.apply(this, args);
      } finally {
        // 恢复原始环境
        (globalThis as any).env = originalEnv;
      }
    };
  }

  /**
   * 安全地调用插件方法
   */
  async safeCall<T>(
    pluginId: string, 
    method: Function | undefined, 
    ...args: any[]
  ): Promise<T | null> {
    if (!method || typeof method !== 'function') {
      return null;
    }

    const environment = this.environments.get(pluginId);
    if (!environment) {
      throw new Error(`Environment for plugin ${pluginId} not found`);
    }

    try {
      // 注入环境并调用方法
      const originalEnv = (globalThis as any).env;
      (globalThis as any).env = environment;
      
      const result = await method(...args);
      
      // 恢复环境
      (globalThis as any).env = originalEnv;
      
      return result;
    } catch (error) {
      // 恢复环境
      (globalThis as any).env = undefined;
      
      console.error(`Plugin ${pluginId} method call failed:`, error);
      throw new Error(`Plugin method execution failed: ${error.message}`);
    }
  }

  /**
   * 批量调用多个插件的同一方法
   */
  async batchCall<T>(
    pluginIds: string[],
    methodName: string,
    ...args: any[]
  ): Promise<Array<{ pluginId: string; result: T | null; error?: Error }>> {
    const results = await Promise.allSettled(
      pluginIds.map(async (pluginId) => {
        const environment = this.environments.get(pluginId);
        if (!environment) {
          throw new Error(`Environment for plugin ${pluginId} not found`);
        }

        // 这里需要从插件实例中获取方法，暂时返回null
        // 实际实现中需要与PluginManager协作
        return { pluginId, result: null as T };
      })
    );

    return results.map((result, index) => {
      const pluginId = pluginIds[index];
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          pluginId,
          result: null,
          error: result.reason
        };
      }
    });
  }
}
