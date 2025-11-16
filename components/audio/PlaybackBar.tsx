import { useState } from "react";
import { GestureResponderEvent, Pressable, Text, View } from "react-native";

interface PlaybackBarProps{
  currentTime:number;
  duration:number;
  onSeek:(seconds:number)=>void;
}

export default function PlaybackBar({
  currentTime,
  duration,
  onSeek
}:PlaybackBarProps){
  const [width,setWidth] = useState(0);

  const progress= duration > 0 ? currentTime / duration :0 ;

  const formatTime =(time:number)=>{
    const minutes = Math.floor(time /60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2,"0")}`;
  }

  const onHandleSeek = (event: GestureResponderEvent) => {
    let pressX = event.nativeEvent.locationX;
    if (pressX === undefined) {
      // @ts-ignore
      pressX = event.nativeEvent.offsetX || event.nativeEvent.layerX || NaN;
    }
    if (width === 0 || typeof pressX !== 'number' || duration <= 0 || isNaN(pressX)) {
        console.warn("Invalid seek attempt: Width, duration, or pressX is zero/invalid.");
        return; // Stop the function if inputs are bad
    }
    let percentage = pressX / width;
    percentage = Math.max(0, Math.min(1, percentage)); 
    const seekToSeconds = duration * percentage;
    if (!isFinite(seekToSeconds)) {
        console.error("Calculated seek value is non-finite:", seekToSeconds);
        return;
    }
    onSeek(seekToSeconds);
};

  return(
    <View>
      <Pressable 
        onPress={onHandleSeek}
        onLayout={(event)=>setWidth(event.nativeEvent.layout.width)}
        className="w-full bg-slate-900 h-2 rounded-full justify-center "
        hitSlop={20}
      >
        <View 
          className="bg-orange-400 h-full rounded-full"
          style={{width:`${progress*100}%`}}
        />
        <View 
          className="bg-orange-400 absolute w-3 h-3 -translate-x-1/2 rounded-full"
          style={{left:`${progress*100}%`}}
        />
      </Pressable>
      <View className="flex-row items-center justify-between">
        <Text className="text-gray-400">{formatTime(currentTime)}</Text>
        <Text className="text-gray-400">{formatTime(duration)}</Text>
      </View>
    </View>
  )
  
}