// DriveListItem.tsx

import { GoogleDriveFile } from "@/provider/useGoogleDrive";
import { OneDriveFile } from "@/provider/useOneDrive";
import AntDesign from "@expo/vector-icons/AntDesign";
import Entypo from "@expo/vector-icons/Entypo";
import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, Pressable, Text, View } from "react-native";
// レガシーAPIを使用（ネイティブのみ）
// @ts-ignore
import * as FileSystem from 'expo-file-system/legacy';

// ドキュメントディレクトリのパスを取得
// @ts-ignore
const DOCUMENT_DIR: string = FileSystem?.documentDirectory || '';

const isNative = Platform.OS !== "web"

// 💡 ファイルの型を汎用化: GoogleDriveFile または OneDriveFile を受け入れられるように
export type GenericDriveFile = GoogleDriveFile & Partial<OneDriveFile>; 

interface DriveListItemProps{
 driveType: "GoogleDrive" | "OneDrive"; // 💡 追加されたドライブタイプ
 file: GenericDriveFile,
 onPressItem:(item: GenericDriveFile)=>void; // 💡 onPressItemの型も汎用ファイル型に変更
 indentationLevel:number;
}

export default function DriveListItem({
 driveType,
 file,
 onPressItem,
 indentationLevel = 0,
}: DriveListItemProps){

 const { name, mimeType, file: oneDriveFile, folder: oneDriveFolder, id } = file;
 const [isDownloaded, setIsDownloaded] = useState(false);
 const [isDownloading, setIsDownloading] = useState(false);
 const [downloadProgress, setDownloadProgress] = useState(0);

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


 // ダウンロードファイルのパスを取得
 const getLocalFilePath = () => {
  if (!id) return null;
  const sanitizedName = name.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${DOCUMENT_DIR}music/${id}_${sanitizedName}`;
 };



 // ダウンロード状態を確認
 useEffect(() => {
  const checkDownloadStatus = async () => {
   const localPath = getLocalFilePath();
   if (!localPath) return;
   
   try {
    // const fileInfo = await FileSystem.getInfoAsync(localPath);
    // setIsDownloaded(fileInfo.exists);
   } catch (error) {
    console.error('Error checking download status:', error);
   }
  };
  
  if (isAudio && !isFolder) {
   checkDownloadStatus();
  }
 }, [id, name]);

//  // ファイルをダウンロード
//  const handleDownload = async () => {
//   const localPath = getLocalFilePath();
//   if (!localPath || !file.webContentLink) return;

//   try {
//     console.log("Downloeding now")
//   setIsDownloading(true);
//    setDownloadProgress(0);

//    // ディレクトリを作成
//    const directory = `${DOCUMENT_DIR}music/`;
//    const dirInfo = await FileSystem.getInfoAsync(directory);
//    if (!dirInfo.exists) {
//     console.log("Downloeding now")

//     await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
//    }

//    // ダウンロード
//    const downloadResumable = FileSystem.createDownloadResumable(
//     file.webContentLink,
//     localPath,
//     {},
//     (downloadProgress) => {
//      const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
//      setDownloadProgress(Math.round(progress * 100));
//     }
//    );

//    const result = await downloadResumable.downloadAsync();
   
//    if (result) {
//     setIsDownloaded(true);
//     console.log('Download completed:', result.uri);
//    }
//   } catch (error) {
//    console.error('Download error:', error);
//    alert('ダウンロードに失敗しました');
//   } finally {
//    setIsDownloading(false);
//    setDownloadProgress(0);
//   }
//  };

//  // ダウンロードしたファイルを削除
//  const handleDeleteDownload = async () => {
//   const localPath = getLocalFilePath();
//   if (!localPath) return;

//   try {
//    await FileSystem.deleteAsync(localPath);
//    setIsDownloaded(false);
//    console.log('Download deleted:', localPath);
//   } catch (error) {
//    console.error('Delete error:', error);
//    alert('削除に失敗しました');
//   }
//  };

 return(
  <View 
   className={`
    flex flex-row gap-4 items-center p-3 border-b border-gray-700 w-full cursor-pointer transition duration-150
    hover:bg-gray-700/50
    ${isFolder ? 'cursor-pointer' : 'cursor-pointer'}
   `}
  >
   <button
    className="flex flex-row gap-4 items-center w-full p-0 bg-transparent border-none text-left"
    style={{ paddingLeft: 0, paddingRight: 0 }}
    onClick={() => onPressItem(file)} 
   >
    {isFolder ? (
      <Text className="text-2xl">📁</Text>
    ): isAudio ? (
      <Text className="text-2xl">🎵</Text>
    ):(
      <Text className="text-2xl">📄</Text>
    )}

    <View className="flex-1">
     <Text className="text-white font-medium text-sm">
      {name}
     </Text>
     <View className="flex flex-row items-center gap-1 mt-0.5">

      {driveType === "GoogleDrive" ? (
        <Entypo name="google-drive" size={12} color="blue"/> 
      ) : (
        <Entypo name="cloud" size={12} color="blue"/> 
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


    {!isFolder && isAudio && isNative && (
     <View className="flex flex-row items-center gap-2">

      {isDownloading ? (
       <View className="flex flex-row items-center gap-1 px-2">
        <ActivityIndicator size="small" color="blue" />
        <Text className="text-blue-500 text-xs">{downloadProgress}%</Text>
       </View>
      ) : isDownloaded ? (
       <Pressable onPress={handleDeleteDownload} hitSlop={8}>
        <AntDesign name="check-circle" size={20} color="green" />
       </Pressable>
      ) : (
       <Pressable onPress={handleDownload} hitSlop={8}>
        <Entypo name="download" size={20} color="gray" />
       </Pressable>
      )}     
      </View>
    )}
   </button>
  </View>
 );
}