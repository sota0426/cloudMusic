import React from 'react';
// React Nativeの標準インポート
import { ActivityIndicator, Button, StyleSheet, Text, View } from 'react-native';
// Expo Audioのインポート
import { useAudioPlayer } from 'expo-audio';

// ★★★ クラウド上のオーディオファイルのURL ★★★
const CLOUD_AUDIO_SOURCE = "https://drive.google.com/uc?export=download&id=1yg66YuvnYz2NkdPkFpoktuDQyIdcNLEz"

export default function SimpleAudioTest() {
  // useAudioPlayerフックにリモートURLを渡し、playerオブジェクトを取得
  const player = useAudioPlayer(CLOUD_AUDIO_SOURCE);

  // 読み込みが完了していない場合の表示
  if (!player.isLoaded) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.statusText}>オーディオファイルを読み込み中...</Text>
      </View>
    );
  }

  // 再生/一時停止を切り替えるトグル関数
  const togglePlayPause = () => {
    if (player.playing) {
      player.pause();
    } else {
      player.play();
    }
  };

  return (
    // Webのdivの代わりにViewを使用
    <View style={styles.container}>
      <Text style={styles.title}>クラウドオーディオテスト (Expo)</Text>
      
      {/* ステータス表示 */}
      <Text style={[styles.statusText, { color: player.playing ? '#2ecc71' : '#e74c3c' }]}>
        ステータス: {player.playing ? '再生中' : '停止中/一時停止'}
      </Text>

      {/* プレイ/ポーズボタン */}
      <View style={styles.buttonWrapper}>
        <Button 
          title={player.playing ? "一時停止 (Pause)" : "再生 (Play)"} 
          onPress={togglePlayPause} 
          color={player.playing ? "#e74c3c" : "#3498db"}
        />
      </View>

      <Text style={styles.urlText}>Source: {CLOUD_AUDIO_SOURCE}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f4f8',
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#34495e',
  },
  statusText: {
    fontSize: 18,
    marginBottom: 30,
    fontWeight: '600',
  },
  buttonWrapper: {
    width: '80%',
    marginVertical: 10,
  },
  urlText: {
    marginTop: 20,
    fontSize: 10,
    color: '#999',
    textAlign: 'center',
  }
});