import { BrowserRouter, Route, Routes } from "react-router";
import { Toaster } from "sonner";
import SignInPage from "./pages/SignInPage";
import SignUpPage from "./pages/SignUpPage";
import OtpVerifyPage from "./pages/OtpVerifyPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import HomePage from "./pages/HomePage";
import ProfilePage from "./pages/ProfilePage";
import EditProfilePage from "./pages/EditProfilePage";
import SettingsPage from "./pages/SettingsPage";
import FriendsPage from "./pages/FriendsPage";
import ChatPage from "./pages/ChatPage";
import NotificationsPage from "./pages/NotificationsPage";
import SearchPage from "./pages/SearchPage";
import GroupSettingsPage from "./pages/GroupSettingsPage";
import MainLayout from "./components/layout/MainLayout";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import { SocketProvider } from "./components/providers/SocketProvider";
import { ThemeProvider } from "./components/providers/ThemeProvider";
import { GlobalCallManager } from "./components/call/GlobalCallManager";
import { LightboxProvider } from "./components/providers/LightboxProvider";

function App() {
  return (
    <ThemeProvider>
      <Toaster richColors position="top-right" />
      <BrowserRouter>
        <Routes>
          <Route path="/signin" element={<SignInPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/verify-otp" element={<OtpVerifyPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          <Route
            element={
              <ProtectedRoute>
                <AppProviders>
                  <MainLayout />
                </AppProviders>
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<HomePage />} />
            <Route path="/profile/:userId?" element={<ProfilePage />} />
            <Route path="/profile/edit" element={<EditProfilePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/friends" element={<FriendsPage />} />
            <Route path="/chat/:conversationId?" element={<ChatPage />} />
            <Route path="/chat/:conversationId/settings" element={<GroupSettingsPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/search" element={<SearchPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

const AppProviders = ({ children }: { children: React.ReactNode }) => (
  <SocketProvider>
    <LightboxProvider>
      <GlobalCallManager>{children}</GlobalCallManager>
    </LightboxProvider>
  </SocketProvider>
);

export default App;
