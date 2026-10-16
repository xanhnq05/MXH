import { create } from "zustand";

export interface IncomingCall {
  callId?: string;
  fromUserId: string;
  fromUser?: { _id: string; username: string; displayName: string; avatarUrl?: string };
  toUserId?: string;
  conversationId: string;
  sdp?: any;
  type: "audio" | "video";
  isGroup?: boolean;
}

export interface ActiveCall {
  callId?: string;
  type: "audio" | "video";
  mode: "direct" | "group";
  conversationId: string;
  remoteUserId: string;
  remoteUser?: { _id: string; username: string; displayName: string; avatarUrl?: string };
  isIncoming: boolean;
  isConnecting: boolean;
  isConnected: boolean;
  startedAt: number;
}

interface CallState {
  active: ActiveCall | null;
  incoming: IncomingCall | null;
  setIncomingCall: (c: IncomingCall | null) => void;
  setActiveCall: (c: ActiveCall | null) => void;
  clear: () => void;
}

export const useCallStore = create<CallState>((set) => ({
  active: null,
  incoming: null,
  setIncomingCall: (c) => set({ incoming: c }),
  setActiveCall: (c) => set({ active: c }),
  clear: () => set({ active: null, incoming: null }),
}));
