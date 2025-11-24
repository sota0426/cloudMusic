// DriveListItem.tsx

import { usePlayer } from "@/provider/PlayerProvider";
import { GoogleDriveFile } from "@/provider/useGoogleDrive";
import { OneDriveFile } from "@/provider/useOneDrive";
import AntDesign from "@expo/vector-icons/AntDesign";
import Entypo from "@expo/vector-icons/Entypo";
import Octicons from "@expo/vector-icons/Octicons";
import { useAudioPlayerStatus } from "expo-audio";
import { Pressable } from "react-native";

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

 const indentationStyle={
    paddingLeft: `${indentationLevel * 15 + 12}px`,
 }
 

   const {player}  = usePlayer();
   const playerStatus = useAudioPlayerStatus(player ?? undefined);
 
   const isReady = !!player;
 
   const onTogglePlay = async () => {
     console.log("togglePlay pressed", { playerPresent: !!player, status: playerStatus?.playing });
     if (!player) { console.warn("no player"); return; }
     try {
       if (playerStatus?.playing) {
         await player.pause();
         console.log("paused");
       } else {
         await player.play();
         console.log("played");
       }
     } catch (e) {
       console.warn("play/pause error:", e);
     }
   };

 return(
  // Linkの代わりにdivを使用し、見た目をLinkのようにします
  <div 
   // フォルダの場合でもクリック処理を有効にするため、Linkの代わりにButton/divでラップ
   className={`
    flex flex-row gap-4 items-center p-3 border-b border-gray-700 w-full cursor-pointer transition duration-150
    hover:bg-gray-700/50
    ${isFolder ? 'cursor-pointer' : 'cursor-pointer'}
   `}
   style={indentationStyle}
  >
   <button
    // UIとしてボタン化
    className="flex flex-row gap-4 items-center w-full p-0 bg-transparent border-none text-left"
    style={{ paddingLeft: 0, paddingRight: 0 }}
    // フォルダの場合は親コンポーネントのロジック (onPressItem) でフォルダ移動を処理
    // ファイルの場合は、onPressItemで再生ロジックをトリガーさせると仮定
    onClick={() => onPressItem(file)} 
   >
    {/* 💡 ドライブアイコンの切り替え（Lucide React Iconを使用） */}
    {isFolder ? (
     <AntDesign name="folder" color="white" size={24}/>
    ): (
     <AntDesign name="minus-circle" color="white" size={24}/>
    )}

    <div className="flex-1">
     <p className="text-white font-medium text-sm">
      {name}
     </p>
     {/* 💡 ドライブタイプの表示 */}
     <div className="flex flex-row items-center gap-1 mt-0.5">
      {driveType === "GoogleDrive" ? (
       // Googleアイコン (Lucide Reactには直接的なGoogleロゴがないため、Gアイコンを代用またはカスタムSVGを使用)
        <Entypo name="google-drive" size={12} color="blue"/> 
      ) : (
       // OneDriveアイコン (Lucide Cloudを代用)
        <Entypo name="cloud" size={12} color="blue"/> 
      )}
      <span className="text-gray-400 text-xs">
       {driveType === "GoogleDrive" ? "Google Drive" : "OneDrive"}
      </span>
     </div>
    </div>

    {/* 音楽ファイルの場合にのみ再生アイコンを表示 */}
    {!isFolder && isAudio &&    
      <Pressable onPress={onTogglePlay} hitSlop={8}>
          <Octicons name="play" size={28} color="white" />
      </Pressable>
    }

    {/* フォルダの場合にのみ右矢印アイコンを表示 */}
    {isFolder && 
     <AntDesign name="down-circle" size={24} color="white" />
    }
   </button>
  </div>
 );
}



