import DriveListItem from "@/components/audio/DriveListItem";
import { AudioMetadata, usePlayer } from "@/provider/PlayerProvider";
import { GoogleDriveFile, useGoogleDrive } from "@/provider/useGoogleDrive";
import { useOfflineStorage } from "@/provider/useOfflineStorage.ts";
import AntDesign from "@expo/vector-icons/AntDesign";
import Entypo from "@expo/vector-icons/Entypo";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Modal, Platform, Pressable, Text, View } from "react-native";
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
    downloadMultipleFiles,
    deleteFile,
    getLocalFilePath,
    downloadTasks,
    getActiveDownloadCount,
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
  const [isBatchDownloading, setIsBatchDownloading] = useState(false);
  const [showBatchProgress, setShowBatchProgress] = useState(false);

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
   * 📦 フォルダ内の全音楽ファイルを一括ダウンロード
   */
  const handleBatchDownloadFolder = async () => {
    if (!isNative || !accessToken) {
      Alert.alert("非対応", "ダウンロードはモバイルアプリでのみ利用可能です");
      return;
    }

    // 現在のフォルダ内の音楽ファイルのみを取得
    const audioFiles = files.filter(file => isAudioFile(file));

    if (audioFiles.length === 0) {
      Alert.alert("対象なし", "このフォルダには音楽ファイルがありません");
      return;
    }

    // 既にダウンロード済みのファイルを確認
    const offlineFileIds = new Set(offlineFiles.map(f => f.id));
    const filesToDownload = audioFiles.filter(file => !offlineFileIds.has(file.id));

    if (filesToDownload.length === 0) {
      Alert.alert("完了", "このフォルダの全ての音楽ファイルは既にダウンロード済みです");
      return;
    }

    Alert.alert(
      "一括ダウンロード",
      `${filesToDownload.length}個の音楽ファイルをダウンロードしますか?\n\n` +
      `(既にダウンロード済み: ${audioFiles.length - filesToDownload.length}個)`,
      [
        { text: "キャンセル", style: "cancel" },
        {
          text: "ダウンロード",
          onPress: async () => {
            setIsBatchDownloading(true);
            setShowBatchProgress(true);

            try {
              // ダウンロードアイテムを作成
              const downloadItems = filesToDownload.map((file) => ({
                fileId: file.id,
                fileName: file.name,
                downloadUrl: `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`,
                mimeType: file.mimeType,
                source: 'googledrive' as const,
              }));

              // 一括ダウンロード実行（最大3つ同時）
              const result = await downloadMultipleFiles(downloadItems, 3);

              Alert.alert(
                "完了",
                `ダウンロードが完了しました\n\n` +
                `成功: ${result.succeeded}個\n` +
                `失敗: ${result.failed}個\n` +
                `合計: ${result.total}個`
              );

            } catch (error) {
              console.error("一括ダウンロードエラー:", error);
              Alert.alert("エラー", "一括ダウンロードに失敗しました");
            } finally {
              setIsBatchDownloading(false);
              // モーダルは少し遅れて閉じる
              setTimeout(() => setShowBatchProgress(false), 2000);
            }
          }
        }
      ]
    );
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
        <View className="flex-row items-center">
          <Entypo name="google-drive" size={24} color="#4285F4" />
          <Text className="text-white text-2xl ml-2">
            {loading ? "ロード中..." : "Google Drive"}
          </Text>
          {/* アクティブなダウンロード数を表示 */}
          {getActiveDownloadCount() > 0 && (
            <View className="ml-2 bg-blue-600 px-2 py-1 rounded-full">
              <Text className="text-white text-xs font-semibold">
                DL中: {getActiveDownloadCount()}
              </Text>
            </View>
          )}
        </View>
        <View className="flex-row items-center">
          {/* 一括ダウンロードボタン */}
          {!loading && currentFolderId !== ROOT_ID && isNative && (
            <Pressable 
              onPress={handleBatchDownloadFolder}
              className="mr-2 bg-blue-600 px-3 py-2 rounded-lg flex-row items-center"
              disabled={isBatchDownloading}
            >
              <MaterialIcons name="cloud-download" size={16} color="white" />
              <Text className="text-white text-xs ml-1 font-semibold">一括DL</Text>
            </Pressable>
          )}
          {!loading && (
            <Pressable onPress={handleFetchGoogleDriveFiles} className="ml-2 items-center">
              <AntDesign name="reload" size={16} color="white" />
            </Pressable>
          )}
          {loading && <ActivityIndicator size="small" color="white" className="ml-2" />}
        </View>
      </View>

      {/* 一括ダウンロード進行状況モーダル */}
      <Modal
        transparent
        visible={showBatchProgress}
        animationType="fade"
      >
        <View className="flex-1 justify-center items-center bg-black/80">
          <View className="bg-gray-800 p-6 rounded-lg w-4/5 max-w-md">
            <Text className="text-white text-lg font-semibold mb-4 text-center">
              一括ダウンロード中
            </Text>
            
            {/* ダウンロードタスク一覧 */}
            <View className="max-h-80">
              {Array.from(downloadTasks.values()).map((task) => (
                <View key={task.fileId} className="mb-3 p-3 bg-gray-900 rounded">
                  <Text className="text-white text-sm mb-1" numberOfLines={1}>
                    {task.fileName}
                  </Text>
                  
                  <View className="flex-row items-center">
                    {task.status === 'pending' && (
                      <>
                        <View className="w-2 h-2 bg-gray-400 rounded-full mr-2" />
                        <Text className="text-gray-400 text-xs">待機中...</Text>
                      </>
                    )}
                    {task.status === 'downloading' && (
                      <>
                        <ActivityIndicator size="small" color="#3b82f6" />
                        <View className="flex-1 mx-2">
                          <View className="h-2 bg-gray-700 rounded-full overflow-hidden">
                            <View 
                              className="h-full bg-blue-500 rounded-full"
                              style={{ width: `${task.progress}%` }}
                            />
                          </View>
                        </View>
                        <Text className="text-blue-400 text-xs">{task.progress}%</Text>
                      </>
                    )}
                    {task.status === 'completed' && (
                      <>
                        <AntDesign name="check-circle" size={16} color="#10b981" />
                        <Text className="text-green-400 text-xs ml-2">完了</Text>
                      </>
                    )}
                    {task.status === 'failed' && (
                      <>
                        <AntDesign name="close-circle" size={16} color="#ef4444" />
                        <Text className="text-red-400 text-xs ml-2">失敗</Text>
                      </>
                    )}
                  </View>
                </View>
              ))}
            </View>

            {!isBatchDownloading && (
              <Pressable
                onPress={() => setShowBatchProgress(false)}
                className="mt-4 bg-blue-600 p-3 rounded-lg"
              >
                <Text className="text-white text-center font-semibold">閉じる</Text>
              </Pressable>
            )}
          </View>
        </View>
      </Modal>

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