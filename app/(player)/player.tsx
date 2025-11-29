import { usePlayer } from "@/provider/PlayerProvider"
import Foundation from "@expo/vector-icons/Foundation"
import Slider from "@react-native-community/slider"
import { router, Stack } from "expo-router"
import React, { useEffect, useState } from "react"
import { ActivityIndicator, Button, Pressable, Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

const AudioListItem = React.memo(({item,index,currentAudioId}:{
    item:any,
    index:number,
    currentAudioId: string | null
})=>(
    <View className={`p-3 border-b ${currentAudioId === item.id ? "bg-blue-900" : "bg-gray-700"} border-gray-700`}>
        <Text 
            className={`text-base ${currentAudioId === item.id ? "text-blue-300 font-bold" : "text-white"}`}
            numberOfLines={1}    
        >
            {index + 1}.{item.name}
        </Text>
    </View>
))

export default function FullPlayerScreen(){
    const { 
        player,
        currentAudio, 
        audioList, 
        currentAudioIndex, 
        isPlaying,
        isLoading: playerLoading,
        pauseAudio, 
        resumeAudio, 
        playNext, 
        playPrev,
        playAudio 
    } = usePlayer();


    const [currentTime, setCurrentTime] = useState(0);
    const [duration , setDuration] = useState(0);
    const [isSeeking,setIsSeeking]= useState(false);

    useEffect(()=>{
        if(!player) return;

        const interval = setInterval(()=>{
            if(!isSeeking){
                setCurrentTime(player.currentTime || 0);
                setDuration(player.duration || 0);
            }
        },100)

        return ()=> clearInterval(interval)
    },[player,isSeeking])

    if(!currentAudio){
        return(
            <SafeAreaView className="flex-1 bg-gray-900 justify-center items-center">
                <Text className="text-gray-400 pb-2">再生中のオーディオはありません。</Text>
                <Button 
                        title="ライブラリに戻る"
                        onPress={()=>router.push("/")}
                    />
                </SafeAreaView>            
        )
    }

    const handlePlayPause = () => isPlaying 
        ? pauseAudio()
        : resumeAudio();
        
    const handleSlidingStart = () =>{
        setIsSeeking(true);
    }

    const handleSeek = async(value:number)=>{
        try{
            await player.seekTo(value);
            setCurrentTime(value);
        }catch(error){
            console.error("Seek Error : ",error);
        }finally{
            setIsSeeking(false);
        }
    };

    const formatTime = (seconds:number) :string =>{
        if(!seconds || isNaN(seconds)) return "0:00";

        const hrs = Math.floor(seconds/3600);
        const mins = Math.floor((seconds % 3600 ) / 60);
        const secs = Math.floor((seconds % 3600 ) % 60);

        if(hrs >0) {
            // H:MM:SS
            return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;           
        }else{
            // M:SS （1時間未満）
            return `${mins}:${secs.toString().padStart(2, "0")}`;
        }
    }


    const renderItem = ({item,index}:{item:any , index:number})=>{
        <Pressable
            onPress={()=> playAudio(audioList,index)}
        >
            <AudioListItem 
                item={item}
                index={index}
                currentAudioId={currentAudio?.id ?? null}
            />
        </Pressable>
    }

    const initialIndex = currentAudioIndex >= 0 ? currentAudio : 0;

    return(
        <SafeAreaView edges={["bottom"]} className="bg-gray-900 border-t border-gray-700">
            <Stack.Screen 
                options={{
                    title: currentAudio?.name ?? "player",
                    headerStyle:{backgroundColor:"#1f2937"},
                    headerTintColor:"#fff",
                    headerLeft: ()=>(
                        <Pressable onPress={()=>router.back()}>
                            <Text className="text-white text-base">Cancel</Text>
                        </Pressable>
                    ),
                    presentation:"modal"
                }}
            />
            
            <View className="flex border-gray-700 p-3">
                <Text className="text-white text-xl font-semibold p-3 ">
                    プレイリスト ( {audioList.length} 曲)
                </Text>

                {/** playing file name */}
                <Text className="text-white text-sm mb-1 text-gray-400">再生中</Text>
                <Text 
                    className="text-white text-base font-semibold mb-3"
                    numberOfLines={1}
                >
                    {currentAudio.name}
                </Text>


                {/** Time screen and seekBar */}
                <View className="mb-3">
                    {/**current Time */}
                    <View className="flex-row justify-between">
                        <Text className="text-gray-400 text-xs">{formatTime(currentTime)}</Text>
                        <Text className="text-gray-400 text-xs">{formatTime(duration)}</Text>
                    </View>

                    {/**seek bar */}
                    <Slider 
                        style={{width: "auto" , height:30}}
                        minimumValue={0}
                        maximumValue={duration || 1}
                        value={currentTime}
                        onSlidingStart={handleSlidingStart}
                        onSlidingComplete={handleSeek}
                        minimumTrackTintColor="#3b82f6"
                        maximumTrackTintColor="#4b5563"
                        thumbTintColor="#3b82f6"
                    />
                </View>


                {/** controll button */}
                <View className="flex-row space-x-2">

                    {/** playPrev */}
                    <Pressable
                        onPress={(e)=> {
                            e.stopPropagation();
                            playPrev();
                        }}
                        className="bg-gray-800 p-3 rounded"
                    >
                        <Text className="text-center">
                            <Foundation  name="previous" size={20} color="white" />
                        </Text>
                    </Pressable>

                     {/** pause or play */}
                     <Pressable
                        onPress={(e)=> {
                            e.stopPropagation();
                            handlePlayPause()}}
                        className="bg-gray-800 p-3 rounded flex-1 mr-2"
                    >
                        <Text className="text-center">
                            <Foundation  name={isPlaying ? "pause" : "play"} size={20} color="white" />
                        </Text>
                    </Pressable>


                      {/** playNext */}
                      <Pressable
                        onPress={(e)=> {
                            e.stopPropagation();
                            playNext()}}
                        className="bg-gray-800 p-3 rounded"
                        disabled={playerLoading}
                    >
                        <Text className="text-center">
                            <Foundation  name="next" size={20} color="white" />
                        </Text>
                    </Pressable>
                </View>

      
                {/** indicator */}
                {playerLoading && (
                    <View className="absolute inset-0 bg-gray-800/80 justify-center items-center rounded-lg">
                        <ActivityIndicator color="#ffffff" size="large" />
                    </View>
                )}

            </View>
        </SafeAreaView>
    )
}