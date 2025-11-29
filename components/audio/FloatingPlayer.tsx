import { usePlayer } from "@/provider/PlayerProvider";
import Foundation from '@expo/vector-icons/Foundation';
import Slider from '@react-native-community/slider';
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function FloatingPlayer(){
    const {
        player,
        currentAudio,
        isPlaying,
        isLoading:playerLoading,
        pauseAudio,
        resumeAudio,
        playNext,
        playPrev
    } = usePlayer()

    const [currentTime , setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isSeeking ,setIsSeeking] = useState(false);

    useEffect(()=>{
        if(!player) return;

        const interval = setInterval(()=>{
            if(!isSeeking){
                setCurrentTime(player.currentTime || 0);
                setDuration(player.duration || 0);
            }
        },100)
        
        return ()=> clearInterval(interval);
    },[player,isSeeking])

    if(!currentAudio){
        return null;
    }

    const handlePlayPause =()=> isPlaying 
        ? pauseAudio() 
        : resumeAudio();

    const handleSlidingStart=()=>{
        setIsSeeking(true);
    }

    const handleSeek = async(value:number)=>{
        try{
            await player.seekTo(value);
            setCurrentTime(value);
        }catch(error){
            console.error("✖ シークエラー：",error);
        }finally{
            setIsSeeking(false)
        }
    };

    const formatTime = (seconds:number):string =>{
        if(!seconds || isNaN(seconds)) return "0:00";

        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        if(hrs >0){
        // H:MM:SS
        return `${hrs}:${mins.toString().padStart(2, "0")}:${secs
            .toString()
            .padStart(2, "0")}`;           
        }
       // M:SS （1時間未満）
         return `${mins}:${secs.toString().padStart(2, "0")}`;   
        
    };

    return(
        <Pressable onPress={()=> router.push("/(player)/player?modal=true")}>
        <SafeAreaView edges={["bottom"]} className="bg-gray-900 border-t border-gray-700">
            <View className="p-3">

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
                    <View className="flex-row justify-between mb-1">
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
                    <View className="absolute inset-0 bg-gray-900/80 justify-center items-cetner rounded-lg">
                        <ActivityIndicator color="#fffff" size="large" />
                    </View>
                )}
            </View>
        </SafeAreaView>
    </Pressable>
    )
}