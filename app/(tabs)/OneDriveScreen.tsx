// OneDriveFilesScreen.tsx

import DriveListItem from "@/components/audio/DriveListItem";
import { usePlayer } from "@/provider/PlayerProvider";
import { OneDriveFile, useOneDrive } from "@/provider/useOneDrive";
import AntDesign from '@expo/vector-icons/AntDesign';
import Entypo from "@expo/vector-icons/Entypo";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, Text, View } from "react-native";
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
  
  const [currentFolderId, setCurrentFolderId] = useState(ROOT_ID);
  const [folderHistory, setFolderHistory] = useState<string[]>([]); 
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      fetchOneDriveFiles(currentFolderId);
    }
  }, [isAuthenticated, currentFolderId]);

  // 音声ファイルかどうかを判定
  const isAudioFile = (fileName: string): boolean => {
    const lowerName = fileName.toLowerCase();
    return AUDIO_EXTENSIONS.some(ext => lowerName.endsWith(ext));
  };

  const handleFetchOneDriveFiles = ()=>(
    fetchOneDriveFiles()
  )

  const PlayScreen =(currentAudio:any)=>{
    if(!currentAudio) return;
    return(
        <View className="bg-gray-900 p-4 mb-3 rounded-lg">
          <Text className="text-white text-sm mb-">再生中</Text>
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
    )
  }

  
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
          id: item.id,
          name: item.name,
          url: "",
          source: "onedrive" as const,
          mimeType: item.file?.mimeType,
        })
      )

      // 2.選択されたアイテムのメタデータを確定
      const selectedAudioMetaData ={
        id:item.id,
        name:item.name,
        url:downloadUrl,
        source: "onedrive" as const,
        mimeType: item.file?.mimeType,
      }

      // 3.audioList内で選択されたアイテムのインデックスを見つける
      let initialIndex = audioList.findIndex(audio => audio.id === item.id)

      // 4. audioList 内の対応するアイテムのURLで更新する
      if(initialIndex !== -1){
        audioList[initialIndex].url = downloadUrl;
      }else{
        audioList.unshift(selectedAudioMetaData);
        initialIndex = 0;
      }

      console.log(`🎵 ${audioList.length}個のファイルを再生リストとして渡します。インデックス: ${initialIndex}`);

      await playAudio(audioList , initialIndex);


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
      <View className="flex-row  items-center mb-4 justify-between">
        <View className="flex-row ">
        <Entypo name="cloud" size={24} color="#0078d4" />
        <Text className="text-white text-2xl ml-2">
          {loading ? "ロード中..." : "OneDrive"}
        </Text>
        </View>
        {!loading &&
         <Pressable onPress={handleFetchOneDriveFiles} className="ml-2 items-center">
          <AntDesign name="reload" size={16} color="white" />        
        </Pressable>
        }          
        {loading && <ActivityIndicator size="small" color="white" className="ml-2" />}
      </View>
      
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
          const isDownloading = downloadingFileId === item.id;
          
          return (
            <View className={isCurrentAudio ? "bg-gray-900 rounded-lg mb-1" : "mb-1"}>
              <DriveListItem
                driveType="OneDrive" 
                file={item as any}
                onPressItem={handleItemPress}
                indentationLevel={0}
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
                  <Text className="text-blue-400 text-xs ml-2">ダウンロード中...</Text>
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