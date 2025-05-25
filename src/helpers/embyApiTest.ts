// Emby API 测试文件
// 这个文件用于测试Emby API的基本功能

import { 
  initializeEmby, 
  getEmbyToken, 
  searchMusicInternal,
  searchAlbumInternal,
  searchArtistInternal,
  type EmbyConfig 
} from './embyApi';

// 测试配置（请根据实际情况修改）
const testConfig: EmbyConfig = {
  url: 'http://localhost:8096', // 替换为你的Emby服务器地址
  username: 'test', // 替换为你的用户名
  password: 'test', // 替换为你的密码
  deviceId: 'cymusic-test-device',
  uploadPlaylistToEmby: false
};

// 测试认证
export async function testEmbyAuth(): Promise<boolean> {
  console.log('🔐 测试Emby认证...');
  
  try {
    initializeEmby(testConfig);
    const tokenInfo = await getEmbyToken(true);
    
    if (tokenInfo) {
      console.log('✅ 认证成功！');
      console.log('Token:', tokenInfo.token.substring(0, 10) + '...');
      console.log('User ID:', tokenInfo.userId);
      return true;
    } else {
      console.log('❌ 认证失败');
      return false;
    }
  } catch (error) {
    console.error('❌ 认证错误:', error);
    return false;
  }
}

// 测试搜索音乐
export async function testSearchMusic(query: string = 'test'): Promise<void> {
  console.log(`🎵 测试搜索音乐: "${query}"`);
  
  try {
    const result = await searchMusicInternal(query, 1, 10);
    console.log('✅ 搜索结果:');
    console.log(`- 找到 ${result.data.length} 首歌曲`);
    console.log(`- 是否结束: ${result.isEnd}`);
    
    if (result.data.length > 0) {
      const firstSong = result.data[0];
      console.log('第一首歌曲:');
      console.log(`  - 标题: ${firstSong.title}`);
      console.log(`  - 艺术家: ${firstSong.artist}`);
      console.log(`  - 专辑: ${firstSong.album}`);
      console.log(`  - 时长: ${firstSong.duration}秒`);
    }
  } catch (error) {
    console.error('❌ 搜索音乐错误:', error);
  }
}

// 测试搜索专辑
export async function testSearchAlbum(query: string = 'test'): Promise<void> {
  console.log(`💿 测试搜索专辑: "${query}"`);
  
  try {
    const result = await searchAlbumInternal(query, 1);
    console.log('✅ 搜索结果:');
    console.log(`- 找到 ${result.data.length} 个专辑`);
    console.log(`- 是否结束: ${result.isEnd}`);
    
    if (result.data.length > 0) {
      const firstAlbum = result.data[0];
      console.log('第一个专辑:');
      console.log(`  - 标题: ${firstAlbum.title}`);
      console.log(`  - 艺术家: ${firstAlbum.artist}`);
      console.log(`  - 歌曲数: ${firstAlbum.worksNum}`);
    }
  } catch (error) {
    console.error('❌ 搜索专辑错误:', error);
  }
}

// 测试搜索艺术家
export async function testSearchArtist(query: string = 'test'): Promise<void> {
  console.log(`👤 测试搜索艺术家: "${query}"`);
  
  try {
    const result = await searchArtistInternal(query, 1);
    console.log('✅ 搜索结果:');
    console.log(`- 找到 ${result.data.length} 个艺术家`);
    console.log(`- 是否结束: ${result.isEnd}`);
    
    if (result.data.length > 0) {
      const firstArtist = result.data[0];
      console.log('第一个艺术家:');
      console.log(`  - 名称: ${firstArtist.name}`);
      console.log(`  - 作品数: ${firstArtist.worksNum}`);
    }
  } catch (error) {
    console.error('❌ 搜索艺术家错误:', error);
  }
}

// 运行所有测试
export async function runAllTests(): Promise<void> {
  console.log('🚀 开始Emby API测试...\n');
  
  // 测试认证
  const authSuccess = await testEmbyAuth();
  if (!authSuccess) {
    console.log('❌ 认证失败，跳过其他测试');
    return;
  }
  
  console.log('\n');
  
  // 测试搜索功能
  await testSearchMusic();
  console.log('\n');
  
  await testSearchAlbum();
  console.log('\n');
  
  await testSearchArtist();
  console.log('\n');
  
  console.log('🎉 所有测试完成！');
}

// 使用说明
export const testInstructions = `
🧪 Emby API 测试使用说明：

1. 修改 testConfig 中的配置信息：
   - url: 你的Emby服务器地址
   - username: 你的Emby用户名
   - password: 你的Emby密码

2. 在控制台中运行测试：
   import { runAllTests } from '@/helpers/embyApiTest';
   runAllTests();

3. 或者单独测试某个功能：
   import { testEmbyAuth, testSearchMusic } from '@/helpers/embyApiTest';
   testEmbyAuth();
   testSearchMusic('你想搜索的歌曲名');
`;

export default {
  testEmbyAuth,
  testSearchMusic,
  testSearchAlbum,
  testSearchArtist,
  runAllTests,
  testInstructions
};
