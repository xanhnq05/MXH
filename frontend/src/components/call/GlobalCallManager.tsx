// Hook wrapper kết nối useCall với useCallStore — dùng trong App level
// để quản lý cuộc gọi toàn cục (mọi page đều có thể nghe và xử lý).
import React, { useEffect, useCallback } from "react";
import { useCallStore } from "@/stores/useCallStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { useCall as useCallCore, CallSignalPayload } from "@/hooks/useCall";
import CallModal from "@/components/call/CallModal";
import IncomingCallModal from "@/components/call/IncomingCallModal";

export const useCallManager = () => {
  const { user } = useAuthStore();
  const { setIncomingCall } = useCallStore();

  const onIncoming = useCallback(
    (p: CallSignalPayload) => {
      setIncomingCall(p);
    },
    [setIncomingCall]
  );

  return useCallCore({
    currentUserId: user?._id || "",
    onIncoming,
  });
};

interface GlobalCallManagerProps {
  children: React.ReactNode;
}

export const GlobalCallManager = ({ children }: GlobalCallManagerProps) => {
  const call = useCallManager();
  const { active, incoming } = useCallStore();

  useEffect(() => {
    if (call.active) {
      useCallStore.setState({ active: call.active });
    } else {
      useCallStore.setState({ active: null });
    }
  }, [call.active]);

  return (
    <>
      {children}
      <IncomingCallModal
        incoming={incoming}
        onAccept={(p) => {
          call.acceptCall(p);
          useCallStore.getState().setIncomingCall(null);
        }}
        onReject={(p) => {
          call.rejectCall(p);
          useCallStore.getState().setIncomingCall(null);
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
    </>
  );
};
