// OfflineScreen.tsx

import { usePlayer } from "@/provider/PlayerProvider";
import { OfflineAudioFile, useOfflineStorage } from "@/provider/useOfflineStorage.ts";
import AntDesign from '@expo/vector-icons/AntDesign';
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function OfflineScreen() {
  const { 
    offlineFiles,
    loading,
    isNative,
    fetchOfflineFiles,
    deleteFile,
  } = useOfflineStorage();

  const { 
    playAudio, 
    pauseAudio, 
    resumeAudio, 
    stopAudio,
    currentAudio, 
    isPlaying,
    isLoading: playerLoading
  } = usePlayer();

  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);

  useEffect(() => {
    fetchOfflineFiles();
  }, []);

  // ファイル削除のハンドラ
  const handleDeleteFile = async (file: OfflineAudioFile) => {
    Alert.alert(
      "ダウンロードを削除",
      `「${file.name}」を削除しますか?`,
      [
        { text: "キャンセル", style: "cancel" },
        {
          text: "削除",
          style: "destructive",
          onPress: async () => {
            setDeletingFileId(file.id);
            try {
              await deleteFile(file.id);
              // 再生中のファイルを削除した場合は停止
              if (currentAudio?.id === file.id) {
                stopAudio();
              }
            } catch (error) {
              Alert.alert("エラー", "ファイルの削除に失敗しました");
            } finally {
              setDeletingFileId(null);
            }
          }
        }
      ]
    );
  };

  // 音声ファイルの再生処理
  const handlePlayAudio = async (file: OfflineAudioFile) => {
    try {
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("🎯 handlePlayAudio() (Offline) 開始");
      console.log("📁 選択ファイル:", file.name);
      console.log("🆔 ファイルID:", file.id);
      console.log("📂 ローカルパス:", file.localPath);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

      // オフラインファイルリストを再生リストとして構築
      const audioList = offlineFiles.map(f => ({
        id: f.id,
        name: f.name,
        url: f.localPath, // ローカルパスを使用
        source: f.source,
        mimeType: f.mimeType,
      }));

      // 選択されたファイルのインデックスを取得
      const initialIndex = audioList.findIndex(audio => audio.id === file.id);

      console.log(`🎵 ${audioList.length}個のオフラインファイルを再生リストとして渡します。インデックス: ${initialIndex}`);

      await playAudio(audioList, initialIndex);

      console.log("✅ handlePlayAudio() (Offline) 完了");
      
    } catch (error) {
      console.error("❌ 再生エラー:", error);
      Alert.alert("再生エラー", `音声ファイルの再生に失敗しました: ${error}`);
    }
  };

  // アイテムタップのハンドラ
  const handleItemPress = (file: OfflineAudioFile) => {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("👆 handleItemPress() (Offline) 呼び出された!");
    console.log("📁 ファイル名:", file.name);
    console.log("🆔 ファイルID:", file.id);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    // 既に再生中のファイルをタップした場合は一時停止/再開
    if (currentAudio?.id === file.id) {
      console.log("🔄 同じファイル - 一時停止/再開");
      if (isPlaying) {
        pauseAudio();
      } else {
        resumeAudio();
      }
    } else {
      console.log("▶️ 新しいファイル - 再生開始");
      handlePlayAudio(file);
    }
  };

  // フォーマット日時
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // ネイティブプラットフォームでない場合
  if (!isNative) {
    return (
      <View className="flex-1 justify-center items-center bg-black">
        <Text className="text-white text-xl mb-4">
          オフライン再生はモバイルアプリでのみ利用可能です
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black p-4">
      {/* ヘッダー */}
      <View className="flex-row items-center mb-4 justify-between">
        <View className="flex-row items-center">
          <AntDesign name="download" size={24} color="#10b981" />
          <Text className="text-white text-2xl ml-2">
            {loading ? "ロード中..." : "オフライン"}
          </Text>
        </View>
        {!loading && (
          <Pressable onPress={fetchOfflineFiles} className="ml-2 items-center">
            <AntDesign name="reload" size={16} color="white" />        
          </Pressable>
        )}
        {loading && <ActivityIndicator size="small" color="white" className="ml-2" />}
      </View>

      {/* ファイル数の表示 */}
      {offlineFiles.length > 0 && (
        <View className="mb-2">
          <Text className="text-gray-400 text-sm">
            {offlineFiles.length}個のファイルがダウンロード済み
          </Text>
        </View>
      )}

      {/* ファイルリスト */}
      <FlatList 
        data={offlineFiles}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const isCurrentlyPlaying = currentAudio?.id === item.id && isPlaying;
          const isCurrentAudio = currentAudio?.id === item.id;
          const isDeleting = deletingFileId === item.id;
          
          return (
            <Pressable
              onPress={() => handleItemPress(item)}
              className={`p-4 mb-2 rounded-lg ${
                isCurrentAudio ? 'bg-gray-800' : 'bg-gray-900'
              }`}
            >
              <View className="flex-row items-center">
                {/* アイコン */}
                <Text className="text-2xl mr-3">🎵</Text>

                {/* ファイル情報 */}
                <View className="flex-1">
                  <Text className="text-white font-medium text-base" numberOfLines={1}>
                    {item.name}
                  </Text>
                  
                  <View className="flex-row items-center mt-1">
                    <Text className="text-gray-400 text-xs">
                      {item.source === 'onedrive' ? 'OneDrive' : 'Google Drive'}
                    </Text>
                    <Text className="text-gray-400 text-xs mx-2">•</Text>
                    <Text className="text-gray-400 text-xs">
                      {formatDate(item.downloadedAt)}
                    </Text>
                  </View>

                  {/* 再生状態の表示 */}
                  {isCurrentlyPlaying && (
                    <View className="flex-row items-center mt-2">
                      <View className="w-2 h-2 bg-green-400 rounded-full mr-2" />
                      <Text className="text-green-400 text-xs">再生中</Text>
                    </View>
                  )}

                  {isCurrentAudio && !isPlaying && (
                    <View className="flex-row items-center mt-2">
                      <Text className="text-yellow-400 text-xs">一時停止中</Text>
                    </View>
                  )}
                </View>

                {/* 削除ボタン */}
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#ef4444" />
                ) : (
                  <Pressable
                    onPress={() => handleDeleteFile(item)}
                    className="p-2"
                    hitSlop={8}
                  >
                    <AntDesign name="delete" size={20} color="#ef4444" />
                  </Pressable>
                )}
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={() => (
          <View className="mt-20 items-center">
            <AntDesign name="download" size={64} color="#4b5563" />
            <Text className="text-gray-400 text-center mt-4 text-base">
              ダウンロードされた音楽はありません
            </Text>
            <Text className="text-gray-500 text-center mt-2 text-sm px-8">
              OneDriveやGoogle Driveから音楽ファイルをダウンロードすると、ここに表示されます
            </Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}