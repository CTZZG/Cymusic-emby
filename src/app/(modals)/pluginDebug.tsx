/**
 * 插件系统调试页面
 * 用于测试和调试插件功能
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize } from '@/constants/tokens';
import { usePluginStore } from '@/store/pluginStore';
import PluginSystemTest from '@/utils/pluginSystemTest';
import { router } from 'expo-router';

export default function PluginDebugScreen() {
  const { plugins } = usePluginStore();
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);
  const [systemStatus, setSystemStatus] = useState<any>(null);

  useEffect(() => {
    // 获取系统状态
    const status = PluginSystemTest.getSystemStatus();
    setSystemStatus(status);
  }, [plugins]);

  const runTests = async () => {
    setTesting(true);
    try {
      const results = await PluginSystemTest.runAllTests();
      setTestResults(results);
      
      const passedTests = Object.values(results).filter(result => result).length;
      const totalTests = Object.keys(results).length;
      
      Alert.alert(
        '测试完成',
        `${passedTests}/${totalTests} 个测试通过`,
        [{ text: '确定' }]
      );
    } catch (error) {
      Alert.alert('测试失败', error instanceof Error ? error.message : '未知错误');
    } finally {
      setTesting(false);
    }
  };

  const runSingleTest = async (testName: string) => {
    setTesting(true);
    try {
      let result = false;
      
      switch (testName) {
        case 'pluginLoading':
          result = await PluginSystemTest.testPluginLoading();
          break;
        case 'pluginSearch':
          result = await PluginSystemTest.testPluginSearch();
          break;
        case 'pluginMediaSource':
          result = await PluginSystemTest.testPluginMediaSource();
          break;
        case 'playbackCallback':
          result = await PluginSystemTest.testPlaybackCallback();
          break;
        case 'pluginStore':
          result = await PluginSystemTest.testPluginStore();
          break;
        case 'pluginVariables':
          result = PluginSystemTest.testPluginVariables();
          break;
      }
      
      Alert.alert(
        '单项测试结果',
        result ? '✅ 测试通过' : '❌ 测试失败',
        [{ text: '确定' }]
      );
    } catch (error) {
      Alert.alert('测试失败', error instanceof Error ? error.message : '未知错误');
    } finally {
      setTesting(false);
    }
  };

  const renderSystemStatus = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>系统状态</Text>
      {systemStatus && (
        <View style={styles.statusContainer}>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>总插件数:</Text>
            <Text style={styles.statusValue}>{systemStatus.totalPlugins}</Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>已启用:</Text>
            <Text style={[styles.statusValue, { color: colors.primary }]}>
              {systemStatus.enabledPlugins}
            </Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>已禁用:</Text>
            <Text style={[styles.statusValue, { color: colors.textMuted }]}>
              {systemStatus.disabledPlugins}
            </Text>
          </View>
        </View>
      )}
    </View>
  );

  const renderPluginDetails = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>插件详情</Text>
      {systemStatus?.pluginDetails.map((plugin: any, index: number) => (
        <View key={index} style={styles.pluginCard}>
          <View style={styles.pluginHeader}>
            <Text style={styles.pluginName}>{plugin.platform}</Text>
            <Text style={styles.pluginVersion}>v{plugin.version}</Text>
            <View style={[
              styles.statusBadge,
              { backgroundColor: plugin.enabled ? colors.primary : colors.textMuted }
            ]}>
              <Text style={styles.statusBadgeText}>
                {plugin.enabled ? '启用' : '禁用'}
              </Text>
            </View>
          </View>
          
          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <Ionicons 
                name={plugin.hasSearch ? 'checkmark-circle' : 'close-circle'} 
                size={16} 
                color={plugin.hasSearch ? colors.primary : colors.textMuted} 
              />
              <Text style={styles.featureText}>搜索</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons 
                name={plugin.hasMediaSource ? 'checkmark-circle' : 'close-circle'} 
                size={16} 
                color={plugin.hasMediaSource ? colors.primary : colors.textMuted} 
              />
              <Text style={styles.featureText}>音源</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons 
                name={plugin.hasLyric ? 'checkmark-circle' : 'close-circle'} 
                size={16} 
                color={plugin.hasLyric ? colors.primary : colors.textMuted} 
              />
              <Text style={styles.featureText}>歌词</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons 
                name={plugin.hasPlaybackCallback ? 'checkmark-circle' : 'close-circle'} 
                size={16} 
                color={plugin.hasPlaybackCallback ? colors.primary : colors.textMuted} 
              />
              <Text style={styles.featureText}>回调</Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );

  const renderTestResults = () => {
    if (!testResults) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>测试结果</Text>
        {Object.entries(testResults).map(([testName, result]) => (
          <View key={testName} style={styles.testResultRow}>
            <Ionicons 
              name={result ? 'checkmark-circle' : 'close-circle'} 
              size={20} 
              color={result ? colors.primary : colors.error} 
            />
            <Text style={styles.testName}>{getTestDisplayName(testName)}</Text>
            <Text style={[
              styles.testResult,
              { color: result ? colors.primary : colors.error }
            ]}>
              {result ? '通过' : '失败'}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  const getTestDisplayName = (testName: string) => {
    const names: { [key: string]: string } = {
      pluginLoading: '插件加载',
      pluginSearch: '插件搜索',
      pluginMediaSource: '音源获取',
      playbackCallback: '播放回调',
      pluginStore: '插件存储'
    };
    return names[testName] || testName;
  };

  return (
    <View style={styles.container}>
      {/* 头部 */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>插件系统调试</Text>
      </View>

      <ScrollView style={styles.content}>
        {renderSystemStatus()}
        {renderPluginDetails()}

        {/* 测试按钮 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>功能测试</Text>
          
          <TouchableOpacity 
            style={[styles.testButton, styles.primaryButton]}
            onPress={runTests}
            disabled={testing}
          >
            {testing ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons name="play-circle" size={20} color="white" />
            )}
            <Text style={styles.primaryButtonText}>运行所有测试</Text>
          </TouchableOpacity>

          <View style={styles.singleTestContainer}>
            {[
              { key: 'pluginLoading', name: '插件加载测试' },
              { key: 'pluginSearch', name: '搜索功能测试' },
              { key: 'pluginMediaSource', name: '音源获取测试' },
              { key: 'playbackCallback', name: '播放回调测试' },
              { key: 'pluginStore', name: '存储功能测试' },
              { key: 'pluginVariables', name: '变量配置测试' },
            ].map((test) => (
              <TouchableOpacity
                key={test.key}
                style={styles.singleTestButton}
                onPress={() => runSingleTest(test.key)}
                disabled={testing}
              >
                <Text style={styles.singleTestButtonText}>{test.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {renderTestResults()}
      </ScrollView>
    </View>
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
    marginRight: 16,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.text,
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
  statusContainer: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  statusValue: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.text,
  },
  pluginCard: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
  },
  pluginHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  pluginName: {
    fontSize: fontSize.base,
    fontWeight: '500',
    color: colors.text,
    flex: 1,
  },
  pluginVersion: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: fontSize.xs,
    color: 'white',
    fontWeight: '500',
  },
  featureList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  featureText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: fontSize.base,
    fontWeight: '500',
  },
  singleTestContainer: {
    gap: 8,
  },
  singleTestButton: {
    backgroundColor: colors.surface,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  singleTestButtonText: {
    fontSize: fontSize.sm,
    color: colors.text,
    textAlign: 'center',
  },
  testResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  testName: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text,
  },
  testResult: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
});
