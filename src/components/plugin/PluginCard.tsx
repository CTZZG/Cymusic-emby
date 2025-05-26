/**
 * 插件卡片组件
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize } from '@/constants/tokens';
import { IPluginState } from '@/types/PluginTypes';

interface PluginCardProps {
  plugin: IPluginState;
  onToggle: () => void;
  onRemove: () => void;
  onUpdate: () => void;
  onSettings: () => void;
}

export default function PluginCard({
  plugin,
  onToggle,
  onRemove,
  onUpdate,
  onSettings,
}: PluginCardProps) {
  const hasUpdate = !!plugin.instance.srcUrl;
  const hasSettings = !!(plugin.instance.userVariables && plugin.instance.userVariables.length > 0);

  const handleUpdate = () => {
    if (!hasUpdate) {
      Alert.alert('无法更新', '该插件没有提供更新地址');
      return;
    }
    onUpdate();
  };

  const getSupportedFeatures = () => {
    const features = [];
    if (plugin.instance.search) features.push('搜索');
    if (plugin.instance.getMediaSource) features.push('音源');
    if (plugin.instance.getLyric) features.push('歌词');
    if (plugin.instance.getTopLists) features.push('榜单');
    if (plugin.instance.getRecommendSheetsByTag) features.push('推荐');
    if (plugin.instance.playbackCallback) features.push('回调');
    return features;
  };

  const supportedFeatures = getSupportedFeatures();

  return (
    <View style={[styles.container, !plugin.enabled && styles.disabledContainer]}>
      {/* 头部信息 */}
      <View style={styles.header}>
        <View style={styles.info}>
          <Text style={styles.name}>{plugin.instance.platform}</Text>
          {plugin.instance.version && (
            <Text style={styles.version}>v{plugin.instance.version}</Text>
          )}
          {plugin.instance.author && (
            <Text style={styles.author}>by {plugin.instance.author}</Text>
          )}
        </View>

        <View style={styles.controls}>
          <Switch
            value={plugin.enabled}
            onValueChange={onToggle}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={plugin.enabled ? 'white' : colors.textMuted}
          />
        </View>
      </View>

      {/* 功能标签 */}
      {supportedFeatures.length > 0 && (
        <View style={styles.features}>
          {supportedFeatures.map((feature, index) => (
            <View key={index} style={styles.featureTag}>
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>
      )}

      {/* 错误信息 */}
      {plugin.error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={16} color={colors.error} />
          <Text style={styles.errorText}>{plugin.error}</Text>
        </View>
      )}

      {/* 操作按钮 */}
      <View style={styles.actions}>
        {hasSettings && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onSettings}
          >
            <Ionicons name="settings-outline" size={20} color={colors.text} />
            <Text style={styles.actionText}>设置</Text>
          </TouchableOpacity>
        )}

        {hasUpdate && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleUpdate}
          >
            <Ionicons name="refresh-outline" size={20} color={colors.text} />
            <Text style={styles.actionText}>更新</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.actionButton, styles.dangerButton]}
          onPress={onRemove}
        >
          <Ionicons name="trash-outline" size={20} color={colors.error} />
          <Text style={[styles.actionText, styles.dangerText]}>删除</Text>
        </TouchableOpacity>
      </View>

      {/* 加载时间 */}
      <View style={styles.footer}>
        <Text style={styles.loadTime}>
          加载于 {new Date(plugin.loadTime).toLocaleString()}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  disabledContainer: {
    opacity: 0.6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  version: {
    fontSize: fontSize.sm,
    color: colors.primary,
    marginBottom: 2,
  },
  author: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  controls: {
    marginLeft: 16,
  },
  features: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    gap: 6,
  },
  featureTag: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  featureText: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: '500',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.error + '20',
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  errorText: {
    fontSize: fontSize.sm,
    color: colors.error,
    marginLeft: 6,
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginBottom: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionText: {
    fontSize: fontSize.sm,
    color: colors.text,
    marginLeft: 4,
  },
  dangerButton: {
    borderColor: colors.error + '40',
  },
  dangerText: {
    color: colors.error,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
  },
  loadTime: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
