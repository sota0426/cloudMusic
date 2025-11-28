import { usePlayer } from "@/provider/PlayerProvider";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function FloatingPlayer(){
    const {
        currentAudio,
        isPlaying,
        isLoading:playerLoading,
        pauseAudio,
        resumeAudio,
        stopAudio
    } = usePlayer()

    if(!currentAudio){
        return null;
    }
    const [is,setIs] = useState(true);
    const press=()=>{
        setIs((prev)=>!prev)
    }

    return(
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

                {/** controll button */}
                <View className="flex-row space-x-2">
                    <Pressable 
                        onPress={()=> {
                            press();
                            is ?
                            pauseAudio() : resumeAudio()}}
                        className="bg-blue-600 p-3 rounded flex-1 mr-2"
                        disabled={playerLoading}
                    >
                        <Text className="text-white text-center font-semibold">
                            {playerLoading ? "読み込み中..." : is ? "⏸ 一時停止" : "▶ 再生"}
                        </Text>
                    </Pressable>

                    {/*pause button */}
                    <Pressable 
                        onPress={stopAudio}
                        className="bg-red-600 p-3 rounded flex-1"    
                    >
                        <Text className="text-white text-center font-semibold">■ 停止</Text>
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
    )
}