// FriendsPage - Redesign theo theme cam GreenX
// Layout:
//   - Tabs ngang: Tất cả | Gợi ý | Lời mời | Đã gửi
//   - Mỗi tab là 1 list dọc: avatar + tên + lý do gợi ý + nút hành động
//   - 3-dot menu ở mỗi row: Xem hồ sơ, Nhắn tin, Hủy kết bạn
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  UserPlus,
  UserCheck,
  X,
  MoreHorizontal,
  UserMinus,
  MessageCircle,
  Eye,
  Check,
  Clock,
  Search,
  Sparkles,
  Users,
  Send,
  GraduationCap,
  Building2,
  MapPin,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { friendshipService } from "@/services/other.service";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface FriendItem {
  friendshipId?: string;
  friend?: any;
  _id?: string;
  requester?: any;
  recipient?: any;
  createdAt?: string;
  updatedAt?: string;
  since?: string;
}

interface SuggestionItem {
  user: any;
  reason: string;
  reasonType: "mutual" | "country" | "city" | "school" | "workplace" | "newUser";
  mutualCount: number;
  sourceUsers: any[];
}

const SuggestionIcon = ({ type }: { type: SuggestionItem["reasonType"] }) => {
  const cls = "h-3 w-3";
  switch (type) {
    case "mutual":
      return <Users className={cls} />;
    case "country":
      return <MapPin className={cls} />;
    case "city":
      return <MapPin className={cls} />;
    case "school":
      return <GraduationCap className={cls} />;
    case "workplace":
      return <Building2 className={cls} />;
    default:
      return <Sparkles className={cls} />;
  }
};

