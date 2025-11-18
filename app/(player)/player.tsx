import { AudioData } from '@/assets/data/dummyAudio';
import PlaybackBar from '@/components/audio/PlaybackBar';
import { usePlayer } from '@/provider/PlayerProvider';
import AntDesign from '@expo/vector-icons/AntDesign';
import Entypo from '@expo/vector-icons/Entypo';
import Ionicons from '@expo/vector-icons/Ionicons';
import Octicons from '@expo/vector-icons/Octicons';

import { useAudioPlayerStatus } from "expo-audio";
import { router } from 'expo-router';
import { Image, Pressable, Text, View } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';


const PlayerScreen = () => {

  const audioData = AudioData[0];


  const {player} = usePlayer();
  const playerStaus = useAudioPlayerStatus(player)


  
  return ( 
    <SafeAreaView className="flex-1  p-4 py-10 gap-x-4 ">
      <Pressable 
        onPress={()=>router.back()}
        className='absolute top-16 left-4 bg-gray-800 rounded-full p-2'
      >
        <Entypo name="chevron-down" size={24} color="white" />
      </Pressable>

      <Image source={{uri:audioData.thumbnail_url}} className='mt-40 w-[50%] aspect-square rounded-[30px] self-center'/>

      <View className='gap-8 flex-1 justify-center '>
      <Text className='text-white text-2xl font-bold text-center '>{audioData.title}</Text>

      <PlaybackBar 
        currentTime={playerStaus.currentTime}
        duration={playerStaus.duration}
        onSeek={(seconds)=>player.seekTo(seconds)}
      />

        <View className='flex-row items-center justify-between m-8'>
          
          <Ionicons name="play-skip-back-outline" size={24} color="white" />
          <Ionicons name="play-back-outline" size={24} color="white" />

          <Pressable onPress={()=>
            {playerStaus.playing ? player.pause() : player.play()}
          }>
            {playerStaus.playing ? (
              <AntDesign name="pause-circle" size={24} color="white"/>
            ):(
              <Octicons name="play" size={24} color="white"/>
            )} 
          </Pressable>
          <Ionicons name="play-forward-outline" size={24} color="white" />
          <Ionicons name="play-skip-forward-outline" size={24} color="white" />
        </View>
      </View>
    </SafeAreaView>
   );
}
 
export default PlayerScreen;