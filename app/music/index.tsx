import { View } from "react-native";

import Audios from '@/assets/data/dummyAudio';
import { AudioListItem } from "@/components/audio/AudioListItem";


export default function Music(){

  return(
    <View className="bg-slate-800 flex-1  justify-center p-4">
      <AudioListItem audio={Audios[0]} />
      <AudioListItem audio={Audios[1]} />
    </View>
  )
}