/**
 * 插件设置页面
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { colors, fontSize } from '@/constants/tokens';
import { usePluginStore } from '@/store/pluginStore';
import { usePluginVariableStore } from '@/store/pluginVariableStore';
import { selectPluginVariableDefinitions } from '@/store/pluginVariableStore';
import { IUserVariable } from '@/types/PluginTypes';
import Toast from 'react-native-toast-message';

export default function PluginSettingsModal() {
  const { pluginId } = useLocalSearchParams<{ pluginId: string }>();
  const { getPlugin } = usePluginStore();
  const {
    getPluginVariables,
    setPluginVariable,
    resetPluginVariables,
    validateVariable,
    error,
    clearError
  } = usePluginVariableStore();

  const [variables, setVariables] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  const plugin = pluginId ? getPlugin(pluginId) : null;
  const variableDefinitions = pluginId ? selectPluginVariableDefinitions(pluginId) : [];

  useEffect(() => {
    if (pluginId) {
      const currentVariables = getPluginVariables(pluginId);
      setVariables(currentVariables);
    }
  }, [pluginId]);

  useEffect(() => {
    if (error) {
      Toast.show({
        type: 'error',
        text1: '设置失败',
        text2: error,
        visibilityTime: 3000,
      });
      clearError();
    }
  }, [error]);

  if (!plugin) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color={colors.textMuted} />
          <Text style={styles.errorTitle}>插件未找到</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>返回</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleVariableChange = async (key: string, value: string) => {
    // 立即更新本地状态
    setVariables(prev => ({ ...prev, [key]: value }));

    // 验证并保存到store
    try {
      const validationError = validateVariable(pluginId!, key, value);
      if (validationError) {
        Toast.show({
          type: 'error',
          text1: '输入错误',
          text2: validationError,
          visibilityTime: 2000,
        });
        return;
      }

      await setPluginVariable(pluginId!, key, value);
    } catch (error) {
      // 错误已经在store中处理
    }
  };

  const handleReset = () => {
    Alert.alert(
      '重置设置',
      '确定要将所有设置重置为默认值吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '重置',
          style: 'destructive',
          onPress: async () => {
            setResetting(true);
            try {
              await resetPluginVariables(pluginId!);
              const resetVariables = getPluginVariables(pluginId!);
              setVariables(resetVariables);
              Toast.show({
                type: 'success',
                text1: '设置已重置',
                visibilityTime: 2000,
              });
            } catch (error) {
              // 错误已经在store中处理
            } finally {
              setResetting(false);
            }
          },
        },
      ]
    );
  };

  const renderVariableInput = (variable: IUserVariable) => {
    const value = variables[variable.key] || '';

    switch (variable.type) {
      case 'boolean':
        return (
          <View style={styles.switchContainer}>
            <Switch
              value={value === 'true'}
              onValueChange={(newValue) => 
                handleVariableChange(variable.key, newValue.toString())
              }
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={value === 'true' ? 'white' : colors.textMuted}
            />
          </View>
        );

      case 'password':
        return (
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={(text) => handleVariableChange(variable.key, text)}
            placeholder={variable.defaultValue || '请输入密码'}
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
        );

      case 'number':
        return (
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={(text) => handleVariableChange(variable.key, text)}
            placeholder={variable.defaultValue || '请输入数字'}
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
            autoCapitalize="none"
            autoCorrect={false}
          />
        );

      default:
        return (
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={(text) => handleVariableChange(variable.key, text)}
            placeholder={variable.defaultValue || '请输入内容'}
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            multiline={variable.key.includes('url') ? false : true}
            numberOfLines={variable.key.includes('url') ? 1 : 3}
          />
        );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 头部 */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.title}>{plugin.instance.platform}</Text>
          <Text style={styles.subtitle}>插件设置</Text>
        </View>

        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleReset}
          disabled={resetting}
        >
          {resetting ? (
            <ActivityIndicator size="small" color={colors.text} />
          ) : (
            <Ionicons name="refresh" size={24} color={colors.text} />
          )}
        </TouchableOpacity>
      </View>

      {/* 设置内容 */}
      <ScrollView style={styles.content}>
        {/* 插件信息 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>插件信息</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>名称</Text>
              <Text style={styles.infoValue}>{plugin.instance.platform}</Text>
            </View>
            {plugin.instance.version && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>版本</Text>
                <Text style={styles.infoValue}>{plugin.instance.version}</Text>
              </View>
            )}
            {plugin.instance.author && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>作者</Text>
                <Text style={styles.infoValue}>{plugin.instance.author}</Text>
              </View>
            )}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>状态</Text>
              <Text style={[
                styles.infoValue,
                { color: plugin.enabled ? colors.primary : colors.textMuted }
              ]}>
                {plugin.enabled ? '已启用' : '已禁用'}
              </Text>
            </View>
          </View>
        </View>

        {/* 变量设置 */}
        {variableDefinitions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>配置参数</Text>
            {variableDefinitions.map((variable) => (
              <View key={variable.key} style={styles.variableCard}>
                <View style={styles.variableHeader}>
                  <Text style={styles.variableName}>
                    {variable.name || variable.key}
                  </Text>
                  {variable.description && (
                    <Text style={styles.variableDescription}>
                      {variable.description}
                    </Text>
                  )}
                </View>
                <View style={styles.variableInput}>
                  {renderVariableInput(variable)}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* 功能支持 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>功能支持</Text>
          <View style={styles.featuresCard}>
            {[
              { key: 'search', name: '搜索', icon: 'search' },
              { key: 'getMediaSource', name: '音源获取', icon: 'musical-notes' },
              { key: 'getLyric', name: '歌词获取', icon: 'document-text' },
              { key: 'getTopLists', name: '榜单', icon: 'trophy' },
              { key: 'getRecommendSheetsByTag', name: '推荐歌单', icon: 'heart' },
              { key: 'playbackCallback', name: '播放回调', icon: 'radio' },
            ].map((feature) => (
              <View key={feature.key} style={styles.featureRow}>
                <Ionicons 
                  name={feature.icon as any} 
                  size={20} 
                  color={colors.textMuted} 
                />
                <Text style={styles.featureName}>{feature.name}</Text>
                <Ionicons
                  name={plugin.instance[feature.key] ? 'checkmark-circle' : 'close-circle'}
                  size={20}
                  color={plugin.instance[feature.key] ? colors.primary : colors.textMuted}
                />
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
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
  headerButton: {
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
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: fontSize.base,
    color: colors.textMuted,
  },
  infoValue: {
    fontSize: fontSize.base,
    color: colors.text,
    fontWeight: '500',
  },
  variableCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  variableHeader: {
    marginBottom: 12,
  },
  variableName: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.text,
  },
  variableDescription: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 4,
  },
  variableInput: {
    // 容器样式
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: fontSize.base,
    color: colors.text,
    backgroundColor: colors.background,
  },
  switchContainer: {
    alignItems: 'flex-start',
  },
  featuresCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  featureName: {
    flex: 1,
    fontSize: fontSize.base,
    color: colors.text,
    marginLeft: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontSize: fontSize.base,
    fontWeight: '600',
  },
});
