import { Image, Text, View } from "react-native";

import AntDesign from '@expo/vector-icons/AntDesign';

interface audioProps{
  audio:{
    id:number;
    title:string;
    author:string;
    audio_url:string;
    thumbnail_url?:string;
  }
}


export function AudioListItem({audio}:audioProps){
  return(
    <View className="flex-row gap-4 items-center">
      <Image 
        source={{uri: audio.thumbnail_url}}
        className="w-16 aspect-square rounded-md"        
      />
      <View className="gap-1 flex-1">
        <Text className="text-white text-2xl font-bold">{audio.title}</Text>
        <Text className="text-white "> {audio.author}</Text>
      </View>

      <AntDesign name="play-circle" size={24} color="white" />
    </View>
  )
}