import { AudioPlayer, useAudioPlayer } from "expo-audio";
import { createContext, PropsWithChildren, useContext } from "react";

type PlayerContextType = {
  player:AudioPlayer;

}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export default function PlayerProvider({children}:PropsWithChildren){

  const url=  require('@/assets/data/audio2.mp3')

  const player = useAudioPlayer({uri:url});

  return(
    <PlayerContext.Provider value={{player}}>
      {children}      
    </PlayerContext.Provider>
  )
}

export const usePlayer =()=> useContext(PlayerContext);