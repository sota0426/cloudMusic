// GoogleDriveFilesScreen.tsx (以前のコードへの組み込み例)

import DriveListItem from "@/components/audio/DriveListItem";
import { GoogleDriveFile, useGoogleDrive } from "@/provider/useGoogleDrive";
import { useEffect, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";

const ROOT_ID = "root";

export default function GoogleDriveFilesScreen(){
  const { 
    files, 
    loading, 
    isAuthenticated, 
    signIn, 
    fetchGoogleDriveFiles 
  } = useGoogleDrive();
  
  // 現在のフォルダIDを管理するステート
  const [currentFolderId, setCurrentFolderId] = useState(ROOT_ID);
  
  // フォルダの履歴を管理し、[...prev, current] の形式で格納
  const [folderHistory, setFolderHistory] = useState<string[]>([]); 

  // 認証状態と currentFolderId が変わるたびにファイルを取得
  useEffect(() => {
    if (isAuthenticated) {
      fetchGoogleDriveFiles(currentFolderId);
    }
  }, [isAuthenticated, currentFolderId]);
  
  // 認証されていない場合はサインインボタンを表示
  if (!isAuthenticated) {
    return (
      <View className="flex-1 justify-center items-center bg-black">
        <Text className="text-white text-xl mb-4">Google Drive にサインインしてください</Text>
        <Pressable onPress={signIn} className="p-3 bg-blue-600 rounded">
          <Text className="text-white text-lg">Google サインイン</Text>
        </Pressable>
      </View>
    );
  }

  // アイテムがタップされたときのハンドラ
  const handleItemPress = (item: GoogleDriveFile) => {
    const isFolder = item.mimeType === "application/vnd.google-apps.folder";

    if (isFolder) {
      // フォルダの場合、履歴に追加し、現在のフォルダIDを更新
      setFolderHistory(prev => [...prev, currentFolderId]);
      setCurrentFolderId(item.id);
    } else {
      // 音楽ファイルの場合、再生処理 (player画面への遷移など)
      // ここで expo-router の Link または push を使用して遷移
      console.log(`再生リクエスト: ${item.name}`);
    }
  };
  
  // 戻るボタンのハンドラ
  const goBack = () => {
      if (folderHistory.length > 0) {
          // 履歴の最後の要素（一つ前のフォルダID）を取得
          const previousFolderId = folderHistory[folderHistory.length - 1];
          // 履歴から最後の要素を削除
          setFolderHistory(prev => prev.slice(0, -1)); 
          // フォルダIDを戻す
          setCurrentFolderId(previousFolderId);
      }
  };

  return(
    <View className="flex-1 bg-black p-4">
      <Text className="text-white text-2xl mb-4">
        {loading ? "ロード中..." : "Google Drive Files"}
      </Text>
      
      {/* 戻るボタンの表示 */}
      {currentFolderId !== ROOT_ID && (
          <Pressable onPress={goBack} className="p-2 mb-2 bg-gray-800 rounded flex-row items-center">
              <Text className="text-white ml-2">← 戻る</Text>
          </Pressable>
      )}
      
      <FlatList 
        data={files}
        keyExtractor={(item) => item.id}
        renderItem={({ item })=> (
          <DriveListItem
            driveType="GoogleDrive" 
            file={item} 
            onPressItem={handleItemPress}
          />
        )}
        ListEmptyComponent={() => (
            <Text className="text-gray-400 text-center mt-10">ファイルまたはフォルダがありません</Text>
        )}
      />
    </View>
  )
}