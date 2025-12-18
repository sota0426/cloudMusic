// OneDriveFilesScreen.tsx

import DriveListItem from "@/components/audio/DriveListItem";
import { usePlayer } from "@/provider/PlayerProvider";
import { useOfflineStorage } from "@/provider/useOfflineStorage.ts";
import { OneDriveFile, useOneDrive } from "@/provider/useOneDrive";
import AntDesign from '@expo/vector-icons/AntDesign';
import Entypo from "@expo/vector-icons/Entypo";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const ROOT_ID = "root";

// 音声ファイルの拡張子リスト
const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac'];

export default function OneDriveFilesScreen() {
  const { 
    files, 
    loading, 
    isAuthenticated, 
    signIn, 
    fetchOneDriveFiles,
    getDownloadUrl
  } = useOneDrive();

  const { 
    playAudio, 
    pauseAudio, 
    resumeAudio, 
    stopAudio,
    currentAudio, 
    isPlaying,
    isLoading: playerLoading
  } = usePlayer();

  const {
    isNative,
    downloadFile,
    downloadMultipleFiles,
    deleteFile,
    isFileDownloaded,
    downloadTasks,
    getActiveDownloadCount,
  } = useOfflineStorage();
  
  const [currentFolderId, setCurrentFolderId] = useState(ROOT_ID);
  const [folderHistory, setFolderHistory] = useState<string[]>([]); 
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<{ [key: string]: number }>({});
  const [downloadedFiles, setDownloadedFiles] = useState<{ [key: string]: boolean }>({});
  const [isBatchDownloading, setIsBatchDownloading] = useState(false);
  const [showBatchProgress, setShowBatchProgress] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      fetchOneDriveFiles(currentFolderId);
    }
  }, [isAuthenticated, currentFolderId]);

  // ダウンロード状態をチェック
  useEffect(() => {
    const checkDownloadedFiles = async () => {
      const downloadStatus: { [key: string]: boolean } = {};
      for (const file of files) {
        if (isAudioFile(file.name)) {
          const isDownloaded = await isFileDownloaded(file.id);
          downloadStatus[file.id] = isDownloaded;
        }
      }
      setDownloadedFiles(downloadStatus);
    };

    if (isNative && files.length > 0) {
      checkDownloadedFiles();
    }
  }, [files, isNative]);

  // 音声ファイルかどうかを判定
  const isAudioFile = (fileName: string): boolean => {
    const lowerName = fileName.toLowerCase();
    return AUDIO_EXTENSIONS.some(ext => lowerName.endsWith(ext));
  };

  const handleFetchOneDriveFiles = () => (
    fetchOneDriveFiles()
  );

  const PlayScreen = (currentAudio: any) => {
    if (!currentAudio) return;
    return (
      <View className="bg-gray-900 p-4 mb-3 rounded-lg">
        <Text className="text-white text-sm mb-1">再生中</Text>
        <Text className="text-white text-base font-semibold mb-3" numberOfLines={1}>
          {currentAudio.name}
        </Text>
        <View className="flex-row space-x-2">
          <Pressable 
            onPress={() => isPlaying ? pauseAudio() : resumeAudio()}
            className="bg-blue-600 p-3 rounded flex-1 mr-2"
            disabled={playerLoading}
          >
            <Text className="text-white text-center font-semibold">
              {playerLoading ? "読込中..." : isPlaying ? "⏸ 一時停止" : "▶ 再生"}
            </Text>
          </Pressable>
          <Pressable 
            onPress={stopAudio}
            className="bg-red-600 p-3 rounded flex-1"
          >
            <Text className="text-white text-center font-semibold">■ 停止</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  // ファイルをダウンロード
  const handleDownload = async (item: OneDriveFile) => {
    if (!isNative) {
      Alert.alert("非対応", "ダウンロードはモバイルアプリでのみ利用可能です");
      return;
    }

    try {
      setDownloadingFileId(item.id);
      setDownloadProgress(prev => ({ ...prev, [item.id]: 0 }));

      // ダウンロードURLを取得
      const downloadUrl = await getDownloadUrl(item.id);
      
      if (!downloadUrl) {
        Alert.alert("エラー", "ダウンロードURLを取得できませんでした");
        return;
      }

      // ダウンロードを実行
      await downloadFile(
        item.id,
        item.name,
        downloadUrl,
        item.file?.mimeType,
        'onedrive',
        (progress) => {
          setDownloadProgress(prev => ({ ...prev, [item.id]: progress }));
        }
      );

      // ダウンロード状態を更新
      setDownloadedFiles(prev => ({ ...prev, [item.id]: true }));

    } catch (error) {
      console.error("❌ ダウンロードエラー:", error);
      Alert.alert("エラー", "ダウンロードに失敗しました");
    } finally {
      setDownloadingFileId(null);
      setDownloadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[item.id];
        return newProgress;
      });
    }
  };

  // ダウンロードしたファイルを削除
  const handleDeleteDownload = async (item: OneDriveFile) => {
    try {
      await deleteFile(item.id);
      setDownloadedFiles(prev => ({ ...prev, [item.id]: false }));
      
      // 再生中のファイルを削除した場合は停止
      if (currentAudio?.id === item.id) {
        stopAudio();
      }
    } catch (error) {
      Alert.alert("エラー", "削除に失敗しました");
    }
  };

  // フォルダ内の全音楽ファイルを一括ダウンロード
  const handleBatchDownloadFolder = async () => {
    if (!isNative) {
      Alert.alert("非対応", "ダウンロードはモバイルアプリでのみ利用可能です");
      return;
    }

    // 現在のフォルダ内の音楽ファイルのみを取得
    const audioFiles = files.filter(file => !file.folder && isAudioFile(file.name));

    if (audioFiles.length === 0) {
      Alert.alert("対象なし", "このフォルダには音楽ファイルがありません");
      return;
    }

    // 既にダウンロード済みのファイルを確認
    const downloadedIds = new Set(
      Object.entries(downloadedFiles)
        .filter(([_, isDownloaded]) => isDownloaded)
        .map(([id]) => id)
    );

    const filesToDownload = audioFiles.filter(file => !downloadedIds.has(file.id));

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
              // ダウンロードURLを取得してダウンロード実行
              const downloadItems = await Promise.all(
                filesToDownload.map(async (file) => {
                  try {
                    const url = await getDownloadUrl(file.id);
                    if (!url) return null;
                    return {
                      fileId: file.id,
                      fileName: file.name,
                      downloadUrl: url,
                      mimeType: file.file?.mimeType,
                      source: 'onedrive' as const,
                    };
                  } catch (error) {
                    console.error(`URL取得失敗: ${file.name}`, error);
                    return null;
                  }
                })
              );

              const validItems = downloadItems.filter(item => item !== null);

              if (validItems.length === 0) {
                Alert.alert("エラー", "ダウンロードURLの取得に失敗しました");
                return;
              }

              // 一括ダウンロード実行（最大3つ同時）
              const result = await downloadMultipleFiles(validItems, 3);

              // ダウンロード状態を更新
              const newDownloadedFiles = { ...downloadedFiles };
              validItems.forEach(item => {
                newDownloadedFiles[item.fileId] = true;
              });
              setDownloadedFiles(newDownloadedFiles);

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

  // 音声ファイルの再生処理
  const handlePlayAudio = async (item: OneDriveFile) => {
    try {
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("🎯 handlePlayAudio() 開始");
      console.log("📁 選択ファイル:", item.name);
      console.log("🆔 ファイルID:", item.id);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      
      setDownloadingFileId(item.id);
      
      // ダウンロード可能なURLを取得
      console.log("🔄 getDownloadUrl() 実行中...");
      const downloadUrl = await getDownloadUrl(item.id);
      
      console.log("📥 取得したダウンロードURL:");
      console.log(downloadUrl);
      
      if (!downloadUrl) {
        console.error("❌ ダウンロードURLがnull");
        Alert.alert("エラー", "ファイルのダウンロードURLを取得できませんでした");
        return;
      }

      // URLの妥当性チェック
      if (!downloadUrl.startsWith("http")) {
        console.error("❌ 不正なURL形式:", downloadUrl);
        Alert.alert("エラー", "無効なURLです");
        return;
      }

      // 1.現在表示されているファイルリストから音楽ファイルのみ抽出
      const audioList = files
        .filter(fileItem => isAudioFile(fileItem.name))
        .map(fileItem => ({
          id: fileItem.id,
          name: fileItem.name,
          url: "",
          source: "onedrive" as const,
          mimeType: fileItem.file?.mimeType,
        }));

      // 2.選択されたアイテムのメタデータを確定
      const selectedAudioMetaData = {
        id: item.id,
        name: item.name,
        url: downloadUrl,
        source: "onedrive" as const,
        mimeType: item.file?.mimeType,
      };

      // 3.audioList内で選択されたアイテムのインデックスを見つける
      let initialIndex = audioList.findIndex(audio => audio.id === item.id);

      // 4. audioList 内の対応するアイテムのURLで更新する
      if (initialIndex !== -1) {
        audioList[initialIndex].url = downloadUrl;
      } else {
        audioList.unshift(selectedAudioMetaData);
        initialIndex = 0;
      }

      console.log(`🎵 ${audioList.length}個のファイルを再生リストとして渡します。インデックス: ${initialIndex}`);

      await playAudio(audioList, initialIndex);

      console.log("✅ handlePlayAudio() 完了");
      
    } catch (error) {
      console.error("❌ 再生エラー:", error);
      console.error("❌ エラーの型:", typeof error);
      console.error("❌ エラー内容:", JSON.stringify(error, null, 2));
      Alert.alert("再生エラー", `音声ファイルの再生に失敗しました: ${error}`);
    } finally {
      setDownloadingFileId(null);
    }
  };

  // アイテムタップのハンドラ
  const handleItemPress = (item: OneDriveFile) => {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("👆 handleItemPress() 呼び出された!");
    console.log("📁 アイテム名:", item.name);
    console.log("🆔 アイテムID:", item.id);
    console.log("📂 フォルダ?:", !!item.folder);
    console.log("🎵 オーディオ?:", isAudioFile(item.name));
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    const isFolder = !!item.folder;

    if (isFolder) {
      console.log("📂 フォルダなので移動します");
      setFolderHistory(prev => [...prev, currentFolderId]);
      setCurrentFolderId(item.id);
    } else if (isAudioFile(item.name)) {
      console.log("🎵 音声ファイルです");
      // 既に再生中のファイルをタップした場合は一時停止/再開
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

  // 戻るボタンのハンドラ
  const goBack = () => {
    if (folderHistory.length > 0) {
      const previousFolderId = folderHistory[folderHistory.length - 1];
      setFolderHistory(prev => prev.slice(0, -1)); 
      setCurrentFolderId(previousFolderId);
    }
  };

  // サインイン画面
  if (!isAuthenticated) {
    return (
      <View className="flex-1 justify-center items-center bg-black">
        <Entypo name="cloud" size={48} color="white" />
        <Text className="text-white text-xl mb-4 mt-4">
          OneDrive にサインインしてください
        </Text>
        <Pressable onPress={signIn} className="p-3 bg-blue-600 rounded">
          <Text className="text-white text-lg">Microsoft サインイン</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black p-4">
      {/* ヘッダー */}
      <View className="flex-row items-center mb-4 justify-between">
        <View className="flex-row items-center">
          <Entypo name="cloud" size={24} color="#0078d4" />
          <Text className="text-white text-2xl ml-2">
            {loading ? "ロード中..." : "OneDrive"}
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
            <Pressable onPress={handleFetchOneDriveFiles} className="ml-2 items-center">
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
          const task = downloadTasks.get(item.id);
          const isDownloading = task?.status === 'downloading' || task?.status === 'pending';
          const progress = task?.progress || 0;
          const isDownloaded = downloadedFiles[item.id] || false;
          
          return (
            <View className={isCurrentAudio ? "bg-gray-900 rounded-lg mb-1" : "mb-1"}>
              <DriveListItem
                driveType="OneDrive" 
                file={item as any}
                onPressItem={handleItemPress}
                indentationLevel={0}
                isDownloaded={isDownloaded}
                isDownloading={isDownloading}
                downloadProgress={progress}
                onDownload={() => handleDownload(item)}
                onDeleteDownload={() => handleDeleteDownload(item)}
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