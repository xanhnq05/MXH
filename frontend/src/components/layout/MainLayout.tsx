// MainLayout — Redesign với theme cam GreenX #FF6B35 + #FF9F43
import { useState, useEffect } from "react";
import { Outlet, Link, useNavigate, useLocation } from "react-router";
import {
  Home,
  Search,
  Users,
  MessageCircle,
  Bell,
  Settings,
  LogOut,
  Moon,
  Sun,
  Menu,
  X,
  User,
} from "lucide-react";
import { useAuthStore } from "@/stores/useAuthStore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useThemeStore } from "@/stores/useThemeStore";
import { useNotificationStore } from "@/stores/useNotificationStore";
import { cn } from "@/lib/utils";
import { isAdminUser } from "@/lib/helpers";

const navItems = [
  { icon: Home, label: "Trang chủ", path: "/" },
  { icon: Search, label: "Tìm kiếm", path: "/search" },
  { icon: Users, label: "Bạn bè", path: "/friends" },
  { icon: MessageCircle, label: "Tin nhắn", path: "/chat" },
  { icon: Bell, label: "Thông báo", path: "/notifications" },
  { icon: User, label: "Trang cá nhân", path: "/profile" },
  { icon: Settings, label: "Cài đặt", path: "/settings" },
];

const getInitials = (name?: string) =>
  (name || "?")
    .split(/\s+/)
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const MainLayout = () => {
  const { user, signOut } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const { unreadCount } = useNotificationStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const handler = (e: MediaQueryListEvent) => {
      if (e.matches) setDrawerOpen(false);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const Sidebar = ({ onClose }: { onClose?: () => void }) => (
    <div className="h-full w-64 flex flex-col bg-white border-r border-orange-100">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-orange-100">
        <Link
          to="/"
          className="text-2xl font-black tracking-tight"
          onClick={onClose}
        >
          <span className="text-orange-500">G</span>
          <span className="text-orange-400">reenX</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active =
            item.path === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                active
                  ? "bg-greenx-gradient text-white shadow-sm"
                  : "text-slate-600 hover:bg-orange-50 hover:text-orange-600"
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.path === "/notifications" && unreadCount > 0 && (
                <span className="bg-orange-500 text-white text-xs rounded-full h-5 min-w-5 px-1.5 flex items-center justify-center font-bold shadow-sm">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
          );
        })}
        {isAdminUser(user) && (
          <Link
            to="/admin/media"
            onClick={onClose}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
              location.pathname.startsWith("/admin")
                ? "bg-greenx-gradient text-white shadow-sm"
                : "text-slate-600 hover:bg-orange-50 hover:text-orange-600"
            )}
          >
            <Settings className="h-5 w-5 shrink-0" />
            <span className="flex-1">Quản trị Media</span>
          </Link>
        )}
      </nav>

      {/* User section */}
      <div className="border-t border-orange-100 p-3">
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-orange-50 cursor-pointer group transition-colors">
          <Avatar className="h-10 w-10 ring-2 ring-orange-100 group-hover:ring-orange-300">
            <AvatarImage src={user?.avatarUrl} />
            <AvatarFallback className="bg-greenx-gradient text-white text-sm font-semibold">
              {getInitials(user?.displayName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">
              {user?.displayName}
            </p>
            <p className="text-xs text-slate-400 truncate">@{user?.username}</p>
          </div>
          <button
            onClick={() => signOut()}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            title="Đăng xuất"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Theme toggle */}
      <div className="px-5 py-3 border-t border-orange-100 flex items-center justify-between">
        <span className="text-xs text-slate-400 font-medium">Chế độ</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="h-8 w-8 rounded-lg hover:bg-orange-50 text-slate-500 hover:text-orange-600"
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex shrink-0">
        <Sidebar />
      </div>

      {/* Mobile drawer overlay */}
      {drawerOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setDrawerOpen(false)}
        >
          <div
            className="absolute left-0 top-0 bottom-0"
            onClick={(e) => e.stopPropagation()}
          >
            <Sidebar onClose={() => setDrawerOpen(false)} />
            <button
              className="absolute top-4 right-4 p-2 rounded-full bg-white shadow text-slate-500 hover:text-slate-700"
              onClick={() => setDrawerOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-orange-100 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDrawerOpen(true)}
            className="text-slate-600 hover:text-orange-600 hover:bg-orange-50"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <Link to="/" className="text-xl font-black flex-1">
            <span className="text-orange-500">G</span>
            <span className="text-orange-400">reenX</span>
          </Link>
          {/* Mobile notification badge */}
          {unreadCount > 0 && (
            <div className="relative">
              <Bell className="h-5 w-5 text-slate-500" />
              <span className="absolute -top-1.5 -right-1.5 bg-orange-500 text-white text-xs rounded-full h-4 min-w-4 px-1 flex items-center justify-center font-bold">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            </div>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
