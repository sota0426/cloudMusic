import { FlatList, View } from "react-native";

import Audios from '@/assets/data/dummyAudio';
import { AudioListItem } from "@/components/audio/AudioListItem";


export default function Music(){

  return(
    <View className="bg-slate-800 flex-1  justify-center p-4">
      <FlatList 
        data={Audios}
        contentContainerClassName="gap-4"
        renderItem={({item})=><AudioListItem audio={item}/>}
      />
    </View>
  )
}