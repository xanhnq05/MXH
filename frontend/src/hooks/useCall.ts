// Hook quản lý WebRTC call lifecycle (1-1 hoặc group, audio/video).
// - Lắng nghe socket: call:offer / call:answer / call:ice-candidate / call:reject / call:end
// - Cung cấp các action: startCall, acceptCall, rejectCall, endCall, toggleAudio, toggleVideo
// - Dùng chung cho CallModal và IncomingCallModal.

import { useEffect, useRef, useState, useCallback } from "react";
import { CallPeer, RTC_CONFIG, CallType, CallMode } from "@/lib/rtc";
import { getSocket } from "@/lib/socket";
import { callService } from "@/services/other.service";
import { toast } from "sonner";

export interface CallSignalPayload {
  callId?: string;
  fromUserId: string;
  fromUser?: { _id: string; username: string; displayName: string; avatarUrl?: string };
  toUserId?: string;
  conversationId: string;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  type: CallType;
  mode?: CallMode;
  isGroup?: boolean;
}

export interface UseCallOptions {
  currentUserId: string;
  onIncoming?: (p: CallSignalPayload) => void;
  onEnded?: () => void;
}

export const useCall = ({ currentUserId, onIncoming, onEnded }: UseCallOptions) => {
  const [active, setActive] = useState<{
    callId?: string;
    type: CallType;
    mode: CallMode;
    conversationId: string;
    remoteUserId: string;
    remoteUser: CallSignalPayload["fromUser"];
    isIncoming: boolean;
    isConnecting: boolean;
    isConnected: boolean;
    startedAt: number;
  } | null>(null);

  const peerRef = useRef<CallPeer | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [duration, setDuration] = useState(0);
  const timerRef = useRef<number | null>(null);

  // ============== SOCKET LISTENERS ==============
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onOffer = async (p: CallSignalPayload) => {
      onIncoming?.(p);
    };
    const onOfferGroup = async (p: CallSignalPayload & { isGroup: true }) => {
      onIncoming?.(p);
    };
    const onAnswer = async (p: CallSignalPayload) => {
      if (!peerRef.current || !p.sdp) return;
      try {
        await peerRef.current.handleAnswer(p.sdp);
        setActive((s) => s && { ...s, isConnecting: false, isConnected: true });
        startTimer();
      } catch (err) {
        console.error("handleAnswer", err);
      }
    };
    const onIce = async (p: CallSignalPayload) => {
      if (!peerRef.current || !p.candidate) return;
      try {
        await peerRef.current.handleIceCandidate(p.candidate);
      } catch (err) {
        console.error("ice", err);
      }
    };
    const onReject = async (p: CallSignalPayload) => {
      cleanup("rejected");
      toast.info("Cuộc gọi bị từ chối");
    };
    const onEnd = async () => {
      cleanup("ended");
    };

    socket.on("call:offer", onOffer);
    socket.on("call:offer:group", onOfferGroup);
    socket.on("call:answer", onAnswer);
    socket.on("call:ice-candidate", onIce);
    socket.on("call:ice:group", onIce);
    socket.on("call:answer:group", onAnswer);
    socket.on("call:reject", onReject);
    socket.on("call:end", onEnd);

    return () => {
      socket.off("call:offer", onOffer);
      socket.off("call:offer:group", onOfferGroup);
      socket.off("call:answer", onAnswer);
      socket.off("call:ice-candidate", onIce);
      socket.off("call:ice:group", onIce);
      socket.off("call:answer:group", onAnswer);
      socket.off("call:reject", onReject);
      socket.off("call:end", onEnd);
    };
  }, [currentUserId, onIncoming]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup("ended");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    const startedAt = Date.now();
    timerRef.current = window.setInterval(() => {
      setDuration(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setDuration(0);
  };

    const cleanup = useCallback(async (status: "ended" | "rejected" | "missed" | "failed" = "ended") => {
    try {
      const callId = active?.callId;
      if (callId) {
        callService.end(callId, status).catch(() => {});
      }
    } catch {}
    peerRef.current?.close();
    peerRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    stopTimer();
    setActive(null);
    onEnded?.();
  }, [active, onEnded]);

  // ============== ACTIONS ==============

  /** Bắt đầu gọi 1-1 */
  const startDirectCall = useCallback(
    async (opts: {
      conversationId: string;
      remoteUserId: string;
      remoteUser: CallSignalPayload["fromUser"];
      type: CallType;
    }) => {
      const socket = getSocket();
      if (!socket) {
        toast.error("Chưa kết nối socket");
        return;
      }
      try {
        // 1) Tạo CallLog
        const log = await callService.start({
          conversationId: opts.conversationId,
          type: opts.type,
          mode: "direct",
        });

        // 2) Lấy local media
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: opts.type === "video" ? { width: 1280, height: 720 } : false,
        });
        localStreamRef.current = stream;
        setLocalStream(stream);

        // 3) Tạo peer + offer
        const peer = new CallPeer({
          type: opts.type,
          mode: "direct",
          userId: currentUserId,
          remoteUserId: opts.remoteUserId,
          isInitiator: true,
          callbacks: {
            onIceCandidate: (candidate) => {
              socket.emit("call:ice-candidate", {
                toUserId: opts.remoteUserId,
                candidate,
              });
            },
            onClose: () => cleanup("ended"),
          },
        });
        peerRef.current = peer;
        stream.getTracks().forEach((t) => peer.pc.addTrack(t, stream));
        const offer = await peer.createOffer();

        // 4) Set state
        setActive({
          callId: log._id,
          type: opts.type,
          mode: "direct",
          conversationId: opts.conversationId,
          remoteUserId: opts.remoteUserId,
          remoteUser: opts.remoteUser,
          isIncoming: false,
          isConnecting: true,
          isConnected: false,
          startedAt: Date.now(),
        });

        // 5) Gửi offer
        socket.emit("call:offer", {
          callId: log._id,
          toUserId: opts.remoteUserId,
          conversationId: opts.conversationId,
          sdp: offer,
          type: opts.type,
        });
      } catch (err: any) {
        toast.error("Không thể bắt đầu cuộc gọi: " + (err.message || err));
        cleanup("failed");
      }
    },
    [currentUserId, cleanup]
  );

  /** Chấp nhận cuộc gọi đến */
  const acceptCall = useCallback(
    async (incoming: CallSignalPayload) => {
      const socket = getSocket();
      if (!socket || !incoming.sdp) return;
      try {
        // 1) Tạo CallLog (accept)
        const log = await callService.start({
          conversationId: incoming.conversationId,
          type: incoming.type,
          mode: incoming.isGroup ? "group" : "direct",
        });

        // 2) Lấy local media
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: incoming.type === "video" ? { width: 1280, height: 720 } : false,
        });
        localStreamRef.current = stream;
        setLocalStream(stream);

        // 3) Tạo peer (không phải initiator) và answer
        const peer = new CallPeer({
          type: incoming.type,
          mode: incoming.isGroup ? "group" : "direct",
          userId: currentUserId,
          remoteUserId: incoming.fromUserId,
          isInitiator: false,
          callbacks: {
            onRemoteStream: (s) => {
              remoteStreamRef.current = s;
              setRemoteStream(s);
            },
            onIceCandidate: (candidate) => {
              const event = incoming.isGroup ? "call:ice:group" : "call:ice-candidate";
              socket.emit(event, {
                toUserId: incoming.fromUserId,
                conversationId: incoming.conversationId,
                candidate,
              });
            },
            onClose: () => cleanup("ended"),
          },
        });
        peerRef.current = peer;
        stream.getTracks().forEach((t) => peer.pc.addTrack(t, stream));
        const answer = await peer.handleOffer(incoming.sdp);

        setActive({
          callId: log._id,
          type: incoming.type,
          mode: incoming.isGroup ? "group" : "direct",
          conversationId: incoming.conversationId,
          remoteUserId: incoming.fromUserId,
          remoteUser: incoming.fromUser,
          isIncoming: true,
          isConnecting: false,
          isConnected: true,
          startedAt: Date.now(),
        });
        startTimer();

        // 4) Gửi answer
        const event = incoming.isGroup ? "call:answer:group" : "call:answer";
        socket.emit(event, {
          callId: log._id,
          toUserId: incoming.fromUserId,
          conversationId: incoming.conversationId,
          sdp: answer,
        });
      } catch (err: any) {
        toast.error("Không thể chấp nhận cuộc gọi: " + (err.message || err));
        cleanup("failed");
      }
    },
    [currentUserId, cleanup]
  );

  /** Từ chối cuộc gọi */
  const rejectCall = useCallback(
    (incoming: CallSignalPayload) => {
      const socket = getSocket();
      socket?.emit("call:reject", {
        toUserId: incoming.fromUserId,
        conversationId: incoming.conversationId,
        callId: incoming.callId,
      });
    },
    []
  );

  /** Kết thúc cuộc gọi hiện tại */
  const endCurrentCall = useCallback(() => {
    if (!active) return;
    const socket = getSocket();
    if (active.mode === "group") {
      socket?.emit("call:end", {
        conversationId: active.conversationId,
      });
    } else {
      socket?.emit("call:end", {
        toUserId: active.remoteUserId,
        conversationId: active.conversationId,
      });
    }
    cleanup("ended");
  }, [active, cleanup]);

  const toggleAudio = useCallback(() => {
    if (!peerRef.current || !localStreamRef.current) return;
    const newVal = !audioEnabled;
    peerRef.current.toggleAudio(newVal);
    setAudioEnabled(newVal);
  }, [audioEnabled]);

  const toggleVideo = useCallback(() => {
    if (!peerRef.current || !localStreamRef.current) return;
    const newVal = !videoEnabled;
    peerRef.current.toggleVideo(newVal);
    setVideoEnabled(newVal);
  }, [videoEnabled]);

  return {
    active,
    localStream,
    remoteStream,
    audioEnabled,
    videoEnabled,
    duration,
    startDirectCall,
    acceptCall,
    rejectCall,
    endCurrentCall,
    toggleAudio,
    toggleVideo,
    cleanup,
  };
};
