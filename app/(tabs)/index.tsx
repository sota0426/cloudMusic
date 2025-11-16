import { FlatList, View } from "react-native";

import { AudioData } from "@/assets/data/dummyAudio";
import { AudioListItem } from "@/components/audio/AudioListItem";


export default function Music(){

  return(
    <View className="flex-1  justify-center p-4">
      <FlatList 
        data={AudioData}
        contentContainerClassName="gap-4"
        renderItem={({item})=><AudioListItem audio={item}/>}
      />
    </View>
  )
}