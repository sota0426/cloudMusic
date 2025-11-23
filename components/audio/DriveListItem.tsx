// DriveListItem.tsx

import { GoogleDriveFile } from "@/provider/useGoogleDrive";
import { OneDriveFile } from "@/provider/useOneDrive";
import AntDesign from "@expo/vector-icons/AntDesign";
import Entypo from "@expo/vector-icons/Entypo";
import Ionicons from "@expo/vector-icons/Ionicons"; // OneDriveアイコン用に追加
import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";

// 💡 ファイルの型を汎用化: GoogleDriveFile または OneDriveFile を受け入れられるように
export type GenericDriveFile = GoogleDriveFile & Partial<OneDriveFile>; 

interface DriveListItemProps{
 driveType: "GoogleDrive" | "OneDrive"; // 💡 追加されたドライブタイプ
 file: GenericDriveFile,
 onPressItem:(item: GenericDriveFile)=>void; // 💡 onPressItemの型も汎用ファイル型に変更
}

export default function DriveListItem({
 driveType,
 file,
 onPressItem
}: DriveListItemProps){

 const { name, mimeType, file: oneDriveFile, folder: oneDriveFolder } = file;

 // 💡 ドライブタイプに基づいてフォルダ判定ロジックを適用
 let isFolder: boolean;
 
 if (driveType === "GoogleDrive") {
  isFolder = mimeType === "application/vnd.google-apps.folder";
 } else { // "OneDrive"
  isFolder = !!oneDriveFolder;
 }
 
 // 音楽ファイル判定 (Google DriveのmimeTypeまたはOneDriveのfile.mimeType)
 const isAudio = mimeType?.startsWith('audio/') || oneDriveFile?.mimeType?.startsWith('audio/');

 // 音楽ファイルまたはフォルダでない場合は何も表示しない
 if (!isFolder && !isAudio) {
  return null; 
 }
 
 // フォルダ移動の処理は親コンポーネント（Screen）に任せるため、Linkはファイルの場合のみ有効に
 const linkHref = isFolder ? "/" : "/player";

 return(
  <Link 
   href={linkHref} 
   disabled={isFolder} // フォルダの場合はLinkによる遷移を無効化
   asChild
  >
   <Pressable
    className="flex-row gap-4 items-center p-3 border-b border-gray-700 w-full"
    // フォルダの場合は親コンポーネントのロジック (onPressItem) でフォルダ移動を処理
    onPress={() => onPressItem(file)} 
   >
    {/* 💡 ドライブアイコンの切り替え（参考として、OneDriveは青いクラウドアイコンを使用） */}
    {isFolder ? (
     <Entypo name="folder" color="white" size={30}/>
    ): (
     <Entypo name="music" color="white" size={30}/>
    )}

    <View className="flex-1">
     <Text className="text-white">
      {name}
     </Text>
     {/* 💡 ドライブタイプの表示 */}
     <View className="flex-row items-center gap-1">
      {driveType === "GoogleDrive" ? (
       <AntDesign name="google" color="#4285F4" size={12} />
      ) : (
       <Ionicons name="cloud" color="#0078D4" size={12} />
      )}
      <Text className="text-gray-400 text-xs">
       {driveType === "GoogleDrive" ? "Google Drive" : "OneDrive"}
      </Text>
     </View>
    </View>

    {/* 音楽ファイルの場合にのみ再生アイコンを表示 */}
    {!isFolder && isAudio &&      
     <AntDesign name="play-circle" color="white" size={30}/>
    }

    {/* フォルダの場合にのみ右矢印アイコンを表示 */}
    {isFolder && 
     <AntDesign name="right" color="white" size={30}/>    
    }

   </Pressable>
  </Link>
 )
}