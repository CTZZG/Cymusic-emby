import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Switch,
  Alert,
  StyleSheet,
  ActivityIndicator
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '@/constants/tokens';
import { usePlugins, usePluginActions } from '@/store/pluginStore';
import { PluginMetadata } from '@/core/types';

interface PluginListProps {
  onPluginPress?: (pluginName: string) => void;
  onConfigPress?: (pluginName: string) => void;
}

export const PluginList: React.FC<PluginListProps> = ({
  onPluginPress,
  onConfigPress
}) => {
  const { plugins, isLoading, error } = usePlugins();
  const { enablePlugin, disablePlugin, unregisterPlugin, testPluginConnection } = usePluginActions();
  const [testingPlugins, setTestingPlugins] = useState<Set<string>>(new Set());

  const handleTogglePlugin = async (pluginName: string, enabled: boolean) => {
    if (enabled) {
      enablePlugin(pluginName);
    } else {
      disablePlugin(pluginName);
    }
  };

  const handleTestConnection = async (pluginName: string) => {
    setTestingPlugins(prev => new Set(prev).add(pluginName));
    
    try {
      const success = await testPluginConnection(pluginName);
      Alert.alert(
        '连接测试',
        success ? '连接成功！' : '连接失败，请检查配置。',
        [{ text: '确定' }]
      );
    } catch (error) {
      Alert.alert('连接测试', '测试过程中发生错误', [{ text: '确定' }]);
    } finally {
      setTestingPlugins(prev => {
        const newSet = new Set(prev);
        newSet.delete(pluginName);
        return newSet;
      });
    }
  };

  const handleDeletePlugin = (pluginName: string, metadata: PluginMetadata) => {
    if (metadata.source === 'builtin') {
      Alert.alert('提示', '内置插件无法删除', [{ text: '确定' }]);
      return;
    }

    Alert.alert(
      '删除插件',
      `确定要删除插件 "${pluginName}" 吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: () => unregisterPlugin(pluginName)
        }
      ]
    );
  };

  const renderPluginItem = ({ item }: { item: { plugin: any; metadata: PluginMetadata } }) => {
    const { plugin, metadata } = item;
    const isTesting = testingPlugins.has(plugin.name);

    return (
      <View style={styles.pluginItem}>
        <TouchableOpacity
          style={styles.pluginInfo}
          onPress={() => onPluginPress?.(plugin.name)}
        >
          <View style={styles.pluginHeader}>
            <Text style={styles.pluginName}>{plugin.name}</Text>
            <View style={styles.pluginBadges}>
              {metadata.source === 'builtin' && (
                <View style={[styles.badge, styles.builtinBadge]}>
                  <Text style={styles.badgeText}>内置</Text>
                </View>
              )}
              {metadata.source === 'imported' && (
                <View style={[styles.badge, styles.importedBadge]}>
                  <Text style={styles.badgeText}>导入</Text>
                </View>
              )}
            </View>
          </View>
          
          <Text style={styles.pluginVersion}>v{plugin.version}</Text>
          <Text style={styles.pluginAuthor}>作者: {plugin.author}</Text>
          <Text style={styles.pluginDescription}>{plugin.description}</Text>
        </TouchableOpacity>

        <View style={styles.pluginActions}>
          <Switch
            value={metadata.enabled}
            onValueChange={(enabled) => handleTogglePlugin(plugin.name, enabled)}
            trackColor={{ false: colors.background, true: colors.primary }}
            thumbColor={metadata.enabled ? colors.background : colors.text}
          />

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onConfigPress?.(plugin.name)}
          >
            <MaterialIcons name="settings" size={24} color={colors.text} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleTestConnection(plugin.name)}
            disabled={isTesting || !metadata.enabled}
          >
            {isTesting ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <MaterialIcons 
                name="wifi" 
                size={24} 
                color={metadata.enabled ? colors.text : colors.textMuted} 
              />
            )}
          </TouchableOpacity>

          {metadata.source !== 'builtin' && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleDeletePlugin(plugin.name, metadata)}
            >
              <MaterialIcons name="delete" size={24} color={colors.error} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>加载插件中...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error" size={48} color={colors.error} />
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={plugins}
        keyExtractor={(item) => item.plugin.name}
        renderItem={renderPluginItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContainer: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 16,
    color: colors.text,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 32,
  },
  errorText: {
    marginTop: 16,
    color: colors.error,
    fontSize: 16,
    textAlign: 'center',
  },
  pluginItem: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pluginInfo: {
    flex: 1,
    marginRight: 16,
  },
  pluginHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  pluginName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  pluginBadges: {
    flexDirection: 'row',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 4,
  },
  builtinBadge: {
    backgroundColor: colors.primary,
  },
  importedBadge: {
    backgroundColor: colors.secondary,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.background,
  },
  pluginVersion: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 2,
  },
  pluginAuthor: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 4,
  },
  pluginDescription: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  pluginActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
});

export default PluginList;
