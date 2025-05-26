/**
 * 插件变量管理
 */

import { create } from 'zustand';
import { IUserVariable } from '../types/PluginTypes';
import { pluginManager } from '../core/PluginManager';
import { usePluginStore } from './pluginStore';

interface PluginVariableStoreState {
  // 状态
  variables: Record<string, Record<string, string>>; // pluginId -> variables
  loading: boolean;
  error: string | null;
  
  // 操作
  loadVariables: () => void;
  getPluginVariables: (pluginId: string) => Record<string, string>;
  setPluginVariable: (pluginId: string, key: string, value: string) => Promise<void>;
  getPluginVariable: (pluginId: string, key: string) => string | undefined;
  resetPluginVariables: (pluginId: string) => Promise<void>;
  validateVariable: (pluginId: string, key: string, value: string) => string | null;
  clearError: () => void;
}

export const usePluginVariableStore = create<PluginVariableStoreState>((set, get) => ({
  // 初始状态
  variables: {},
  loading: false,
  error: null,

  // 加载所有插件变量
  loadVariables: () => {
    const plugins = pluginManager.getAllPlugins();
    const variables: Record<string, Record<string, string>> = {};
    
    plugins.forEach(plugin => {
      variables[plugin.id] = { ...plugin.userVariables };
    });
    
    set({ variables });
  },

  // 获取插件变量
  getPluginVariables: (pluginId: string) => {
    const { variables } = get();
    return variables[pluginId] || {};
  },

  // 设置插件变量
  setPluginVariable: async (pluginId: string, key: string, value: string) => {
    set({ error: null });
    
    try {
      // 验证变量值
      const validationError = get().validateVariable(pluginId, key, value);
      if (validationError) {
        throw new Error(validationError);
      }

      // 更新插件管理器中的变量
      await pluginManager.setPluginVariable(pluginId, key, value);
      
      // 更新本地状态
      const { variables } = get();
      const updatedVariables = {
        ...variables,
        [pluginId]: {
          ...variables[pluginId],
          [key]: value
        }
      };
      
      set({ variables: updatedVariables });
      
      // 刷新插件store
      usePluginStore.getState().refreshPlugins();
      
    } catch (error) {
      console.error('Failed to set plugin variable:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to set plugin variable'
      });
      throw error;
    }
  },

  // 获取插件变量值
  getPluginVariable: (pluginId: string, key: string) => {
    const { variables } = get();
    return variables[pluginId]?.[key];
  },

  // 重置插件变量为默认值
  resetPluginVariables: async (pluginId: string) => {
    set({ error: null });
    
    try {
      const plugin = pluginManager.getPlugin(pluginId);
      if (!plugin) {
        throw new Error(`Plugin ${pluginId} not found`);
      }

      const defaultVariables: Record<string, string> = {};
      
      // 获取默认值
      if (plugin.instance.userVariables) {
        plugin.instance.userVariables.forEach(variable => {
          defaultVariables[variable.key] = variable.defaultValue || '';
        });
      }

      // 批量设置默认值
      for (const [key, value] of Object.entries(defaultVariables)) {
        await pluginManager.setPluginVariable(pluginId, key, value);
      }

      // 更新本地状态
      const { variables } = get();
      set({
        variables: {
          ...variables,
          [pluginId]: defaultVariables
        }
      });

      // 刷新插件store
      usePluginStore.getState().refreshPlugins();
      
    } catch (error) {
      console.error('Failed to reset plugin variables:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to reset plugin variables'
      });
      throw error;
    }
  },

  // 验证变量值
  validateVariable: (pluginId: string, key: string, value: string) => {
    const plugin = pluginManager.getPlugin(pluginId);
    if (!plugin) {
      return `Plugin ${pluginId} not found`;
    }

    const variableConfig = plugin.instance.userVariables?.find(v => v.key === key);
    if (!variableConfig) {
      return `Variable ${key} not found in plugin ${pluginId}`;
    }

    // 根据类型验证
    switch (variableConfig.type) {
      case 'number':
        if (isNaN(Number(value))) {
          return `${variableConfig.name || key} must be a number`;
        }
        break;
        
      case 'boolean':
        if (value !== 'true' && value !== 'false') {
          return `${variableConfig.name || key} must be true or false`;
        }
        break;
        
      case 'text':
      case 'password':
        // 文本类型通常不需要特殊验证
        break;
        
      default:
        // 默认不验证
        break;
    }

    return null; // 验证通过
  },

  // 清除错误
  clearError: () => {
    set({ error: null });
  }
}));

// 选择器函数
export const selectPluginVariableDefinitions = (pluginId: string) => {
  const plugin = pluginManager.getPlugin(pluginId);
  return plugin?.instance.userVariables || [];
};

export const selectPluginVariableValue = (pluginId: string, key: string) => (state: any) =>
  state.variables[pluginId]?.[key];

export const selectPluginHasVariables = (pluginId: string) => {
  const plugin = pluginManager.getPlugin(pluginId);
  return !!(plugin?.instance.userVariables && plugin.instance.userVariables.length > 0);
};

// 工具函数
export const getVariableDisplayValue = (variable: IUserVariable, value: string): string => {
  if (variable.type === 'password') {
    return value ? '••••••••' : '';
  }
  
  if (variable.type === 'boolean') {
    return value === 'true' ? '是' : '否';
  }
  
  return value || variable.defaultValue || '';
};

export const getVariableInputType = (variable: IUserVariable): string => {
  switch (variable.type) {
    case 'password':
      return 'password';
    case 'number':
      return 'numeric';
    case 'boolean':
      return 'boolean';
    default:
      return 'text';
  }
};

// 批量操作工具
export const batchSetVariables = async (
  pluginId: string, 
  variables: Record<string, string>
): Promise<void> => {
  const store = usePluginVariableStore.getState();
  
  for (const [key, value] of Object.entries(variables)) {
    await store.setPluginVariable(pluginId, key, value);
  }
};

export const exportPluginVariables = (pluginId: string): Record<string, string> => {
  const store = usePluginVariableStore.getState();
  return store.getPluginVariables(pluginId);
};

export const importPluginVariables = async (
  pluginId: string, 
  variables: Record<string, string>
): Promise<void> => {
  await batchSetVariables(pluginId, variables);
};

// 初始化插件变量store
export const initializePluginVariableStore = () => {
  usePluginVariableStore.getState().loadVariables();
  console.log('Plugin variable store initialized');
};
