import { Mic, MicOff, Video, VideoOff, PhoneOff, Phone, Maximize2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface CallModalProps {
  type: "audio" | "video";
  remoteUser: { _id: string; username: string; displayName: string; avatarUrl?: string };
  isConnecting: boolean;
  isConnected: boolean;
  duration: number;
  audioEnabled: boolean;
  videoEnabled: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onEnd: () => void;
}

const formatDuration = (s: number) => {
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${m.toString().padStart(2, "0")}:${ss.toString().padStart(2, "0")}`;
};

const CallModal = ({
  type,
  remoteUser,
  isConnecting,
  isConnected,
  duration,
  audioEnabled,
  videoEnabled,
  localStream,
  remoteStream,
  onToggleAudio,
  onToggleVideo,
  onEnd,
}: CallModalProps) => {
  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col">
      {/* Remote video (full screen) */}
      {type === "video" ? (
        <div className="flex-1 relative">
          {remoteStream ? (
            <video
              autoPlay
              playsInline
              ref={(el) => {
                if (el && remoteStream) el.srcObject = remoteStream;
              }}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Avatar className="h-32 w-32">
                <AvatarImage src={remoteUser.avatarUrl} />
                <AvatarFallback className="text-5xl">
                  {remoteUser.displayName?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
          )}

          {/* Local video PiP */}
          {localStream && videoEnabled && (
            <div className="absolute top-4 right-4 w-40 h-56 rounded-lg overflow-hidden border-2 border-white/20 shadow-2xl">
              <video
                autoPlay
                playsInline
                muted
                ref={(el) => {
                  if (el && localStream) el.srcObject = localStream;
                }}
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>
      ) : (
        // Audio call: hiển thị avatar
        <div className="flex-1 flex flex-col items-center justify-center text-white gap-4">
          <Avatar className="h-32 w-32 ring-4 ring-primary/30">
            <AvatarImage src={remoteUser.avatarUrl} />
            <AvatarFallback className="text-5xl bg-muted">
              {remoteUser.displayName?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <h2 className="text-2xl font-semibold">{remoteUser.displayName}</h2>
          <p className="text-sm text-white/70">
            {isConnecting
              ? "Đang kết nối..."
              : isConnected
              ? formatDuration(duration)
              : "Đang gọi..."}
          </p>
        </div>
      )}

      {/* Header info (for video) */}
      {type === "video" && (
        <div className="absolute top-4 left-4 text-white">
          <p className="font-semibold text-lg">{remoteUser.displayName}</p>
          <p className="text-sm text-white/70">
            {isConnecting
              ? "Đang kết nối..."
              : isConnected
              ? formatDuration(duration)
              : "Đang gọi..."}
          </p>
        </div>
      )}

      {/* Controls */}
      <div className="bg-slate-900/80 backdrop-blur p-6 flex justify-center gap-4">
        <Button
          size="icon"
          variant={audioEnabled ? "secondary" : "destructive"}
          className="rounded-full h-14 w-14"
          onClick={onToggleAudio}
          title={audioEnabled ? "Tắt mic" : "Bật mic"}
        >
          {audioEnabled ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
        </Button>

        {type === "video" && (
          <Button
            size="icon"
            variant={videoEnabled ? "secondary" : "destructive"}
            className="rounded-full h-14 w-14"
            onClick={onToggleVideo}
            title={videoEnabled ? "Tắt camera" : "Bật camera"}
          >
            {videoEnabled ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
          </Button>
        )}

        <Button
          size="icon"
          variant="destructive"
          className="rounded-full h-14 w-14 bg-red-600 hover:bg-red-700"
          onClick={onEnd}
          title="Kết thúc"
        >
          <PhoneOff className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
};

export default CallModal;
