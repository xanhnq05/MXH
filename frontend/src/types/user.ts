export interface User {
  _id: string;
  username: string;
  email: string;
  fullName?: string;
  displayName: string;
  birthday?: string;
  phone?: string;
  country?: string;
  city?: string;
  school?: string;
  workplace?: string;
  avatarUrl?: string;
  coverUrl?: string;
  bio?: string;
  isOnline?: boolean;
  lastSeen?: string;
  theme?: "light" | "dark" | "system";
  soundEnabled?: boolean;
  soundTheme?: "default" | "bell" | "chime";
  e2eePublicKey?: string;
  e2eeEcdhPublicKey?: string;
  createdAt?: string;
  updatedAt?: string;
}
