/**
 * 插件管理页面
 */

import PluginCard from '@/components/plugin/PluginCard';
import { colors, fontSize } from '@/constants/tokens';
import { initializePluginStore, usePluginStore } from '@/store/pluginStore';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

export default function PluginManagerModal() {
  const {
    plugins,
    loading,
    error,
    addPlugin,
    removePlugin,
    enablePlugin,
    disablePlugin,
    updatePlugin,
    clearError,
    refreshPlugins
  } = usePluginStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [pluginUrl, setPluginUrl] = useState('');
  const [addingPlugin, setAddingPlugin] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    initializePluginStore();
  }, []);

  useEffect(() => {
    if (error) {
      Toast.show({
        type: 'error',
        text1: '插件操作失败',
        text2: error,
        visibilityTime: 3000,
      });
      clearError();
    }
  }, [error]);

  const handleAddPlugin = async () => {
    if (!pluginUrl.trim()) {
      Toast.show({
        type: 'error',
        text1: '请输入插件URL',
        visibilityTime: 2000,
      });
      return;
    }

    setAddingPlugin(true);
    try {
      await addPlugin(pluginUrl.trim());
      setPluginUrl('');
      setShowAddModal(false);
      Toast.show({
        type: 'success',
        text1: '插件添加成功',
        visibilityTime: 2000,
      });
    } catch (error) {
      // 错误已经在store中处理
    } finally {
      setAddingPlugin(false);
    }
  };

  const handleRemovePlugin = (pluginId: string, pluginName: string) => {
    Alert.alert(
      '确认删除',
      `确定要删除插件 "${pluginName}" 吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              await removePlugin(pluginId);
              Toast.show({
                type: 'success',
                text1: '插件删除成功',
                visibilityTime: 2000,
              });
            } catch (error) {
              // 错误已经在store中处理
            }
          },
        },
      ]
    );
  };

  const handleTogglePlugin = async (pluginId: string, enabled: boolean) => {
    try {
      if (enabled) {
        await disablePlugin(pluginId);
      } else {
        await enablePlugin(pluginId);
      }
    } catch (error) {
      // 错误已经在store中处理
    }
  };

  const handleUpdatePlugin = async (pluginId: string) => {
    try {
      await updatePlugin(pluginId);
      Toast.show({
        type: 'success',
        text1: '插件更新成功',
        visibilityTime: 2000,
      });
    } catch (error) {
      // 错误已经在store中处理
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      refreshPlugins();
    } finally {
      setRefreshing(false);
    }
  };

  const handlePluginSettings = (pluginId: string) => {
    router.push(`/(modals)/pluginSettings?pluginId=${pluginId}`);
  };

  const enabledCount = plugins.filter(p => p.enabled).length;
  const totalCount = plugins.length;

  return (
    <SafeAreaView style={styles.container}>
      {/* 头部 */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.title}>插件管理</Text>
          <Text style={styles.subtitle}>
            {enabledCount}/{totalCount} 个插件已启用
          </Text>
        </View>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="add" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* 插件列表 */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {loading && plugins.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>加载插件中...</Text>
          </View>
        ) : plugins.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="extension-puzzle" size={64} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>暂无插件</Text>
            <Text style={styles.emptySubtitle}>
              点击右上角的 + 号添加插件
            </Text>
          </View>
        ) : (
          plugins.map((plugin) => (
            <PluginCard
              key={plugin.id}
              plugin={plugin}
              onToggle={() => handleTogglePlugin(plugin.id, plugin.enabled)}
              onRemove={() => handleRemovePlugin(plugin.id, plugin.instance.platform)}
              onUpdate={() => handleUpdatePlugin(plugin.id)}
              onSettings={() => handlePluginSettings(plugin.id)}
            />
          ))
        )}
      </ScrollView>

      {/* 添加插件模态框 */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>添加插件</Text>
              <TouchableOpacity
                onPress={() => setShowAddModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>插件URL</Text>
              <TextInput
                style={styles.input}
                value={pluginUrl}
                onChangeText={setPluginUrl}
                placeholder="输入插件的URL地址"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                returnKeyType="done"
                onSubmitEditing={handleAddPlugin}
              />

              <Text style={styles.helpText}>
                支持从URL加载插件，例如：{'\n'}
                https://example.com/plugin.js
              </Text>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.cancelButtonText}>取消</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.confirmButton]}
                onPress={handleAddPlugin}
                disabled={addingPlugin}
              >
                {addingPlugin ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.confirmButtonText}>添加</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  addButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: fontSize.base,
    color: colors.textMuted,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: fontSize.base,
    color: colors.textMuted,
    marginTop: 8,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderRadius: 12,
    margin: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.text,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  inputLabel: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: fontSize.base,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  helpText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 12,
    lineHeight: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    fontSize: fontSize.base,
    color: colors.text,
  },
  confirmButton: {
    backgroundColor: colors.primary,
  },
  confirmButtonText: {
    fontSize: fontSize.base,
    color: 'white',
    fontWeight: '600',
  },
});
