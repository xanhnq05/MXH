// AdminLayout — enterprise style: sidebar thu gọn + topbar + main content
// Theme: dark sidebar (nhất quán ở cả light/dark mode cho branding), light/dark main area

import { useState, useEffect } from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router";
import {
  LayoutDashboard,
  Users,
  ShieldAlert,
  Flag,
  ImageIcon,
  BarChart3,
  Activity,
  Bell,
  Settings,
  LogOut,
  Moon,
  Sun,
  Search,
  ChevronDown,
  Menu,
  X,
  ExternalLink,
} from "lucide-react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useThemeStore } from "@/stores/useThemeStore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
} from "@/components/ui/dropdown-menu";
import { cn, initials } from "@/lib/utils";

type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | null;
  end?: boolean;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    title: "Tổng quan",
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
    ],
  },
  {
    title: "Người dùng",
    items: [
      { to: "/users", label: "Tất cả user", icon: Users },
      { to: "/users/banned", label: "Đang bị cấm", icon: ShieldAlert },
      { to: "/reports", label: "Báo cáo", icon: Flag },
    ],
  },
  {
    title: "Nội dung",
    items: [
      { to: "/media", label: "Sticker & GIF", icon: ImageIcon },
    ],
  },
  {
    title: "Phân tích",
    items: [
      { to: "/analytics", label: "Analytics", icon: BarChart3 },
      { to: "/audit", label: "Audit log", icon: Activity },
    ],
  },
  {
    title: "Hệ thống",
    items: [
      { to: "/notifications", label: "Gửi thông báo", icon: Bell },
      { to: "/settings", label: "Cấu hình", icon: Settings },
    ],
  },
];

const AdminLayout = () => {
  const { user, signOut } = useAuthStore();
  const { theme, toggle } = useThemeStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <aside
      className={cn(
        "flex h-full flex-col bg-sidebar text-sidebar-foreground transition-all duration-200",
        mobile ? "w-64" : sidebarCollapsed ? "w-16" : "w-60"
      )}
    >
      {/* Brand */}
      <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold">
          G
        </div>
        {(!sidebarCollapsed || mobile) && (
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold tracking-tight">GreenX</p>
            <p className="text-[10px] uppercase tracking-widest text-sidebar-foreground/60">
              Admin Console
            </p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 scrollbar-thin">
        {navGroups.map((group) => (
          <div key={group.title} className="mb-4">
            {(!sidebarCollapsed || mobile) && (
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/50">
                {group.title}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = item.end
                  ? location.pathname === item.to
                  : location.pathname === item.to ||
                    location.pathname.startsWith(item.to + "/");
                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      className={cn(
                        "group flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                        sidebarCollapsed && !mobile && "justify-center px-2"
                      )}
                      title={sidebarCollapsed ? item.label : undefined}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {(!sidebarCollapsed || mobile) && (
                        <>
                          <span className="flex-1 truncate">{item.label}</span>
                          {item.badge != null && item.badge > 0 && (
                            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-white">
                              {item.badge > 99 ? "99+" : item.badge}
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Sidebar footer */}
      <div className="border-t border-sidebar-border p-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSidebarCollapsed((v) => !v)}
          className={cn(
            "w-full text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
            sidebarCollapsed && "px-2"
          )}
        >
          {sidebarCollapsed ? "»" : "« Thu gọn"}
        </Button>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex shrink-0">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        >
          <div
            className="absolute left-0 top-0 bottom-0"
            onClick={(e) => e.stopPropagation()}
          >
            <Sidebar mobile />
            <button
              className="absolute top-3 right-3 p-1.5 rounded-md bg-sidebar-accent text-sidebar-foreground"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="flex h-14 items-center gap-3 border-b bg-card px-4 lg:px-6 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Search */}
          <div className="hidden md:flex flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm user, report, media..."
                className="pl-9 h-9"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.target as HTMLInputElement).value) {
                    navigate(
                      `/users?search=${encodeURIComponent(
                        (e.target as HTMLInputElement).value
                      )}`
                    );
                  }
                }}
              />
            </div>
          </div>
          <div className="flex-1 md:hidden" />

          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggle}
            title="Chuyển theme"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 h-9 px-2">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={user?.avatarUrl} />
                  <AvatarFallback>{initials(user?.displayName)}</AvatarFallback>
                </Avatar>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-semibold leading-tight">
                    {user?.displayName}
                  </p>
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    @{user?.username}
                  </p>
                </div>
                <ChevronDown className="h-3.5 w-3.5 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Tài khoản admin</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/settings")}>
                <Settings className="h-4 w-4" />
                Cấu hình
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  window.open(
                    import.meta.env.VITE_USER_FRONTEND_URL || "http://localhost:5173",
                    "_blank"
                  )
                }
              >
                <ExternalLink className="h-4 w-4" />
                Mở trang user
                <DropdownMenuShortcut>↗</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                destructive
                onClick={() => signOut()}
              >
                <LogOut className="h-4 w-4" />
                Đăng xuất
                <DropdownMenuShortcut>⇧Q</DropdownMenuShortcut>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-background scrollbar-thin">
          <div className="p-4 md:p-6 max-w-[1600px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
