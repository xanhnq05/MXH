import type { User } from "./user";

export interface AuthState {
  accessToken: string | null;
  user: User | null;
  loading: boolean;
  setAccessToken: (t: string | null) => void;
  setUser: (u: User | null) => void;
  updateUser: (patch: Partial<User>) => void;
  updateUserStatus: (userId: string, isOnline: boolean) => void;
  clearState: () => void;
  signUp: (data: SignUpPayload) => Promise<void>;
  signIn: (data: SignInPayload) => Promise<void>;
  signOut: () => Promise<void>;
  fetchMe: () => Promise<void>;
}

export interface SignUpPayload {
  username: string;
  password: string;
  email: string;
  displayName?: string;
  otp: string;
}

export interface SignInPayload {
  username: string;
  password: string;
}
