/**
 * 按插件分组的搜索结果组件
 */

import TracksListItem from '@/components/TracksListItem';
import { colors, fontSize } from '@/constants/tokens';
import { usePluginStore } from '@/store/pluginStore';
import { SupportMediaType } from '@/types/MediaTypes';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface SearchResultsByPluginProps {
  query: string;
  mediaType: SupportMediaType;
  onItemPress?: (item: any) => void;
}

interface PluginSearchResult {
  pluginId: string;
  pluginName: string;
  loading: boolean;
  error?: string;
  results: any[];
  hasMore: boolean;
  page: number;
}

export default function SearchResultsByPlugin({
  query,
  mediaType,
  onItemPress,
}: SearchResultsByPluginProps) {
  const { plugins } = usePluginStore();
  const [searchResults, setSearchResults] = useState<PluginSearchResult[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedPlugins, setExpandedPlugins] = useState<Set<string>>(new Set());

  // 获取支持搜索的插件
  const searchablePlugins = plugins.filter(plugin =>
    plugin.enabled &&
    plugin.instance.search &&
    typeof plugin.instance.search === 'function' &&
    plugin.instance.supportedSearchType?.includes(mediaType)
  );

  useEffect(() => {
    if (query.trim() && searchablePlugins.length > 0) {
      performSearch();
    } else {
      setSearchResults([]);
    }
  }, [query, mediaType, searchablePlugins.length]);

  const performSearch = async () => {
    if (!query.trim()) return;

    // 初始化搜索结果状态
    const initialResults: PluginSearchResult[] = searchablePlugins.map(plugin => ({
      pluginId: plugin.id,
      pluginName: plugin.instance.platform,
      loading: true,
      results: [],
      hasMore: false,
      page: 1,
    }));

    setSearchResults(initialResults);

    // 并行搜索所有插件
    const searchPromises = searchablePlugins.map(async (plugin, index) => {
      try {
        const result = await plugin.instance.search!(query, 1, mediaType);

        setSearchResults(prev => {
          const newResults = [...prev];
          newResults[index] = {
            ...newResults[index],
            loading: false,
            results: result.data || [],
            hasMore: !result.isEnd,
          };
          return newResults;
        });
      } catch (error) {
        console.error(`Search failed for plugin ${plugin.id}:`, error);

        setSearchResults(prev => {
          const newResults = [...prev];
          newResults[index] = {
            ...newResults[index],
            loading: false,
            error: error instanceof Error ? error.message : '搜索失败',
          };
          return newResults;
        });
      }
    });

    await Promise.allSettled(searchPromises);
  };

  const loadMoreResults = async (pluginResult: PluginSearchResult) => {
    const plugin = searchablePlugins.find(p => p.id === pluginResult.pluginId);
    if (!plugin || !pluginResult.hasMore) return;

    const resultIndex = searchResults.findIndex(r => r.pluginId === pluginResult.pluginId);
    if (resultIndex === -1) return;

    // 设置加载状态
    setSearchResults(prev => {
      const newResults = [...prev];
      newResults[resultIndex] = { ...newResults[resultIndex], loading: true };
      return newResults;
    });

    try {
      const result = await plugin.instance.search!(query, pluginResult.page + 1, mediaType);

      setSearchResults(prev => {
        const newResults = [...prev];
        newResults[resultIndex] = {
          ...newResults[resultIndex],
          loading: false,
          results: [...newResults[resultIndex].results, ...(result.data || [])],
          hasMore: !result.isEnd,
          page: pluginResult.page + 1,
        };
        return newResults;
      });
    } catch (error) {
      console.error(`Load more failed for plugin ${pluginResult.pluginId}:`, error);

      setSearchResults(prev => {
        const newResults = [...prev];
        newResults[resultIndex] = {
          ...newResults[resultIndex],
          loading: false,
          error: error instanceof Error ? error.message : '加载更多失败',
        };
        return newResults;
      });
    }
  };

  const togglePluginExpanded = (pluginId: string) => {
    setExpandedPlugins(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pluginId)) {
        newSet.delete(pluginId);
      } else {
        newSet.add(pluginId);
      }
      return newSet;
    });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await performSearch();
    setRefreshing(false);
  };

  const renderMediaItem = (item: any, index: number) => {
    switch (mediaType) {
      case 'music':
        return (
          <TracksListItem
            key={`${item.platform}-${item.id}-${index}`}
            track={{...item, url: item.url || 'Unknown'} as any}
            onTrackSelect={() => onItemPress?.(item)}
          />
        );

      case 'album':
      case 'artist':
      case 'sheet':
        return (
          <TouchableOpacity
            key={`${item.platform}-${item.id}-${index}`}
            style={styles.mediaItem}
            onPress={() => onItemPress?.(item)}
          >
            <View style={styles.mediaInfo}>
              <Text style={styles.mediaTitle} numberOfLines={2}>
                {item.title || item.name}
              </Text>
              {item.artist && (
                <Text style={styles.mediaSubtitle} numberOfLines={1}>
                  {item.artist}
                </Text>
              )}
              {item.description && (
                <Text style={styles.mediaDescription} numberOfLines={2}>
                  {item.description}
                </Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        );

      default:
        return null;
    }
  };

  const renderPluginResults = (pluginResult: PluginSearchResult) => {
    const isExpanded = expandedPlugins.has(pluginResult.pluginId);
    const displayResults = isExpanded ? pluginResult.results : pluginResult.results.slice(0, 3);

    return (
      <View key={pluginResult.pluginId} style={styles.pluginSection}>
        {/* 插件头部 */}
        <TouchableOpacity
          style={styles.pluginHeader}
          onPress={() => togglePluginExpanded(pluginResult.pluginId)}
        >
          <View style={styles.pluginInfo}>
            <Text style={styles.pluginName}>{pluginResult.pluginName}</Text>
            <Text style={styles.resultCount}>
              {pluginResult.loading ? '搜索中...' :
               pluginResult.error ? '搜索失败' :
               `${pluginResult.results.length} 个结果`}
            </Text>
          </View>

          <View style={styles.pluginActions}>
            {pluginResult.loading && (
              <ActivityIndicator size="small" color={colors.primary} />
            )}
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.textMuted}
            />
          </View>
        </TouchableOpacity>

        {/* 搜索结果 */}
        {isExpanded && (
          <View style={styles.resultsContainer}>
            {pluginResult.error ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={24} color={colors.error} />
                <Text style={styles.errorText}>{pluginResult.error}</Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() => performSearch()}
                >
                  <Text style={styles.retryButtonText}>重试</Text>
                </TouchableOpacity>
              </View>
            ) : pluginResult.results.length === 0 && !pluginResult.loading ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>暂无结果</Text>
              </View>
            ) : (
              <>
                {displayResults.map(renderMediaItem)}

                {/* 加载更多按钮 */}
                {pluginResult.hasMore && (
                  <TouchableOpacity
                    style={styles.loadMoreButton}
                    onPress={() => loadMoreResults(pluginResult)}
                    disabled={pluginResult.loading}
                  >
                    {pluginResult.loading ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Text style={styles.loadMoreText}>加载更多</Text>
                    )}
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        )}
      </View>
    );
  };

  if (!query.trim()) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="search" size={64} color={colors.textMuted} />
        <Text style={styles.emptyStateTitle}>输入关键词开始搜索</Text>
        <Text style={styles.emptyStateSubtitle}>
          在 {searchablePlugins.length} 个插件中搜索{getMediaTypeDisplayName(mediaType)}
        </Text>
      </View>
    );
  }

  if (searchablePlugins.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="extension-puzzle" size={64} color={colors.textMuted} />
        <Text style={styles.emptyStateTitle}>暂无可用插件</Text>
        <Text style={styles.emptyStateSubtitle}>
          请先添加支持{getMediaTypeDisplayName(mediaType)}搜索的插件
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
    >
      {searchResults.map(renderPluginResults)}
    </ScrollView>
  );
}

function getMediaTypeDisplayName(mediaType: SupportMediaType): string {
  switch (mediaType) {
    case 'music': return '歌曲';
    case 'album': return '专辑';
    case 'artist': return '艺人';
    case 'sheet': return '歌单';
    case 'lyric': return '歌词';
    default: return '内容';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  pluginSection: {
    marginBottom: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
  },
  pluginHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pluginInfo: {
    flex: 1,
  },
  pluginName: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.text,
  },
  resultCount: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  pluginActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resultsContainer: {
    padding: 16,
  },
  mediaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  mediaInfo: {
    flex: 1,
  },
  mediaTitle: {
    fontSize: fontSize.base,
    fontWeight: '500',
    color: colors.text,
  },
  mediaSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  mediaDescription: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 4,
  },
  loadMoreButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  loadMoreText: {
    fontSize: fontSize.base,
    color: colors.primary,
    fontWeight: '500',
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  errorText: {
    fontSize: fontSize.base,
    color: colors.error,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  retryButtonText: {
    color: 'white',
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: fontSize.base,
    color: colors.textMuted,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 16,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: fontSize.base,
    color: colors.textMuted,
    marginTop: 8,
    textAlign: 'center',
  },
});
