import { Image, Pressable, Text, View } from "react-native";

import AntDesign from '@expo/vector-icons/AntDesign';
import Entypo from '@expo/vector-icons/Entypo';

import { AudioData } from "@/assets/data/dummyAudio";
import { usePlayer } from "@/provider/PlayerProvider";
import Octicons from "@expo/vector-icons/Octicons";
import { useAudioPlayerStatus } from "expo-audio";
import { router } from "expo-router";



export function FloatingPlayer(){
  
  const audio = AudioData[0];

  //todo
  const {player}  = usePlayer();
  const playerStatus = useAudioPlayerStatus(player ?? undefined);

  const isReady = !!player;

  const onTogglePlay = async () => {
    console.log("togglePlay pressed", { playerPresent: !!player, status: playerStatus?.playing });
    if (!player) { console.warn("no player"); return; }
    try {
      if (playerStatus?.playing) {
        await player.pause();
        console.log("paused");
      } else {
        await player.play();
        console.log("played");
      }
    } catch (e) {
      console.warn("play/pause error:", e);
    }
  };
  
  return (
    <View className="flex-row gap-4 items-center p-2 bg-slate-900">
      {/* 画像＋タイトル領域：ここを押すとプレーヤー画面へ遷移 */}
      <Pressable
        onPress={() => router.push("/player")}
        className="flex-row gap-4 items-center flex-1"
        android_ripple={{ color: "rgba(255,255,255,0.06)" }}
      >
        {audio.thumbnail_url ? (
          <Image
            source={{ uri: audio.thumbnail_url }}
            className="w-[60] aspect-square rounded-md"
          />
        ) : (
          <Entypo
            name="music"
            size={60}
            className="w-20 h-20 rounded-md"
            color="white"
          />
        )}

        <View className="gap-1 flex-1">
          <Text className="text-white text-xl font-bold">{audio.title}</Text>
          <Text className="text-white">{audio.author}</Text>
        </View>
      </Pressable>

      {/* 再生／一時停止ボタン：ここは遷移を発生させない */}
      <Pressable onPress={onTogglePlay} hitSlop={8}>
        {playerStatus.playing ? (
          <AntDesign name="pause-circle" size={32} color="white" />
        ) : (
          <Octicons name="play" size={28} color="white" />
        )}

      </Pressable>
    </View>
  );
}