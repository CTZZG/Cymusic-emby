/**
 * 播放相关类型定义
 */

import { IMusicItem } from './MediaTypes';

// 播放状态枚举
export enum PlaybackState {
  IDLE = 'idle',
  LOADING = 'loading',
  PLAYING = 'playing',
  PAUSED = 'paused',
  STOPPED = 'stopped',
  ERROR = 'error'
}

// 播放事件类型
export enum PlaybackEvent {
  TRACK_CHANGED = 'track-changed',
  PLAYBACK_STATE_CHANGED = 'playback-state-changed',
  PLAYBACK_PROGRESS_UPDATED = 'playback-progress-updated',
  PLAYBACK_ERROR = 'playback-error'
}

// 播放进度信息
export interface IPlaybackProgress {
  /** 当前位置（秒） */
  position: number;
  /** 总时长（秒） */
  duration: number;
  /** 缓冲进度（0-1） */
  buffered?: number;
}

// 播放状态信息
export interface IPlaybackStatus {
  /** 播放状态 */
  state: PlaybackState;
  /** 当前音乐 */
  currentTrack?: IMusicItem;
  /** 播放进度 */
  progress: IPlaybackProgress;
  /** 播放速率 */
  rate: number;
  /** 音量 */
  volume: number;
  /** 是否静音 */
  muted: boolean;
}

// 播放状态回调接口
export interface IPlaybackStatusReporter {
  /** 上报播放开始 */
  reportPlaybackStart(musicItem: IMusicItem): Promise<void>;
  
  /** 上报播放进度 */
  reportPlaybackProgress(
    musicItem: IMusicItem, 
    position: number, 
    duration: number
  ): Promise<void>;
  
  /** 上报播放暂停 */
  reportPlaybackPause(musicItem: IMusicItem): Promise<void>;
  
  /** 上报播放停止 */
  reportPlaybackStop(musicItem: IMusicItem): Promise<void>;
  
  /** 上报播放错误 */
  reportPlaybackError(musicItem: IMusicItem, error: Error): Promise<void>;
  
  /** 上报播放完成 */
  reportPlaybackComplete(musicItem: IMusicItem): Promise<void>;
  
  /** 上报音轨切换 */
  reportTrackChanged(
    previousTrack: IMusicItem | null, 
    currentTrack: IMusicItem | null
  ): Promise<void>;
}

// 播放事件监听器
export interface IPlaybackEventListener {
  /** 监听播放事件 */
  addEventListener(event: PlaybackEvent, listener: Function): void;
  
  /** 移除播放事件监听 */
  removeEventListener(event: PlaybackEvent, listener: Function): void;
  
  /** 触发播放事件 */
  emit(event: PlaybackEvent, ...args: any[]): void;
}

// 播放控制接口
export interface IPlaybackController {
  /** 播放 */
  play(musicItem?: IMusicItem): Promise<void>;
  
  /** 暂停 */
  pause(): Promise<void>;
  
  /** 停止 */
  stop(): Promise<void>;
  
  /** 跳转到指定位置 */
  seekTo(position: number): Promise<void>;
  
  /** 设置播放速率 */
  setRate(rate: number): Promise<void>;
  
  /** 设置音量 */
  setVolume(volume: number): Promise<void>;
  
  /** 静音/取消静音 */
  setMuted(muted: boolean): Promise<void>;
  
  /** 下一首 */
  skipToNext(): Promise<void>;
  
  /** 上一首 */
  skipToPrevious(): Promise<void>;
  
  /** 获取当前播放状态 */
  getPlaybackStatus(): Promise<IPlaybackStatus>;
  
  /** 获取播放进度 */
  getProgress(): Promise<IPlaybackProgress>;
}

// 播放队列管理接口
export interface IPlaybackQueue {
  /** 添加到队列 */
  add(musicItem: IMusicItem | IMusicItem[]): Promise<void>;
  
  /** 从队列移除 */
  remove(index: number): Promise<void>;
  
  /** 清空队列 */
  clear(): Promise<void>;
  
  /** 获取队列 */
  getQueue(): IMusicItem[];
  
  /** 获取当前索引 */
  getCurrentIndex(): number;
  
  /** 跳转到指定索引 */
  skipToIndex(index: number): Promise<void>;
  
  /** 打乱队列 */
  shuffle(): Promise<void>;
  
  /** 移动队列项 */
  move(from: number, to: number): Promise<void>;
}

// 播放模式
export enum RepeatMode {
  OFF = 'off',
  ONE = 'one',
  ALL = 'all',
  SHUFFLE = 'shuffle'
}

// 播放器配置
export interface IPlaybackConfig {
  /** 重复模式 */
  repeatMode: RepeatMode;
  
  /** 自动播放下一首 */
  autoPlayNext: boolean;
  
  /** 交叉淡入淡出 */
  crossfade: boolean;
  
  /** 交叉淡入淡出时长（毫秒） */
  crossfadeDuration: number;
  
  /** 预加载下一首 */
  preloadNext: boolean;
  
  /** 播放质量偏好 */
  preferredQuality: 'low' | 'standard' | 'high' | 'super';
  
  /** 移动网络下的播放质量 */
  mobileQuality: 'low' | 'standard' | 'high' | 'super';
}

// 播放统计信息
export interface IPlaybackStats {
  /** 播放次数 */
  playCount: number;
  
  /** 总播放时长（秒） */
  totalPlayTime: number;
  
  /** 跳过次数 */
  skipCount: number;
  
  /** 最后播放时间 */
  lastPlayTime: number;
  
  /** 完整播放次数 */
  completePlayCount: number;
}

// 播放历史记录
export interface IPlaybackHistory {
  /** 音乐项 */
  musicItem: IMusicItem;
  
  /** 播放时间 */
  playTime: number;
  
  /** 播放时长（秒） */
  duration: number;
  
  /** 是否完整播放 */
  completed: boolean;
  
  /** 播放来源 */
  source: string;
}
