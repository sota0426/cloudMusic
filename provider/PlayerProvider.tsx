// PlayerProvider.tsx
import { AudioPlayer, useAudioPlayer } from "expo-audio";
import { createContext, PropsWithChildren, useContext, useEffect, useState } from "react";

// 音声データの型定義
export interface AudioMetadata {
  id: string;
  name: string;
  url: string; // ダウンロード可能なURL
  source: "local" | "onedrive" | "googledrive"; 
  mimeType?: string;
  duration?: number;
}

type PlayerContextType = {
  player: AudioPlayer;
  currentAudio: AudioMetadata | null;
  isPlaying: boolean;
  isLoading: boolean;
  playAudio: (audio: AudioMetadata) => Promise<void>;
  pauseAudio: () => void;
  resumeAudio: () => void;
  stopAudio: () => void;
  setVolume: (volume: number) => void;
};

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export default function PlayerProvider({ children }: PropsWithChildren) {
  const [currentAudio, setCurrentAudio] = useState<AudioMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 初期状態では空のプレイヤーを作成
  const player = useAudioPlayer();

  // 🔍 デバッグ: プレイヤーの状態を監視
  useEffect(() => {
    console.log("🎵 Player状態変更:", {
      playing: player.playing,
      volume: player.volume,
      duration: player.duration,
      currentTime: player.currentTime,
      isLoaded: player.isLoaded,
    });
  }, [player.playing, player.isLoaded]);

  /**
   * 音声を再生
   */
  const playAudio = async (audio: AudioMetadata) => {
    try {
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("🎵 playAudio() 開始");
      console.log("📁 ファイル名:", audio.name);
      console.log("🌐 URL:", audio.url);
      console.log("📦 ソース:", audio.source);
      console.log("📄 MIME Type:", audio.mimeType);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

      setIsLoading(true);

      // 既に再生中の場合は停止
      if (player.playing) {
        console.log("⏸️ 既存の再生を停止");
        player.pause();
      }

      console.log("🔄 player.replace() 実行中...");
      
      // 新しい音声をロードして再生
      await player.replace({ uri: audio.url });
      
      console.log("✅ player.replace() 完了");
      console.log("🔍 replace後のプレイヤー状態:", {
        playing: player.playing,
        isLoaded: player.isLoaded,
        duration: player.duration,
      });

      console.log("▶️ player.play() 実行中...");
      player.play();
      
      console.log("✅ player.play() 完了");
      console.log("🔍 play後のプレイヤー状態:", {
        playing: player.playing,
        volume: player.volume,
      });

      setCurrentAudio(audio);
      console.log("✅ playAudio() 完了");
      
    } catch (error) {
      console.error("❌ 音声再生エラー:", error);
      console.error("❌ エラー詳細:", JSON.stringify(error, null, 2));
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 一時停止
   */
  const pauseAudio = () => {
    console.log("▶️ pauseAudio() 実行");
    if (player.playing) {
      player.pause();
      console.log("✅ 一時停止完了");
    } else {
      console.log("⚠️ 既に停止中");
    }
    console.log("現在の状態:", {
      playing: player.playing,
      currentAudio: currentAudio?.name,
      isLoaded: player.isLoaded,
    });
  };

  /**
   * 再開
   */
  const resumeAudio = () => {
    console.log("▶️ resumeAudio() 実行");
    
    if (!player.playing && currentAudio) {
      player.play();
      console.log("✅ 再生再開完了");
    } else {
      console.log("⚠️ 再生できない状態");
    }
    console.log("現在の状態:", {
      playing: player.playing,
      currentAudio: currentAudio?.name,
      isLoaded: player.isLoaded,
    });    
  };

  /**
   * 停止（完全にリセット）
   */
  const stopAudio = () => {
    console.log("⏹️ stopAudio() 実行");
    player.pause();
    setCurrentAudio(null);
    console.log("✅ 停止完了");
  };

  /**
   * 音量設定 (0.0 ~ 1.0)
   */
  const setVolume = (volume: number) => {
    const newVolume = Math.max(0, Math.min(1, volume));
    console.log(`🔊 音量設定: ${newVolume}`);
    player.volume = newVolume;
  };

  return (
    <PlayerContext.Provider
      value={{
        player,
        currentAudio,
        isPlaying: player.playing,
        isLoading,
        playAudio,
        pauseAudio,
        resumeAudio,
        stopAudio,
        setVolume,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error("usePlayer must be used within PlayerProvider");
  }
  return context;
};