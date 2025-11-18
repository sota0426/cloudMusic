import { Image, Pressable, Text, View } from "react-native";

import AntDesign from '@expo/vector-icons/AntDesign';
import Entypo from '@expo/vector-icons/Entypo';
import { Link } from "expo-router";

import { AudioData } from "@/assets/data/dummyAudio";
import Octicons from "@expo/vector-icons/Octicons";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";



export function FloatingPlayer(){
  
  const audio = AudioData[0];

  //todo
  const url = "@/assets/data/audio.mp3"
  const player  = useAudioPlayer({uri:url})
  const playerStaus = useAudioPlayerStatus(player);


  return(
    <Link href="/player" asChild>
      <Pressable className="flex-row gap-4 items-center p-2 bg-slate-900">

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


        {playerStaus.playing ? (
            <AntDesign name="pause-circle" size={24} color="white" onPress={()=>{player.pause()}}/>
          ):(
            <Octicons name="play" size={24} color="white" onPress={()=>{player.play()}}/>
          )}
      </Pressable>
    </Link>
  )
}