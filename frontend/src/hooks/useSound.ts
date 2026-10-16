// Hook phát âm thanh thông báo khi nhận tin nhắn mới.
import { useEffect, useRef } from "react";
import { useAuthStore } from "@/stores/useAuthStore";

const SOUND_URLS: Record<string, string> = {
  default: "/sounds/message.mp3",
  bell: "/sounds/bell.mp3",
  chime: "/sounds/chime.mp3",
};

export const useMessageSound = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio();
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  const play = () => {
    const { user } = useAuthStore.getState();
    if (!user?.soundEnabled) return;
    const url = (user.soundTheme && SOUND_URLS[user.soundTheme]) || SOUND_URLS.default;
    if (audioRef.current) {
      audioRef.current.src = url;
      audioRef.current.volume = 0.5;
      audioRef.current.play().catch(() => {});
    }
  };

  return { play };
};
