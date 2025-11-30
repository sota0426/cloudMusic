import DriveListItem from "@/components/audio/DriveListItem";
import { AudioMetadata, usePlayer } from "@/provider/PlayerProvider";
import { GoogleDriveFile, useGoogleDrive } from "@/provider/useGoogleDrive";
import Entypo from "@expo/vector-icons/Entypo";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, Text, View } from "react-native";

const ROOT_ID="root";

// 音声ファイルの拡張子リスト
const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac'];

export default function GoogleDriveFlesScreen(){
  const {
    files,
    loading,
    isAuthenticated,
    signIn,
    fetchGoogleDriveFiles,
    getDownloadUrl
  } = useGoogleDrive();

  const {
    playAudio,
    pauseAudio,
    resumeAudio,
    stopAudio,
    currentAudio,
    isLoading:playerLoading,
    isPlaying
  } = usePlayer()

  const [currentFolderId, setCurrentFolderId] = useState(ROOT_ID);
  const [folderHistory, setFolderHistory] = useState<string[]>([]);
  const [downloadingFileId, setDownloadingFileId] =useState<string | null>(null);

  useEffect(()=>{
    if(isAuthenticated){
      fetchGoogleDriveFiles(currentFolderId);
    }
  },[isAuthenticated,currentFolderId])

  const isAudioFile = (file:GoogleDriveFile):boolean =>{
    if(file.mimeType.startsWith("audio/")){
      return true;
    }
    const lowerName = file.name.toLocaleLowerCase();
    return AUDIO_EXTENSIONS.some(ext => lowerName.endsWith(ext));
  }

  const handlePalyAudio = async (item:GoogleDriveFile) =>{
    try{
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("🎯 handlePlayAudio() 開始 (Google Drive)");
      console.log("📁 選択ファイル:", item.name);     

      setDownloadingFileId(item.id);

      const audioList:AudioMetadata[] = files
        .filter(isAudioFile)
        .map(fileItem => ({
          id:fileItem.id,
          name:fileItem.name,
          url:"",
          source:"googledrive" as const,
          mimeType: fileItem.mimeType,
        }));

      let initialIndex = audioList.findIndex(audio => audio.id === item.id);

      console.log("🔄 getDownloadUrl() 実行中...")
      const downloadUrl = await getDownloadUrl(item.id);

      if (!downloadUrl) {
        Alert.alert("エラー", "ファイルのダウンロードURLを取得できませんでした");
        return;
      }
      if (!downloadUrl.startsWith("http")) {
        Alert.alert("エラー", "無効なURLです");
        return;
      }

      if(initialIndex !== -1){
        audioList[initialIndex].url = downloadUrl;
      }else{
        const selectedAudioMetaData : AudioMetadata ={
          id: item.id,
          name: item.name,
          url: downloadUrl,
          source: "googledrive" as const,
          mimeType: item.mimeType,          
        };
        audioList.unshift(selectedAudioMetaData);
        initialIndex = 0;
      }

      console.log(`🎵 ${audioList.length}個のファイルを再生リストとして渡します。インデックス: ${initialIndex}`);

      await playAudio(audioList,initialIndex);

      console.log("✅ handlePlayAudio() 完了");      

    }catch(error){
      console.error("❌ 再生エラー" , error);
      Alert.alert("再生エラー",`音声ファイルの再生に失敗しました：${error}`);
    }finally{
      setDownloadingFileId(null);
    }
  }


  const handleItemPress = (item:GoogleDriveFile) =>{
    const isFolder = item.mimeType === "application/vnd.google-apps.folder";
  
    if(isFolder){
      console.log("📂 フォルダなので移動します")
      setFolderHistory(prev => [...prev,currentFolderId]);
      setCurrentFolderId(item.id)
    }else if(isAudioFile(item)){
      console.log("🎵 音声ファイルです")

      if(currentAudio?.id === item.id){
        console.log("🔄 同じファイル - 一時停止/再開")
        if(isPlaying){
          pauseAudio();
        }else{
          resumeAudio();
        }
      }else{
        console.log("▶️ 新しいファイル - 再生開始")
        handlePalyAudio(item)
      }
    }else{
      console.log("❌ 非対応ファイル")
      Alert.alert("非対応", "このファイル形式は再生できません");    
    }
  }

  const goBack =() =>{
    if(folderHistory.length >0 ){
      const previousFolderId = folderHistory[folderHistory.length - 1];
      setFolderHistory(prev => prev.slice(0 , -1));
      setCurrentFolderId(previousFolderId);
    }
  };


  if(!isAuthenticated){
    return(
      <View className="flex-1 items-center justify-center bg-black">
        <Entypo name="google-drive" size={48} color="white" />
        <Text className="text-white text-xl mb-4 mt-4">
          Google Drive にサインインしてください。
        </Text>
        <Pressable onPress={signIn} className="p-3 bg-blue-600 rounded">
          <Text className="text-white text-lg">Microsoft サインイン</Text>
        </Pressable>
      </View> 
    );
  }

  
  return (
    <View className="flex-1 bg-black p-4">
      {/* ヘッダー */}
      <View className="flex-row items-center mb-4">
        <Entypo name="google-drive" size={24} color="#0078d4" />
        <Text className="text-white text-2xl ml-2">
          {loading ? "ロード中..." : "Google Drive"}
        </Text>
        


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
                driveType="GoogleDrive" 
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
    </View>
  );
}