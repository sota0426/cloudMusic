import { Image, Pressable, Text, View } from "react-native";

import AntDesign from '@expo/vector-icons/AntDesign';
import Entypo from '@expo/vector-icons/Entypo';
import { Link } from "expo-router";

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
    <Link href="/player" asChild>
      <Pressable className="flex-row gap-4 items-center">
        {audio.thumbnail_url ? (
        <Image 
          source={{uri: audio.thumbnail_url}}
          className="w-[60] aspect-square rounded-md"        
        />
        ):(
        <Entypo 
          name="music" 
          size={60}
          className="w-20 h-20 rounded-md"
          color="white" />
        )}
        <View className="gap-1 flex-1">
          <Text className="text-white text-xl font-bold">{audio.title}</Text>
          <Text className="text-white "> {audio.author}</Text>
        </View>

        <AntDesign name="play-circle" size={24} color="white" />
      </Pressable>
    </Link>
  )
}