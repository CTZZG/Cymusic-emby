import React, { useState } from 'react';
import { Modal, View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '@/constants/tokens';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ComponentProps } from 'react';
import { useLibraryStore } from '@/store/library'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'

type IconProps = Omit<ComponentProps<typeof MaterialCommunityIcons>, 'name'>;

export const ShowPlayerListToggle = ({ ...iconProps }: IconProps) => {
  const [modalVisible, setModalVisible] = useState(false);
  const nowPlaylist = useLibraryStore((state) => state.tracks); // 获取播放列表数据

  const showPlayList = () => {

		router.navigate('/(modals)/playList')

  };

  const hidePlayList = () => {
    setModalVisible(false);
  };

  return (
    <>
      <MaterialCommunityIcons
        name={'playlist-music-outline'}
        onPress={showPlayList}
        color={colors.icon}
        {...iconProps}
      />


    </>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
	borderRadius: 12,
		paddingVertical: 10,
    padding: 10,
        marginTop: 20,
    opacity: 0.75,
  },
  modalContent: {
    width: '90%',

    backgroundColor: 'white',
    borderRadius: 10,
    padding:50,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  listItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  trackTitle: {
    fontSize: 16,
  },
  trackArtist: {
    fontSize: 14,
    color: 'gray',
  },
  closeButton: {
    marginTop: 20,
    padding: 10,
    backgroundColor: colors.primary,
    borderRadius: 5,
  },
  closeButtonText: {
    color: 'black',
    fontWeight: 'bold',
  },
});
