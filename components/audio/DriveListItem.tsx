import { GoogleDriveFile } from "@/provider/useGoogleDrive";
import AntDesign from "@expo/vector-icons/AntDesign";
import Entypo from "@expo/vector-icons/Entypo";
import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";

interface DriveListItemProps{
  file:GoogleDriveFile,
  onPressItem:(item:GoogleDriveFile)=>void;
}

export default function DriveListItem({
  file,
  onPressItem
}:DriveListItemProps){

  const {name,mimeType}=file;
  const isFolder = mimeType === "application/vnd.google-apps.folder";

  return(
    <Link  
      href={isFolder ? "/" : "/player"} 
      disabled={isFolder}
      asChild
    >
      <Pressable
        className="flex-row gap-4 items-center p-3 border-b border-gray-700 w-full"
        onPress={()=>onPressItem}
      >
        {isFolder ? (
          <Entypo name="folder" color="white" size={30}/>
        ): (
          <Entypo name="music" color="white" size={30}/>
        )}

        <View className="flex-1">
          <Text className="text-white">
            {name}
          </Text>
        </View>

        {!isFolder &&           
          <AntDesign name="play-circle" color="white" size={30}/>
        }

        {isFolder && 
          <AntDesign name="right" color="white" size={30}/>        
        }

      </Pressable>
    </Link>
  )

}