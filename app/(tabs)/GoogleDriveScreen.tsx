import DriveListItem from "@/components/audio/DriveListItem";
import { AudioMetadata, usePlayer } from "@/provider/PlayerProvider";
import { GoogleDriveFile, useGoogleDrive } from "@/provider/useGoogleDrive";
import { useOfflineStorage } from "@/provider/useOfflineStorage.ts";
import AntDesign from "@expo/vector-icons/AntDesign";
import Entypo from "@expo/vector-icons/Entypo";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Platform, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const ROOT_ID = "root";

// 音声ファイルの拡張子リスト
const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac'];

export default function GoogleDriveFilesScreen() {
  const {
    files,
    loading,
    isAuthenticated,
    signIn,
    fetchGoogleDriveFiles,
    getDownloadUrl,
    downloadToLocal,
    accessToken,
  } = useGoogleDrive();

  const {
    offlineFiles,
    downloadFile,
    deleteFile,
    getLocalFilePath,
    downloadTasks,
  } = useOfflineStorage();

  const {
    playAudio,
    pauseAudio,
    resumeAudio,
    currentAudio,
    isPlaying
  } = usePlayer();

  const [currentFolderId, setCurrentFolderId] = useState(ROOT_ID);
  const [folderHistory, setFolderHistory] = useState<string[]>([]);
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);

  const isNative = Platform.OS !== 'web';

  useEffect(() => {
    if (isAuthenticated) {
      fetchGoogleDriveFiles(currentFolderId);
    }
  }, [isAuthenticated, currentFolderId]);

  const isAudioFile = (file: GoogleDriveFile): boolean => {
    if (file.mimeType.startsWith("audio/")) {
      return true;
    }
    const lowerName = file.name.toLowerCase();
    return AUDIO_EXTENSIONS.some(ext => lowerName.endsWith(ext));
  };

  const handleFetchGoogleDriveFiles = () => {
    fetchGoogleDriveFiles(currentFolderId);
  };

  /**
   * 🎵 音声再生処理（Web/Native対応）
   */
  const handlePlayAudio = async (item: GoogleDriveFile) => {
    try {
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("🎯 handlePlayAudio() 開始 (Google Drive)");
      console.log("📁 選択ファイル:", item.name);
      console.log("🖥️ プラットフォーム:", Platform.OS);

      setDownloadingFileId(item.id);

      let playableUri: string;

      // ---------------------------------------------------------
      // 🌐 Web環境: Blob URLを使用
      // ---------------------------------------------------------
      if (Platform.OS === 'web') {
        console.log("🌐 Web環境: Blob URL取得");
        const blobUrl = await getDownloadUrl(item.id);
        
        if (!blobUrl) {
          Alert.alert("エラー", "ファイルのダウンロードURLを取得できませんでした");
          return;
        }
        
        playableUri = blobUrl;
        console.log("✅ Blob URL取得完了:", playableUri);
      }
      // ---------------------------------------------------------
      // 📱 Native環境: オフラインファイルまたはダウンロード
      // ---------------------------------------------------------
      else {
        console.log("📱 Native環境: オフライン確認またはダウンロード");
        
        // オフラインファイルをチェック
        const localPath = await getLocalFilePath(item.id);
        
        if (localPath) {
          console.log("✅ オフラインファイルを使用:", localPath);
          playableUri = localPath;
        } else {
          console.log("⬇️ 一時ダウンロード開始（再生用）");
          const tempUri = await downloadToLocal(item.id, item.name);
          
          if (!tempUri) {
            Alert.alert("エラー", "ファイルのダウンロードに失敗しました");
            return;
          }
          
          playableUri = tempUri;
          console.log("✅ 一時ダウンロード完了:", playableUri);
        }
      }

      // ---------------------------------------------------------
      // 🎵 再生リスト作成
      // ---------------------------------------------------------
      const audioList: AudioMetadata[] = files
        .filter(isAudioFile)
        .map(fileItem => ({
          id: fileItem.id,
          name: fileItem.name,
          url: "", // 初期状態は空
          source: "googledrive" as const,
          mimeType: fileItem.mimeType,
        }));

      // 選択したファイルのインデックスを検索
      let initialIndex = audioList.findIndex(audio => audio.id === item.id);

      if (initialIndex !== -1) {
        audioList[initialIndex].url = playableUri;
      } else {
        const selectedAudioMetaData: AudioMetadata = {
          id: item.id,
          name: item.name,
          url: playableUri,
          source: "googledrive" as const,
          mimeType: item.mimeType,
        };
        audioList.unshift(selectedAudioMetaData);
        initialIndex = 0;
      }

      console.log(`🎵 ${audioList.length}個のファイルを再生リストとして渡します。インデックス: ${initialIndex}`);

      // ---------------------------------------------------------
      // ▶️ 再生実行
      // ---------------------------------------------------------
      await playAudio(audioList, initialIndex);

      console.log("✅ handlePlayAudio() 完了");

    } catch (error) {
      console.error("❌ 再生エラー", error);
      Alert.alert("再生エラー", `音声ファイルの再生に失敗しました: ${error}`);
    } finally {
      setDownloadingFileId(null);
    }
  };

  /**
   * 💾 オフライン保存用ダウンロード（Native専用）
   */
  const handleDownloadForOffline = async (item: GoogleDriveFile) => {
    if (!isNative || !accessToken) {
      Alert.alert("エラー", "ダウンロードできません");
      return;
    }

    try {
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("💾 handleDownloadForOffline() 開始");
      console.log("📁 ファイル名:", item.name);

      // Google Drive API のダウンロードURL
      const apiUrl = `https://www.googleapis.com/drive/v3/files/${item.id}?alt=media`;

      // ✅ useOfflineStorage の downloadFile を使用
      await downloadFile(
        item.id,
        item.name,
        apiUrl,
        item.mimeType,
        'googledrive', // source を指定
        (progress:any) => {
          console.log(`⏳ ダウンロード進捗: ${progress}%`);
        }
      );

    } catch (error) {
      console.error("❌ ダウンロードエラー:", error);
      Alert.alert("エラー", `ダウンロードに失敗しました: ${error}`);
    }
  };

  /**
   * 🗑️ オフラインファイル削除
   */
  const handleDeleteOfflineFile = async (item: GoogleDriveFile) => {
    try {
      const result = await deleteFile(item.id);
      if (result) {
        Alert.alert("成功", "オフラインファイルを削除しました");
      } else {
        Alert.alert("エラー", "削除に失敗しました");
      }
    } catch (error) {
      console.error("❌ 削除エラー:", error);
      Alert.alert("エラー", "削除に失敗しました");
    }
  };

  /**
   * 📁 アイテムタップ処理
   */
  const handleItemPress = (item: GoogleDriveFile) => {
    const isFolder = item.mimeType === "application/vnd.google-apps.folder";

    if (isFolder) {
      console.log("📂 フォルダなので移動します");
      setFolderHistory(prev => [...prev, currentFolderId]);
      setCurrentFolderId(item.id);
    } else if (isAudioFile(item)) {
      console.log("🎵 音声ファイルです");

      if (currentAudio?.id === item.id) {
        console.log("🔄 同じファイル - 一時停止/再開");
        if (isPlaying) {
          pauseAudio();
        } else {
          resumeAudio();
        }
      } else {
        console.log("▶️ 新しいファイル - 再生開始");
        handlePlayAudio(item);
      }
    } else {
      console.log("❌ 非対応ファイル");
      Alert.alert("非対応", "このファイル形式は再生できません");
    }
  };

  /**
   * ◀️ フォルダ戻る
   */
  const goBack = () => {
    if (folderHistory.length > 0) {
      const previousFolderId = folderHistory[folderHistory.length - 1];
      setFolderHistory(prev => prev.slice(0, -1));
      setCurrentFolderId(previousFolderId);
    }
  };

  // オフラインファイルIDのセットを作成（高速検索用）
  const offlineFileIds = new Set(offlineFiles.map(f => f.id));

  // ---------------------------------------------------------
  // 🔐 未認証画面
  // ---------------------------------------------------------
  if (!isAuthenticated) {
    return (
      <View className="flex-1 items-center justify-center bg-black">
        <Entypo name="google-drive" size={48} color="white" />
        <Text className="text-white text-xl mb-4 mt-4">
          Google Drive にサインインしてください。
        </Text>
        <Pressable onPress={signIn} className="p-3 bg-blue-600 rounded">
          <Text className="text-white text-lg">Google サインイン</Text>
        </Pressable>
      </View>
    );
  }

  // ---------------------------------------------------------
  // 📂 ファイルリスト画面
  // ---------------------------------------------------------
  return (
    <SafeAreaView className="flex-1 bg-black p-4">
      {/* ヘッダー */}
      <View className="flex-row items-center mb-4 justify-between">
        <View className="flex-row">
          <Entypo name="google-drive" size={24} color="#4285F4" />
          <Text className="text-white text-2xl ml-2">
            {loading ? "ロード中..." : "Google Drive"}
          </Text>
        </View>
        {!loading && (
          <Pressable onPress={handleFetchGoogleDriveFiles} className="ml-2 items-center">
            <AntDesign name="reload" size={16} color="white" />
          </Pressable>
        )}
      </View>
      {loading && <ActivityIndicator size="small" color="white" className="ml-2" />}

      {/* 戻るボタン */}
      {currentFolderId !== ROOT_ID && (
        <Pressable onPress={goBack} className="p-3 mb-2 bg-gray-800 rounded flex-row items-center">
          <Text className="text-white text-base">← 戻る</Text>
        </Pressable>
      )}

      {/* ファイルリスト */}
      <FlatList
        data={files}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const isCurrentlyPlaying = currentAudio?.id === item.id && isPlaying;
          const isCurrentAudio = currentAudio?.id === item.id;
          const downloadTask = downloadTasks.get(item.id);
          const isDownloading = downloadTask?.status === 'downloading';
          const isDownloaded = offlineFileIds.has(item.id);
          const downloadProgress = downloadTask?.progress || 0;

          return (
            <View className={isCurrentAudio ? "bg-gray-900 rounded-lg mb-1" : "mb-1"}>
              <DriveListItem
                driveType="GoogleDrive"
                file={item as any}
                onPressItem={handleItemPress}
                indentationLevel={0}
                isDownloaded={isDownloaded}
                isDownloading={isDownloading}
                downloadProgress={downloadProgress}
                onDownload={() => handleDownloadForOffline(item)}
                onDeleteDownload={() => handleDeleteOfflineFile(item)}
              />

              {isCurrentlyPlaying && (
                <View className="flex-row items-center ml-4 mb-2">
                  <View className="w-2 h-2 bg-green-400 rounded-full mr-2" />
                  <Text className="text-green-400 text-xs">再生中</Text>
                </View>
              )}

              {isCurrentAudio && !isPlaying && (
                <View className="flex-row items-center ml-4 mb-2">
                  <Text className="text-yellow-400 text-xs">一時停止中</Text>
                </View>
              )}

              {isDownloading && (
                <View className="flex-row items-center ml-4 mb-2">
                  <ActivityIndicator size="small" color="#3b82f6" />
                  <Text className="text-blue-400 text-xs ml-2">
                    ダウンロード中... {downloadProgress}%
                  </Text>
                </View>
              )}
            </View>
          );
        }}
        ListEmptyComponent={() => (
          <Text className="text-gray-400 text-center mt-10">
            ファイルまたはフォルダがありません
          </Text>
        )}
      />
    </SafeAreaView>
  );
}