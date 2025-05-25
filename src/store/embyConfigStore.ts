import { create } from 'zustand';
import PersistStatus from './PersistStatus';
import { initializeEmby, getEmbyToken, type EmbyConfig } from '@/helpers/embyApi';

// Emby配置状态接口
export interface EmbyConfigState {
  url: string | null;
  username: string | null;
  password: string | null;
  deviceId: string | null;
  uploadPlaylistToEmby: boolean;
  isConfigured: boolean;
  isLoading: boolean;
  error: string | null;
}

// Emby配置操作接口
export interface EmbyConfigActions {
  setConfig: (newConfig: Partial<EmbyConfigState>) => void;
  testConnection: () => Promise<boolean>;
  clearConfig: () => void;
  loadConfig: () => void;
  updateConfig: (config: Partial<EmbyConfig>) => void;
}

// 计算是否已配置
const calculateIsConfigured = (url: string | null, username: string | null, password: string | null): boolean => {
  return !!(url && username && password);
};

// 创建Emby配置store
export const useEmbyConfigStore = create<EmbyConfigState & EmbyConfigActions>((set, get) => ({
  // 初始状态
  url: null,
  username: null,
  password: null,
  deviceId: null,
  uploadPlaylistToEmby: false,
  isConfigured: false,
  isLoading: false,
  error: null,

  // 设置配置
  setConfig: (newConfig: Partial<EmbyConfigState>) => {
    set((state) => {
      const updatedState = { ...state, ...newConfig };
      updatedState.isConfigured = calculateIsConfigured(
        updatedState.url,
        updatedState.username,
        updatedState.password
      );
      
      // 持久化存储
      if (updatedState.url) PersistStatus.set('emby.url', updatedState.url);
      if (updatedState.username) PersistStatus.set('emby.username', updatedState.username);
      if (updatedState.password) PersistStatus.set('emby.password', updatedState.password);
      if (updatedState.deviceId !== null) PersistStatus.set('emby.deviceId', updatedState.deviceId);
      PersistStatus.set('emby.uploadPlaylistToEmby', updatedState.uploadPlaylistToEmby);

      // 如果配置完整，初始化Emby API
      if (updatedState.isConfigured) {
        initializeEmby({
          url: updatedState.url!,
          username: updatedState.username!,
          password: updatedState.password!,
          deviceId: updatedState.deviceId || undefined,
          uploadPlaylistToEmby: updatedState.uploadPlaylistToEmby
        });
      }

      return updatedState;
    });
  },

  // 测试连接
  testConnection: async (): Promise<boolean> => {
    const state = get();
    
    if (!state.isConfigured) {
      set({ error: '请先完成Emby服务器配置' });
      return false;
    }

    set({ isLoading: true, error: null });

    try {
      // 初始化Emby API
      initializeEmby({
        url: state.url!,
        username: state.username!,
        password: state.password!,
        deviceId: state.deviceId || undefined,
        uploadPlaylistToEmby: state.uploadPlaylistToEmby
      });

      // 尝试获取token来测试连接
      const tokenInfo = await getEmbyToken(true);
      
      if (tokenInfo) {
        set({ isLoading: false, error: null });
        return true;
      } else {
        set({ isLoading: false, error: '连接失败：请检查服务器地址、用户名和密码' });
        return false;
      }
    } catch (error: any) {
      const errorMessage = error?.message || '连接失败：未知错误';
      set({ isLoading: false, error: errorMessage });
      return false;
    }
  },

  // 清除配置
  clearConfig: () => {
    // 清除持久化存储
    PersistStatus.remove('emby.url');
    PersistStatus.remove('emby.username');
    PersistStatus.remove('emby.password');
    PersistStatus.remove('emby.deviceId');
    PersistStatus.remove('emby.uploadPlaylistToEmby');

    // 重置状态
    set({
      url: null,
      username: null,
      password: null,
      deviceId: null,
      uploadPlaylistToEmby: false,
      isConfigured: false,
      isLoading: false,
      error: null
    });
  },

  // 加载配置
  loadConfig: () => {
    const url = PersistStatus.get('emby.url');
    const username = PersistStatus.get('emby.username');
    const password = PersistStatus.get('emby.password');
    const deviceId = PersistStatus.get('emby.deviceId');
    const uploadPlaylistToEmby = PersistStatus.get('emby.uploadPlaylistToEmby') || false;

    const isConfigured = calculateIsConfigured(url, username, password);

    set({
      url,
      username,
      password,
      deviceId,
      uploadPlaylistToEmby,
      isConfigured,
      error: null
    });

    // 如果配置完整，初始化Emby API
    if (isConfigured) {
      initializeEmby({
        url: url!,
        username: username!,
        password: password!,
        deviceId: deviceId || undefined,
        uploadPlaylistToEmby
      });
    }
  },

  // 更新配置（用于外部调用）
  updateConfig: (config: Partial<EmbyConfig>) => {
    const currentState = get();
    get().setConfig({
      url: config.url || currentState.url,
      username: config.username || currentState.username,
      password: config.password || currentState.password,
      deviceId: config.deviceId !== undefined ? config.deviceId : currentState.deviceId,
      uploadPlaylistToEmby: config.uploadPlaylistToEmby !== undefined ? config.uploadPlaylistToEmby : currentState.uploadPlaylistToEmby
    });
  }
}));

// 初始化时加载配置
useEmbyConfigStore.getState().loadConfig();

// 导出便捷的hook
export const useEmbyConfig = () => {
  const store = useEmbyConfigStore();
  return {
    config: {
      url: store.url,
      username: store.username,
      password: store.password,
      deviceId: store.deviceId,
      uploadPlaylistToEmby: store.uploadPlaylistToEmby
    },
    isConfigured: store.isConfigured,
    isLoading: store.isLoading,
    error: store.error,
    setConfig: store.setConfig,
    testConnection: store.testConnection,
    clearConfig: store.clearConfig,
    updateConfig: store.updateConfig
  };
};

export default useEmbyConfigStore;
