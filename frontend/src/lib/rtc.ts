// WebRTC helper — tạo peer connection, xử lý offer/answer/ICE.
// Signaling qua socket (call:offer / call:answer / call:ice-candidate).

export const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export type CallType = "audio" | "video";
export type CallMode = "direct" | "group";

export interface CallPeerCallbacks {
  onLocalStream?: (stream: MediaStream) => void;
  onRemoteStream?: (stream: MediaStream, userId: string) => void;
  onIceCandidate?: (candidate: RTCIceCandidateInit) => void;
  onClose?: () => void;
  onError?: (err: Error) => void;
}

export class CallPeer {
  pc: RTCPeerConnection;
  localStream: MediaStream | null = null;
  remoteStreams = new Map<string, MediaStream>();
  callbacks: CallPeerCallbacks;
  type: CallType;
  mode: CallMode;
  userId: string;
  remoteUserId: string | null = null;
  isInitiator = false;

  constructor(opts: {
    type: CallType;
    mode: CallMode;
    userId: string;
    remoteUserId?: string;
    isInitiator?: boolean;
    callbacks?: CallPeerCallbacks;
  }) {
    this.type = opts.type;
    this.mode = opts.mode;
    this.userId = opts.userId;
    this.remoteUserId = opts.remoteUserId || null;
    this.isInitiator = !!opts.isInitiator;
    this.callbacks = opts.callbacks || {};
    this.pc = new RTCPeerConnection(RTC_CONFIG);

    this.pc.onicecandidate = (e) => {
      if (e.candidate) {
        this.callbacks.onIceCandidate?.(e.candidate.toJSON());
      }
    };
    this.pc.ontrack = (e) => {
      const stream = e.streams[0];
      if (stream && this.remoteUserId) {
        this.remoteStreams.set(this.remoteUserId, stream);
        this.callbacks.onRemoteStream?.(stream, this.remoteUserId);
      }
    };
    this.pc.onconnectionstatechange = () => {
      if (["disconnected", "failed", "closed"].includes(this.pc.connectionState)) {
        this.callbacks.onClose?.();
      }
    };
  }

  async startLocalMedia() {
    const constraints: MediaStreamConstraints = {
      audio: true,
      video:
        this.type === "video"
          ? { width: 1280, height: 720 }
          : false,
    };
    this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
    this.localStream.getTracks().forEach((track) => {
      this.pc.addTrack(track, this.localStream!);
    });
    this.callbacks.onLocalStream?.(this.localStream);
    return this.localStream;
  }

  async createOffer() {
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    return offer;
  }

  async createAnswer() {
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    return answer;
  }

  async handleOffer(offer: RTCSessionDescriptionInit) {
    await this.pc.setRemoteDescription(offer);
    return this.createAnswer();
  }

  async handleAnswer(answer: RTCSessionDescriptionInit) {
    await this.pc.setRemoteDescription(answer);
  }

  async handleIceCandidate(candidate: RTCIceCandidateInit) {
    if (candidate) {
      await this.pc.addIceCandidate(candidate);
    }
  }

  toggleAudio(enabled: boolean) {
    this.localStream?.getAudioTracks().forEach((t) => (t.enabled = enabled));
  }

  toggleVideo(enabled: boolean) {
    this.localStream?.getVideoTracks().forEach((t) => (t.enabled = enabled));
  }

  close() {
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.remoteStreams.clear();
    this.pc.close();
  }
}
