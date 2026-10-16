// Hook wrapper kết nối useCall với useCallStore — dùng trong App level
// để quản lý cuộc gọi toàn cục (mọi page đều có thể nghe và xử lý).
import React, { createContext, useContext } from "react";
import { useCallStore } from "@/stores/useCallStore";
import { useCall as useCallCore, CallSignalPayload } from "@/hooks/useCall";
import CallModal from "@/components/call/CallModal";
import IncomingCallModal from "@/components/call/IncomingCallModal";

interface GlobalCallManagerProps {
    children: React.ReactNode;
}

// Context chia sẻ call actions (startDirectCall, acceptCall, ...) cho mọi component
const CallManagerContext = createContext<ReturnType<typeof useCallCore> | null>(null);

/** Hook dùng trong các component con (vd: ChatHeader) để gọi startDirectCall */
export const useCallManager = () => {
    const ctx = useContext(CallManagerContext);
    if (!ctx) {
        throw new Error("useCallManager must be used within <GlobalCallManager>");
    }
    return ctx;
};

export const GlobalCallManager = ({ children }: GlobalCallManagerProps) => {
  const { setIncomingCall, incoming } = useCallStore();

  const call = useCallCore({
    currentUserId: "",
    onIncoming: (p) => setIncomingCall(p),
  });

  return (
    <CallManagerContext.Provider value={call}>
      {children}
      <IncomingCallModal
        incoming={incoming}
        onAccept={(p) => {
          call.acceptCall(p);
          setIncomingCall(null);
        }}
        onReject={(p) => {
          call.rejectCall(p);
          setIncomingCall(null);
        }}
      />
      {call.active && (
        <CallModal
          type={call.active.type}
          remoteUser={
            call.active.remoteUser || {
              _id: call.active.remoteUserId,
              username: "unknown",
              displayName: "Unknown",
            }
          }
          isConnecting={call.active.isConnecting}
          isConnected={call.active.isConnected}
          duration={call.duration}
          audioEnabled={call.audioEnabled}
          videoEnabled={call.videoEnabled}
          localStream={call.localStream}
          remoteStream={call.remoteStream}
          onToggleAudio={call.toggleAudio}
          onToggleVideo={call.toggleVideo}
          onEnd={call.endCurrentCall}
        />
      )}
    </CallManagerContext.Provider>
  );
};
