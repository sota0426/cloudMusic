import { AudioData, AudioDataProps } from "@/assets/data/dummyAudio";
import { AudioPlayer, useAudioPlayer } from "expo-audio";
import { createContext, PropsWithChildren, useContext, useState } from "react";

type PlayerContextType = {
  player:AudioPlayer;
  audio:any;
  setAudio:(audio:any)=>void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export default function PlayerProvider({children}:PropsWithChildren){

  //todo
  const [audio,setAudio] = useState<AudioDataProps>(AudioData[0])
  

  //todo
  const url=  require('@/assets/data/audio.mp3')
  const player = useAudioPlayer({uri:url});

  
  return(
    <PlayerContext.Provider value={{player,audio,setAudio}}>
      {children}      
    </PlayerContext.Provider>
  )
}

export const usePlayer =()=> useContext(PlayerContext);