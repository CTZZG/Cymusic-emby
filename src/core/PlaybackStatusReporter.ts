/**
 * 播放状态回调器
 * 负责将播放状态变化通知给插件
 */

import { IMusicItem } from '../types/MediaTypes';
import { IPlaybackStatusReporter } from '../types/PlaybackTypes';
import { pluginManager } from './PluginManager';

export class PlaybackStatusReporter implements IPlaybackStatusReporter {
  private currentTrack: IMusicItem | null = null;
  private isReporting = false;

  /**
   * 上报播放开始
   */
  async reportPlaybackStart(musicItem: IMusicItem): Promise<void> {
    if (this.isReporting) return;
    
    this.currentTrack = musicItem;
    this.isReporting = true;

    try {
      await this.notifyPlugins('onPlaybackStart', musicItem);
      console.log(`Reported playback start for: ${musicItem.title}`);
    } catch (error) {
      console.error('Failed to report playback start:', error);
    } finally {
      this.isReporting = false;
    }
  }

  /**
   * 上报播放进度
   */
  async reportPlaybackProgress(
    musicItem: IMusicItem, 
    position: number, 
    duration: number
  ): Promise<void> {
    if (this.isReporting) return;
    
    this.isReporting = true;

    try {
      await this.notifyPlugins('onPlaybackProgress', musicItem, position, duration);
    } catch (error) {
      console.error('Failed to report playback progress:', error);
    } finally {
      this.isReporting = false;
    }
  }

  /**
   * 上报播放暂停
   */
  async reportPlaybackPause(musicItem: IMusicItem): Promise<void> {
    if (this.isReporting) return;
    
    this.isReporting = true;

    try {
      await this.notifyPlugins('onPlaybackPause', musicItem);
      console.log(`Reported playback pause for: ${musicItem.title}`);
    } catch (error) {
      console.error('Failed to report playback pause:', error);
    } finally {
      this.isReporting = false;
    }
  }

  /**
   * 上报播放停止
   */
  async reportPlaybackStop(musicItem: IMusicItem): Promise<void> {
    if (this.isReporting) return;
    
    this.currentTrack = null;
    this.isReporting = true;

    try {
      await this.notifyPlugins('onPlaybackStop', musicItem);
      console.log(`Reported playback stop for: ${musicItem.title}`);
    } catch (error) {
      console.error('Failed to report playback stop:', error);
    } finally {
      this.isReporting = false;
    }
  }

  /**
   * 上报播放错误
   */
  async reportPlaybackError(musicItem: IMusicItem, error: Error): Promise<void> {
    if (this.isReporting) return;
    
    this.isReporting = true;

    try {
      await this.notifyPlugins('onPlaybackError', musicItem, error);
      console.log(`Reported playback error for: ${musicItem.title}`, error);
    } catch (reportError) {
      console.error('Failed to report playback error:', reportError);
    } finally {
      this.isReporting = false;
    }
  }

  /**
   * 上报播放完成
   */
  async reportPlaybackComplete(musicItem: IMusicItem): Promise<void> {
    if (this.isReporting) return;
    
    this.isReporting = true;

    try {
      await this.notifyPlugins('onPlaybackComplete', musicItem);
      console.log(`Reported playback complete for: ${musicItem.title}`);
    } catch (error) {
      console.error('Failed to report playback complete:', error);
    } finally {
      this.isReporting = false;
    }
  }

  /**
   * 上报音轨切换
   */
  async reportTrackChanged(
    previousTrack: IMusicItem | null, 
    currentTrack: IMusicItem | null
  ): Promise<void> {
    if (this.isReporting) return;
    
    this.currentTrack = currentTrack;
    this.isReporting = true;

    try {
      // 如果有上一首歌曲，先上报停止
      if (previousTrack) {
        await this.notifyPlugins('onPlaybackStop', previousTrack);
      }

      // 如果有当前歌曲，上报开始
      if (currentTrack) {
        await this.notifyPlugins('onPlaybackStart', currentTrack);
      }

      console.log(`Reported track change from ${previousTrack?.title} to ${currentTrack?.title}`);
    } catch (error) {
      console.error('Failed to report track change:', error);
    } finally {
      this.isReporting = false;
    }
  }

  /**
   * 获取当前播放的音轨
   */
  getCurrentTrack(): IMusicItem | null {
    return this.currentTrack;
  }

  /**
   * 通知所有启用的插件
   */
  private async notifyPlugins(callbackMethod: string, ...args: any[]): Promise<void> {
    const enabledPlugins = pluginManager.getEnabledPlugins();
    
    // 过滤出有回调方法的插件
    const pluginsWithCallback = enabledPlugins.filter(plugin => 
      plugin.instance.playbackCallback && 
      typeof plugin.instance.playbackCallback[callbackMethod] === 'function'
    );

    if (pluginsWithCallback.length === 0) {
      return;
    }

    // 并行调用所有插件的回调方法
    const promises = pluginsWithCallback.map(async (plugin) => {
      try {
        const callback = plugin.instance.playbackCallback![callbackMethod];
        await callback(...args);
      } catch (error) {
        console.error(`Plugin ${plugin.id} callback ${callbackMethod} failed:`, error);
        // 不抛出错误，避免影响其他插件
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * 通知特定插件
   */
  async notifyPlugin(
    pluginId: string, 
    callbackMethod: string, 
    ...args: any[]
  ): Promise<void> {
    const plugin = pluginManager.getPlugin(pluginId);
    
    if (!plugin || !plugin.enabled) {
      console.warn(`Plugin ${pluginId} not found or not enabled`);
      return;
    }

    if (!plugin.instance.playbackCallback || 
        typeof plugin.instance.playbackCallback[callbackMethod] !== 'function') {
      return;
    }

    try {
      const callback = plugin.instance.playbackCallback[callbackMethod];
      await callback(...args);
      console.log(`Notified plugin ${pluginId} with ${callbackMethod}`);
    } catch (error) {
      console.error(`Failed to notify plugin ${pluginId} with ${callbackMethod}:`, error);
      throw error;
    }
  }

  /**
   * 批量通知特定插件列表
   */
  async notifyPluginList(
    pluginIds: string[], 
    callbackMethod: string, 
    ...args: any[]
  ): Promise<void> {
    const promises = pluginIds.map(pluginId => 
      this.notifyPlugin(pluginId, callbackMethod, ...args)
    );

    await Promise.allSettled(promises);
  }

  /**
   * 检查插件是否支持特定回调
   */
  hasCallback(pluginId: string, callbackMethod: string): boolean {
    const plugin = pluginManager.getPlugin(pluginId);
    
    return !!(plugin?.instance.playbackCallback && 
             typeof plugin.instance.playbackCallback[callbackMethod] === 'function');
  }

  /**
   * 获取支持特定回调的插件列表
   */
  getPluginsWithCallback(callbackMethod: string): string[] {
    return pluginManager.getEnabledPlugins()
      .filter(plugin => this.hasCallback(plugin.id, callbackMethod))
      .map(plugin => plugin.id);
  }
}

// 单例实例
export const playbackStatusReporter = new PlaybackStatusReporter();
