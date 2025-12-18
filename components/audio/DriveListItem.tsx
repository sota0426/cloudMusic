// DriveListItem.tsx

import { GoogleDriveFile } from "@/provider/useGoogleDrive";
import { OneDriveFile } from "@/provider/useOneDrive";
import AntDesign from "@expo/vector-icons/AntDesign";
import Entypo from "@expo/vector-icons/Entypo";
import { ActivityIndicator, Platform, Pressable, Text, View } from "react-native";

const isNative = Platform.OS !== "web";

// 💡 ファイルの型を汎用化: GoogleDriveFile または OneDriveFile を受け入れられるように
export type GenericDriveFile = GoogleDriveFile & Partial<OneDriveFile>; 

interface DriveListItemProps {
  driveType: "GoogleDrive" | "OneDrive"; // 💡 追加されたドライブタイプ
  file: GenericDriveFile;
  onPressItem: (item: GenericDriveFile) => void; // 💡 onPressItemの型も汎用ファイル型に変更
  indentationLevel: number;
  // ダウンロード関連の追加プロパティ
  isDownloaded?: boolean;
  isDownloading?: boolean;
  downloadProgress?: number;
  onDownload?: () => void;
  onDeleteDownload?: () => void;
}

export default function DriveListItem({
  driveType,
  file,
  onPressItem,
  isDownloaded = false,
  isDownloading = false,
  downloadProgress = 0,
  onDownload,
  onDeleteDownload,
}: DriveListItemProps) {

  const { name, mimeType, file: oneDriveFile, folder: oneDriveFolder } = file;

  // 💡 ドライブタイプに基づいてフォルダ判定ロジックを適用
  let isFolder = false;
  
  if (driveType === "GoogleDrive") {
    isFolder = mimeType === "application/vnd.google-apps.folder";
  } else { // "OneDrive"
    isFolder = !!oneDriveFolder;
  }
  
  const isAudio = mimeType?.startsWith('audio/') || oneDriveFile?.mimeType?.startsWith('audio/');

  // 音楽ファイルまたはフォルダでない場合は何も表示しない
  if (!isFolder && !isAudio) {
    return null; 
  }

  // ダウンロードボタンのハンドラ
  const handleDownloadPress = (e: any) => {
    e.stopPropagation(); // アイテムのクリックイベントを防ぐ
    if (isDownloaded && onDeleteDownload) {
      onDeleteDownload();
    } else if (!isDownloading && onDownload) {
      onDownload();
    }
  };

  return (
    <View 
      className={`
        flex flex-row gap-4 items-center p-3 border-b border-gray-700 w-full cursor-pointer transition duration-150
        hover:bg-gray-700/50
        ${isFolder ? 'cursor-pointer' : 'cursor-pointer'}
      `}
    >
      <Pressable
        className="flex flex-row gap-4 items-center flex-1 p-0 bg-transparent border-none text-left"
        style={{ paddingLeft: 0, paddingRight: 0 }}
        onPress={() => onPressItem(file)} 
      >
        {isFolder ? (
          <Text className="text-2xl">📁</Text>
        ) : isAudio ? (
          <Text className="text-2xl">🎵</Text>
        ) : (
          <Text className="text-2xl">📄</Text>
        )}

        <View className="flex-1">
          <Text className="text-white font-medium text-sm">
            {name}
          </Text>
          <View className="flex flex-row items-center gap-1 mt-0.5">

            {driveType === "GoogleDrive" ? (
              <Entypo name="google-drive" size={12} color="blue" /> 
            ) : (
              <Entypo name="cloud" size={12} color="blue" /> 
            )}

            <Text className="text-gray-400 text-xs">
              {driveType === "GoogleDrive" ? "Google Drive" : "OneDrive"}
            </Text>

            {isDownloaded && (
              <>
                <AntDesign name="check-circle" size={10} color="green" />
                <Text className="text-green-500 text-xs">オフライン</Text>
              </>
            )}

          </View>
        </View>
      </Pressable>

      {/* ダウンロードボタン（音楽ファイルのみ、ネイティブのみ） */}
      {!isFolder && isAudio && isNative && (
        <View className="flex flex-row items-center gap-2">
          {isDownloading ? (
            <View className="flex flex-row items-center gap-1 px-2">
              <ActivityIndicator size="small" color="#3b82f6" />
              <Text className="text-blue-400 text-xs">{downloadProgress}%</Text>
            </View>
          ) : isDownloaded ? (
            <Pressable 
              onPress={handleDownloadPress} 
              hitSlop={8}
              className="p-1"
            >
              <AntDesign name="check-circle" size={20} color="#10b981" />
            </Pressable>
          ) : (
            <Pressable 
              onPress={handleDownloadPress} 
              hitSlop={8}
              className="p-1"
            >
              <Entypo name="download" size={20} color="#9ca3af" />
            </Pressable>
          )}     
        </View>
      )}
    </View>
  );
}