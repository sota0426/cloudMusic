// OneDriveFilesScreen.tsx

import DriveListItem from "@/components/audio/DriveListItem"; // 既存のコンポーネントを流用
import { OneDriveFile, useOneDrive } from "@/provider/useOneDrive"; // 💡 useOneDriveをインポート
import Entypo from "@expo/vector-icons/Entypo";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";

// OneDriveのルートアイテムIDは通常 "root" を使用
const ROOT_ID = "root";

export default function OneDriveFilesScreen(){
  const { 
    files, 
    loading, 
    isAuthenticated, 
    signIn, 
    signOut, // ログアウト機能の確認のため追加
    fetchOneDriveFiles 
  } = useOneDrive();
  
  // 現在のフォルダIDを管理するステート
  const [currentFolderId, setCurrentFolderId] = useState(ROOT_ID);
  
  // フォルダの履歴を管理し、[...prev, current] の形式で格納
  const [folderHistory, setFolderHistory] = useState<string[]>([]); 

  // 認証状態と currentFolderId が変わるたびにファイルを取得
  useEffect(() => {
    if (isAuthenticated) {
      // 💡 OneDriveのファイル取得関数を呼び出す
      fetchOneDriveFiles(currentFolderId);
    }
  }, [isAuthenticated, currentFolderId]);
  
  // 認証されていない場合はサインインボタンを表示
  if (!isAuthenticated) {
    return (
      <View className="flex-1 justify-center items-center bg-black">
        <Text className="text-white text-xl mb-4">
            <Entypo name="cloud" size={24} color="white" /> OneDrive にサインインしてください
        </Text>
        <Pressable onPress={signIn} className="p-3 bg-blue-600 rounded">
          <Text className="text-white text-lg">Microsoft サインイン</Text>
        </Pressable>
      </View>
    );
  }

  // アイテムがタップされたときのハンドラ
  const handleItemPress = (item: OneDriveFile) => {
    // 💡 OneDriveのデータ構造に基づくフォルダ判定
    const isFolder = !!item.folder; 

    if (isFolder) {
      // フォルダの場合、履歴に追加し、現在のフォルダIDを更新
      setFolderHistory(prev => [...prev, currentFolderId]);
      setCurrentFolderId(item.id);
    } else {
      // 音楽ファイルの場合、再生処理
      console.log(`再生リクエスト: ${item.name}`);
      // ここで expo-router の Link または push を使用して遷移
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
      <Text className="text-white text-2xl mb-4 flex-row items-center">
        <Entypo name="cloud" size={24} color="#0078d4" />
        <Text className="text-white ml-2">
          {loading ? "ロード中..." : "OneDrive Files"}
        </Text>
        {loading && <ActivityIndicator size="small" color="white" className="ml-2" />}
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
          // DriveListItemがOneDriveFileと互換性があることを前提とします
          <DriveListItem
            driveType="OneDrive" 
            file={item as any} // 型アサーション (必要に応じてDriveListItemの型を汎用化)
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