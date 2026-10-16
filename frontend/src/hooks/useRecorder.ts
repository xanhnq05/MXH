// Hook dùng MediaRecorder để ghi âm thanh rồi upload.
import { useState, useRef, useCallback } from "react";

export const useRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef(0);
  const timerRef = useRef<number | null>(null);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.start(100);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      startTimeRef.current = Date.now();
      timerRef.current = window.setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 200);
    } catch (err) {
      console.error("Mic error:", err);
      throw err;
    }
  }, []);

  const stop = useCallback((): Promise<{ blob: Blob; duration: number; file: File }> => {
    return new Promise((resolve, reject) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder) {
        reject(new Error("Không có recorder"));
        return;
      }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const finalDuration = Math.floor((Date.now() - startTimeRef.current) / 1000);
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: "audio/webm" });
        // Dừng tất cả tracks
        recorder.stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);
        setIsRecording(false);
        setDuration(0);
        mediaRecorderRef.current = null;
        resolve({ blob, duration: finalDuration, file });
      };
      recorder.stop();
    });
  }, []);

  return { isRecording, duration, start, stop };
};