/** Format thời gian kiểu "5 phút trước" */
const formatRelative = (iso?: string) => {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "Vừa xong";
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} ngày trước`;
  return new Date(iso).toLocaleDateString("vi-VN");
};

const getInitials = (name?: string) =>
  (name || "?")
    .split(/\s+/)
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const FriendsPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("all");
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [incoming, setIncoming] = useState<FriendItem[]>([]);
  const [sent, setSent] = useState<FriendItem[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [searchQ, setSearchQ] = useState("");
  const [loading, setLoading] = useState(false);
  // Tracking id đang pending (để disable nút trong lúc gọi API)
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  const load = async () => {
    setLoading(true);
    try {
      const [f, i, s, sg] = await Promise.all([
        friendshipService.list(),
        friendshipService.incoming(),
        friendshipService.sent(),
        friendshipService.suggestions(20).catch(() => []),
      ]);
      setFriends(f);
      setIncoming(i);
      setSent(s);
      setSuggestions(sg);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const markPending = (id: string, on: boolean) => {
    setPendingIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  // ====== Actions ======
  const handleSendRequest = async (userId: string) => {
    markPending(userId, true);
    try {
      await friendshipService.sendRequest(userId);
      toast.success("Đã gửi lời mời kết bạn");
      // Move từ suggestions → sent
      setSuggestions((prev) => prev.filter((s) => s.user._id !== userId));
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Lỗi");
    } finally {
      markPending(userId, false);
    }
  };

  const handleAccept = async (userId: string) => {
    markPending(userId, true);
    try {
      await friendshipService.accept(userId);
      toast.success("Đã chấp nhận lời mời");
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Lỗi");
    } finally {
      markPending(userId, false);
    }
  };

  const handleReject = async (userId: string) => {
    markPending(userId, true);
    try {
      await friendshipService.reject(userId);
      toast.success("Đã từ chối");
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Lỗi");
    } finally {
      markPending(userId, false);
    }
  };

  const handleCancel = async (userId: string) => {
    markPending(userId, true);
    try {
      await friendshipService.cancel(userId);
      toast.success("Đã huỷ lời mời");
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Lỗi");
    } finally {
      markPending(userId, false);
    }
  };

  const handleUnfriend = async (userId: string) => {
    if (!confirm("Bạn có chắc muốn hủy kết bạn?")) return;
    markPending(userId, true);
    try {
      await friendshipService.unfriend(userId);
      toast.success("Đã hủy kết bạn");
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Lỗi");
    } finally {
      markPending(userId, false);
    }
  };

  const handleMessage = (userId: string) => {
    navigate(`/messages?userId=${userId}`);
  };

  const handleViewProfile = (userId: string) => {
    navigate(`/profile/${userId}`);
  };

  // Filter
  const filterByQuery = (name: string) =>
    !searchQ ||
    name?.toLowerCase().includes(searchQ.toLowerCase()) ||
    name?.toLowerCase().includes(searchQ.toLowerCase());

  const filteredFriends = friends.filter((f) =>
    filterByQuery(f.friend?.displayName)
  );
  const filteredIncoming = incoming.filter((r) =>
    filterByQuery(r.requester?.displayName)
  );
  const filteredSent = sent.filter((r) =>
    filterByQuery(r.recipient?.displayName)
  );
  const filteredSuggestions = suggestions.filter((s) =>
    filterByQuery(s.user?.displayName)
  );

  // ============== RENDER ==============
  return (
    <div className="h-full overflow-y-auto bg-orange-50/30">
      <div className="max-w-3xl mx-auto p-4 sm:p-6">
        {/* Header */}
        <div className="mb-5">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Bạn bè</h1>
          <p className="text-sm text-slate-500 mt-1">
            Quản lý bạn bè, lời mời và gợi ý kết bạn
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            placeholder="Tìm theo tên, username, email..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-orange-200 bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none text-sm transition"
          />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full bg-white border border-orange-100 p-1 rounded-2xl mb-4 grid grid-cols-4 gap-1">
            <TabsTrigger
              value="all"
              className={cn(
                "rounded-xl text-sm font-medium py-2 transition-all",
                "data-[state=active]:bg-greenx-gradient data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:font-semibold",
                "text-slate-500 data-[state=inactive]:hover:bg-orange-50"
              )}
            >
              Tất cả ({friends.length})
            </TabsTrigger>
            <TabsTrigger
              value="suggestions"
              className={cn(
                "rounded-xl text-sm font-medium py-2 transition-all",
                "data-[state=active]:bg-greenx-gradient data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:font-semibold",
                "text-slate-500 data-[state=inactive]:hover:bg-orange-50"
              )}
            >
              Gợi ý ({suggestions.length})
            </TabsTrigger>
            <TabsTrigger
              value="incoming"
              className={cn(
                "rounded-xl text-sm font-medium py-2 transition-all",
                "data-[state=active]:bg-greenx-gradient data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:font-semibold",
                "text-slate-500 data-[state=inactive]:hover:bg-orange-50"
              )}
            >
              Lời mời ({incoming.length})
            </TabsTrigger>
            <TabsTrigger
              value="sent"
              className={cn(
                "rounded-xl text-sm font-medium py-2 transition-all",
                "data-[state=active]:bg-greenx-gradient data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:font-semibold",
                "text-slate-500 data-[state=inactive]:hover:bg-orange-50"
              )}
            >
              Đã gửi ({sent.length})
            </TabsTrigger>
          </TabsList>

          {/* =================== TẤT CẢ BẠN BÈ =================== */}
          <TabsContent value="all" className="space-y-2">
            {loading ? (
              <EmptyHint loading />
            ) : filteredFriends.length === 0 ? (
              <EmptyHint
                icon={<Users className="h-10 w-10" />}
                title="Chưa có bạn bè nào"
                description="Hãy bắt đầu kết bạn để xem danh sách ở đây"
              />
            ) : (
              filteredFriends.map((f) => (
                <FriendRow
                  key={f.friendshipId}
                  user={f.friend}
                  meta={formatRelative(f.since as any)}
                  actions={
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className="p-2 rounded-full hover:bg-orange-100 text-slate-500 hover:text-orange-600"
                          aria-label="Tùy chọn"
                        >
                          <MoreHorizontal className="h-5 w-5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => handleViewProfile(f.friend._id)}>
                          <Eye className="h-4 w-4 mr-2" /> Xem hồ sơ
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleMessage(f.friend._id)}>
                          <MessageCircle className="h-4 w-4 mr-2" /> Nhắn tin
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleUnfriend(f.friend._id)}
                          className="text-red-600 focus:text-red-600"
                        >
                          <UserMinus className="h-4 w-4 mr-2" /> Hủy kết bạn
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  }
                />
              ))
            )}
          </TabsContent>

          {/* =================== GỢI Ý =================== */}
          <TabsContent value="suggestions" className="space-y-2">
            {loading ? (
              <EmptyHint loading />
            ) : filteredSuggestions.length === 0 ? (
              <EmptyHint
                icon={<Sparkles className="h-10 w-10" />}
                title="Chưa có gợi ý"
                description="Hãy kết bạn thêm để nhận gợi ý phù hợp"
              />
            ) : (
              filteredSuggestions.map((s) => (
                <FriendRow
                  key={s.user._id}
                  user={s.user}
                  meta={
                    <span className="inline-flex items-center gap-1 text-slate-500">
                      <SuggestionIcon type={s.reasonType} /> {s.reason}
                    </span>
                  }
                  actions={
                    <Button
                      size="sm"
                      disabled={pendingIds.has(s.user._id)}
                      onClick={() => handleSendRequest(s.user._id)}
                      className="bg-greenx-gradient hover:opacity-90 text-white gap-1.5"
                    >
                      <UserPlus className="h-4 w-4" /> Kết bạn
                    </Button>
                  }
                />
              ))
            )}
          </TabsContent>

          {/* =================== LỜI MỜI =================== */}
          <TabsContent value="incoming" className="space-y-2">
            {loading ? (
              <EmptyHint loading />
            ) : filteredIncoming.length === 0 ? (
              <EmptyHint
                icon={<UserPlus className="h-10 w-10" />}
                title="Không có lời mời nào"
                description="Các lời mời kết bạn sẽ hiện ở đây"
              />
            ) : (
              filteredIncoming.map((req) => (
                <FriendRow
                  key={req._id}
                  user={req.requester}
                  meta={
                    <span className="inline-flex items-center gap-1 text-slate-500">
                      <Clock className="h-3 w-3" /> {formatRelative(req.createdAt)}
                    </span>
                  }
                  actions={
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        disabled={pendingIds.has(req.requester._id)}
                        onClick={() => handleAccept(req.requester._id)}
                        className="bg-greenx-gradient hover:opacity-90 text-white"
                      >
                        <Check className="h-4 w-4 mr-1" /> Xác nhận
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pendingIds.has(req.requester._id)}
                        onClick={() => handleReject(req.requester._id)}
                        className="border-slate-200 hover:bg-slate-50"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  }
                />
              ))
            )}
          </TabsContent>

          {/* =================== ĐÃ GỬI =================== */}
          <TabsContent value="sent" className="space-y-2">
            {loading ? (
              <EmptyHint loading />
            ) : filteredSent.length === 0 ? (
              <EmptyHint
                icon={<Send className="h-10 w-10" />}
                title="Chưa gửi lời mời nào"
                description="Các lời mời bạn đã gửi sẽ hiện ở đây"
              />
            ) : (
              filteredSent.map((req) => (
                <FriendRow
                  key={req._id}
                  user={req.recipient}
                  meta={
                    <span className="inline-flex items-center gap-1 text-slate-500">
                      <Clock className="h-3 w-3" /> {formatRelative(req.createdAt)}
                    </span>
                  }
                  actions={
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pendingIds.has(req.recipient._id)}
                      onClick={() => handleCancel(req.recipient._id)}
                      className="border-orange-200 text-orange-600 hover:bg-orange-50"
                    >
                      Huỷ yêu cầu
                    </Button>
                  }
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// ============== Sub components ==============
const FriendRow = ({
  user,
  meta,
  actions,
}: {
  user: any;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
}) => {
  if (!user) return null;
  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 sm:p-4 bg-white rounded-2xl border border-orange-100",
        "hover:border-orange-200 hover:shadow-sm transition-all"
      )}
    >
      <Link to={`/profile/${user._id}`} className="shrink-0">
        <Avatar className="h-12 w-12 sm:h-14 sm:w-14 ring-2 ring-orange-100">
          <AvatarImage src={user.avatarUrl} alt={user.displayName} />
          <AvatarFallback className="bg-greenx-gradient text-white font-semibold">
            {getInitials(user.displayName)}
          </AvatarFallback>
        </Avatar>
      </Link>
      <div className="flex-1 min-w-0">
        <Link to={`/profile/${user._id}`} className="block">
          <p className="font-semibold text-slate-900 truncate hover:text-orange-600">
            {user.displayName || user.username}
          </p>
        </Link>
        {meta && <div className="text-xs mt-0.5 truncate">{meta}</div>}
      </div>
      <div className="shrink-0 flex items-center gap-1">{actions}</div>
    </div>
  );
};

const EmptyHint = ({
  icon,
  title,
  description,
  loading,
}: {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  loading?: boolean;
}) => (
  <div className="text-center py-16 px-4 bg-white rounded-2xl border border-orange-100">
    {loading ? (
      <div className="flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-orange-200 border-t-orange-500 animate-spin" />
      </div>
    ) : (
      <>
        {icon && (
          <div className="w-16 h-16 mx-auto rounded-2xl bg-orange-50 flex items-center justify-center text-orange-400 mb-3">
            {icon}
          </div>
        )}
        {title && <p className="font-semibold text-slate-900">{title}</p>}
        {description && (
          <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto">
            {description}
          </p>
        )}
      </>
    )}
  </div>
);

export default FriendsPage;
