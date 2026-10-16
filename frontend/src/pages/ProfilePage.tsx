// ProfilePage — Redesign 2026
// - Bỏ "đang online" badge
// - Dời nút "Sửa hồ sơ" thành "Thay đổi ảnh bìa" overlay trên ảnh bìa (với cropper)
// - Render danh sách bài viết + bộ lọc (năm, người đăng, tag) + xóa bài
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  MapPin,
  GraduationCap,
  Building2,
  Globe2,
  Phone,
  Calendar,
  UserPlus,
  UserMinus,
  MessageCircle,
  UserCheck,
  Clock,
  Camera,
  ImagePlus,
  Loader2,
  Hash,
  CalendarRange,
  Search,
  X,
  Filter,
  Trash2,
  MoreVertical,
  Pencil,
  RotateCcw,
  ImageIcon,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import ImageCropper from "@/components/ui/ImageCropper";
import { useAuthStore } from "@/stores/useAuthStore";
import { useLightbox, type LightboxAction } from "@/stores/useLightboxStore";
import { userService } from "@/services/user.service";
import { friendshipService } from "@/services/other.service";
import { postService } from "@/services/post.service";
import { chatService } from "@/services/chat.service";
import { getSocket } from "@/lib/socket";
import { toast } from "sonner";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { cn, formatBirthday } from "@/lib/utils";
import type { User } from "@/types/user";
import type { Post } from "@/types/post";

const getInitials = (name?: string) =>
  (name || "?")
    .split(/\s+/)
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const InfoItem = ({
  icon,
  value,
  placeholder,
}: {
  icon: React.ReactNode;
  value?: string;
  placeholder?: string;
}) => {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
      <span className="text-orange-400">{icon}</span>
      <span>{value}</span>
    </div>
  );
};

const ProfilePage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: me, updateUser } = useAuthStore();
  const { showImage: openImageLightbox } = useLightbox();
  const [profile, setProfile] = useState<User | null>(null);
  const [friendshipStatus, setFriendshipStatus] = useState<"none" | "pending" | "sent" | "friends">("none");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Cover upload state
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperSrc, setCropperSrc] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Posts filter state
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [years, setYears] = useState<number[]>([]);
  const [tags, setTags] = useState<{ tag: string; count: number }[]>([]);
  const [filterYear, setFilterYear] = useState<string>("");
  const [filterTag, setFilterTag] = useState<string>("");
  const [filterAuthor, setFilterAuthor] = useState<string>("");
  const [filterAuthorInput, setFilterAuthorInput] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [deletePostId, setDeletePostId] = useState<string | null>(null);

  const targetId = userId || me?._id;
  const isMe = !userId || userId === me?._id;

  useEffect(() => {
    loadProfile();
  }, [targetId]);

  useEffect(() => {
    if (targetId) {
      loadPosts();
      loadMeta();
    }
  }, [targetId, filterYear, filterTag, filterAuthor]);

  // Realtime: khi có thông báo friend_request/accept từ user đang xem → refresh trạng thái
  useEffect(() => {
    if (isMe || !targetId) return;
    const socket = getSocket();
    if (!socket) return;
    const onNotif = (n: any) => {
      if (!n?.senderId) return;
      const senderId = typeof n.senderId === "object" ? n.senderId._id : n.senderId;
      if (senderId !== targetId) return;
      if (
        n.type === "friend_request" ||
        n.type === "friend_accept" ||
        n.type === "friend_reject" ||
        n.type === "friend_cancel"
      ) {
        checkFriendship();
      }
    };
    socket.on("notification:new", onNotif);
    return () => {
      socket.off("notification:new", onNotif);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetId, isMe]);

  const loadProfile = async () => {
    if (!targetId && !isMe) return;
    try {
      setLoading(true);
      const p = isMe ? me : await userService.getById(targetId!);
      setProfile(p);
      if (!isMe) await checkFriendship();
    } catch (e) {
      toast.error("Không tải được hồ sơ");
    } finally {
      setLoading(false);
    }
  };

  const loadMeta = async () => {
    try {
      const [y, t] = await Promise.all([
        postService.getUserYears(targetId!),
        postService.getUserTags(targetId!),
      ]);
      setYears(y || []);
      setTags(t || []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadPosts = async () => {
    try {
      setLoadingPosts(true);
      const data = await postService.listByUser(targetId!, {
        year: filterYear || undefined,
        tag: filterTag || undefined,
        authorId: filterAuthor || undefined,
      });
      setPosts(data.items || []);
    } catch (e) {
      toast.error("Không tải được bài viết");
    } finally {
      setLoadingPosts(false);
    }
  };

  const checkFriendship = async () => {
    if (!targetId) return;
    try {
      const [friends, sent, incoming] = await Promise.all([
        friendshipService.list(),
        friendshipService.sent(),
        friendshipService.incoming(),
      ]);
      if (friends.some((f: any) => f.friend._id === targetId)) {
        setFriendshipStatus("friends");
      } else if (sent.some((s: any) => s.recipient._id === targetId)) {
        setFriendshipStatus("sent");
      } else if (incoming.some((i: any) => i.requester._id === targetId)) {
        setFriendshipStatus("pending");
      } else {
        setFriendshipStatus("none");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddFriend = async () => {
    if (!targetId) return;
    setActionLoading(true);
    try {
      await friendshipService.sendRequest(targetId);
      setFriendshipStatus("sent");
      toast.success("Đã gửi lời mời kết bạn");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Lỗi");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!targetId) return;
    setActionLoading(true);
    try {
      await friendshipService.accept(targetId);
      setFriendshipStatus("friends");
      toast.success("Đã chấp nhận lời mời kết bạn");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Lỗi");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!targetId) return;
    setActionLoading(true);
    try {
      await friendshipService.reject(targetId);
      setFriendshipStatus("none");
      toast.success("Đã từ chối lời mời");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Lỗi");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!targetId) return;
    setActionLoading(true);
    try {
      await friendshipService.cancel(targetId);
      setFriendshipStatus("none");
      toast.success("Đã huỷ lời mời");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Lỗi");
    } finally {
      setActionLoading(false);
    }
  };

  const handleMessage = async () => {
    if (!targetId) return;
    setActionLoading(true);
    try {
      // getOrCreateDirect đảm bảo 1 conv p2p duy nhất giữa 2 user
      const conv = await chatService.getOrCreateDirect(targetId);
      navigate(`/chat/${conv._id}`);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Không thể mở cuộc trò chuyện");
    } finally {
      setActionLoading(false);
    }
  };

  // === Cover upload ===
  const handleCoverClick = () => {
    if (!isMe) return;
    coverInputRef.current?.click();
  };

  const handleCoverFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Ảnh bìa tối đa 8MB");
      return;
    }
    setCropperSrc(URL.createObjectURL(file));
    setCropperOpen(true);
    if (coverInputRef.current) coverInputRef.current.value = "";
  };

  const handleCoverCrop = async (blob: Blob) => {
    setCropperOpen(false);
    setCropperSrc(null);
    const file = new File([blob], "cover.jpg", { type: "image/jpeg" });
    setUploadingCover(true);
    try {
      const updated = await userService.uploadCover(file);
      updateUser(updated);
      setProfile((p) => (p ? { ...p, coverUrl: updated.coverUrl } : p));
      toast.success("Đã cập nhật ảnh bìa");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Upload thất bại");
    } finally {
      setUploadingCover(false);
    }
  };

  /** Xóa ảnh bìa → về mặc định */
  const handleRemoveCover = async () => {
    if (!profile?.coverUrl) return;
    try {
      const updated = await userService.removeCover();
      updateUser(updated);
      setProfile((p) => (p ? { ...p, coverUrl: undefined, coverId: undefined } : p));
      toast.success("Đã xóa ảnh bìa, về mặc định");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Không thể xóa");
    }
  };

  /** Xóa ảnh đại diện → về mặc định */
  const handleRemoveAvatar = async () => {
    if (!profile?.avatarUrl) return;
    try {
      const updated = await userService.removeAvatar();
      updateUser(updated);
      setProfile((p) => (p ? { ...p, avatarUrl: undefined, avatarId: undefined } : p));
      toast.success("Đã xóa ảnh đại diện, về mặc định");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Không thể xóa");
    }
  };

  const handleDeletePost = async () => {
    if (!deletePostId) return;
    try {
      await postService.remove(deletePostId);
      setPosts((prev) => prev.filter((p) => p._id !== deletePostId));
      toast.success("Đã xóa bài viết");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Không thể xóa");
    } finally {
      setDeletePostId(null);
    }
  };

  const clearFilters = () => {
    setFilterYear("");
    setFilterTag("");
    setFilterAuthor("");
    setFilterAuthorInput("");
  };

  const hasActiveFilter = !!(filterYear || filterTag || filterAuthor);

  if (loading || !profile) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="h-10 w-10 rounded-full border-2 border-orange-200 border-t-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-orange-50/30 dark:bg-slate-950">
      {/* ============ Cover — full width, cao hơn ============ */}
      <div className="relative w-full h-44 sm:h-64 md:h-80 lg:h-96 bg-gradient-to-br from-orange-400 via-orange-300 to-amber-200 overflow-hidden">
        {profile.coverUrl ? (
          <button
            type="button"
            onClick={() => {
              if (!profile.coverUrl) return;
              const actions: LightboxAction[] = isMe
                ? [
                    {
                      label: "Thay đổi ảnh bìa",
                      icon: <Camera className="h-4 w-4" />,
                      onClick: () => {
                        // mở file picker (dùng ref)
                        coverInputRef.current?.click();
                      },
                    },
                    {
                      label: "Xóa ảnh bìa, về mặc định",
                      icon: <RotateCcw className="h-4 w-4" />,
                      variant: "danger",
                      onClick: handleRemoveCover,
                    },
                  ]
                : [];
              openImageLightbox(profile.coverUrl, {
                title: "Ảnh bìa",
                actions,
              });
            }}
            className="block w-full h-full cursor-zoom-in"
            aria-label="Phóng to ảnh bìa"
          >
            <img
              src={profile.coverUrl}
              alt="cover"
              className="w-full h-full object-cover"
            />
          </button>
        ) : isMe ? (
          <button
            type="button"
            onClick={() => coverInputRef.current?.click()}
            className="absolute inset-0 flex items-center justify-center text-orange-700 hover:bg-white/10 transition"
          >
            <div className="flex flex-col items-center gap-2 text-orange-800/70">
              <ImageIcon className="h-10 w-10" />
              <span className="text-sm font-medium">Thêm ảnh bìa</span>
            </div>
          </button>
        ) : null}

        {/* gradient overlay tăng chiều sâu */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/0 to-black/0 pointer-events-none" />

        {/* Hidden file input (cho cả 2 trigger: lightbox menu + click trống) */}
        <input
          ref={coverInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={handleCoverFile}
        />
      </div>

      {/* ============ Avatar + Name + Actions (cùng hàng ngang) ============ */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:gap-6 -mt-12 sm:-mt-10 relative z-10">
          {/* Avatar — nằm dưới, hơi overlap nhẹ */}
          <button
            type="button"
            onClick={() => {
              if (!profile.avatarUrl) return;
              const actions: LightboxAction[] = isMe
                ? [
                    {
                      label: "Thay đổi ảnh đại diện",
                      icon: <Camera className="h-4 w-4" />,
                      onClick: () => {
                        // Tạm thời: trigger cùng picker, sau này tách ref nếu cần
                        coverInputRef.current?.click();
                      },
                    },
                    {
                      label: "Xóa ảnh đại diện, về mặc định",
                      icon: <RotateCcw className="h-4 w-4" />,
                      variant: "danger",
                      onClick: handleRemoveAvatar,
                    },
                  ]
                : [];
              openImageLightbox(profile.avatarUrl, {
                title: "Ảnh đại diện",
                actions,
              });
            }}
            className="shrink-0 self-start rounded-full ring-4 ring-orange-50 dark:ring-slate-950 shadow-xl overflow-hidden cursor-zoom-in bg-white dark:bg-slate-900"
            aria-label="Phóng to ảnh đại diện"
          >
            <Avatar className="h-24 w-24 sm:h-32 sm:w-32 md:h-40 md:w-40">
              <AvatarImage src={profile.avatarUrl} alt={profile.displayName} />
              <AvatarFallback className="bg-greenx-gradient text-white text-3xl sm:text-4xl md:text-5xl font-semibold">
                {getInitials(profile.displayName)}
              </AvatarFallback>
            </Avatar>
          </button>

          {/* Name + Action buttons — cùng hàng ngang */}
          <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-1 sm:pl-2 mt-2 sm:mt-0">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 dark:text-white truncate">
                {profile.displayName}
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5 truncate">
                @{profile.username}
              </p>
            </div>

            {/* Action buttons ngang hàng với avatar + tên */}
            <div className="flex flex-wrap gap-2 shrink-0 sm:justify-end">
              {isMe && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate("/profile/edit")}
                  className="gap-1.5 border-orange-200 dark:border-slate-700 text-slate-700 dark:text-white hover:bg-orange-50 dark:hover:bg-slate-800 hover:text-orange-600 dark:hover:text-orange-400 dark:bg-slate-950"
                >
                  <Pencil className="h-4 w-4" />
                  Sửa thông tin
                </Button>
              )}
              {!isMe && friendshipStatus === "none" && (
                <Button
                  size="sm"
                  onClick={handleAddFriend}
                  disabled={actionLoading}
                  className="bg-greenx-gradient hover:opacity-90 text-white"
                >
                  {actionLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UserPlus className="h-4 w-4" />
                  )}
                  <span className="ml-1.5">Kết bạn</span>
                </Button>
              )}
              {!isMe && friendshipStatus === "sent" && (
                <>
                  <Button size="sm" variant="outline" disabled className="gap-1.5 dark:bg-slate-950 dark:text-white dark:border-slate-700">
                    <Clock className="h-4 w-4" />
                    Đã gửi lời mời
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={actionLoading}
                    className="gap-1.5 border-orange-200 dark:border-slate-700 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-slate-800 dark:bg-slate-950"
                  >
                    {actionLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <X className="h-4 w-4" />
                    )}
                    <span className="ml-1.5">Huỷ yêu cầu</span>
                  </Button>
                </>
              )}
              {!isMe && friendshipStatus === "pending" && (
                <>
                  <Button
                    size="sm"
                    onClick={handleAccept}
                    disabled={actionLoading}
                    className="bg-greenx-gradient hover:opacity-90 text-white"
                  >
                    <UserCheck className="h-4 w-4 mr-1.5" />
                    Chấp nhận
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleReject}
                    disabled={actionLoading}
                    className="gap-1.5 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-950"
                  >
                    <X className="h-4 w-4 mr-1.5" />
                    Từ chối
                  </Button>
                </>
              )}
              {!isMe && friendshipStatus === "friends" && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleMessage}
                    disabled={actionLoading}
                    className="gap-1.5 dark:bg-slate-950 dark:text-white dark:border-slate-700"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Nhắn tin
                  </Button>
                  <Button size="sm" variant="outline" className="text-slate-600 dark:text-slate-300 dark:bg-slate-950 dark:border-slate-700">
                    <UserCheck className="h-4 w-4 mr-1.5" />
                    Bạn bè
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ============ Bio — nằm dưới hoàn toàn header (avatar + tên + actions) ============ */}
        {profile.bio && (
          <div className="mt-3">
            <p className="text-[15px] text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
              {profile.bio}
            </p>
          </div>
        )}

        {/* ============ Info + Posts ============ */}
        <div className="mt-6 space-y-4 pb-8">
          {/* ============ Thông tin ============ */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-orange-100 dark:border-slate-800 p-5 space-y-4">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center text-sm">
                ℹ
              </span>
              Thông tin
            </h3>
            <div className="space-y-2.5">
              {profile.country && (
                <InfoItem
                  icon={<Globe2 className="h-4 w-4" />}
                  value={`${profile.country}${profile.city ? ` · ${profile.city}` : ""}`}
                />
              )}
              {profile.school && (
                <InfoItem
                  icon={<GraduationCap className="h-4 w-4" />}
                  value={profile.school}
                />
              )}
              {profile.workplace && (
                <InfoItem
                  icon={<Building2 className="h-4 w-4" />}
                  value={profile.workplace}
                />
              )}
              {profile.phone && (
                <InfoItem
                  icon={<Phone className="h-4 w-4" />}
                  value={profile.phone}
                />
              )}
              {profile.birthday && (
                <InfoItem
                  icon={<Calendar className="h-4 w-4" />}
                  value={formatBirthday(profile.birthday)}
                />
              )}
              {!profile.country && !profile.school && !profile.workplace && !profile.phone && !profile.birthday && (
                <p className="text-sm text-slate-400 italic">
                  {isMe ? "Thêm thông tin để bạn bè biết thêm về bạn" : "Chưa có thông tin"}
                </p>
              )}
            </div>
          </div>

          {/* ============== Posts Manager ============== */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-orange-100 dark:border-slate-800 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center text-sm">
                  📝
                </span>
                Bài viết
                {posts.length > 0 && (
                  <span className="text-sm text-slate-400 dark:text-slate-500 font-normal">({posts.length})</span>
                )}
              </h3>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowFilters((s) => !s)}
                className={cn(
                  "h-8 text-xs gap-1.5 dark:bg-slate-950 dark:border-slate-700 dark:text-slate-200",
                  hasActiveFilter && "border-orange-300 dark:border-orange-500/50 text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-500/20"
                )}
              >
                <Filter className="h-3.5 w-3.5" />
                Lọc
                {hasActiveFilter && (
                  <span className="ml-1 bg-orange-500 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center">
                    {[filterYear, filterTag, filterAuthor].filter(Boolean).length}
                  </span>
                )}
              </Button>
            </div>

            {/* Bộ lọc */}
            {showFilters && (
              <div className="mb-4 p-3 bg-orange-50/50 dark:bg-slate-800/50 rounded-xl border border-orange-100 dark:border-slate-700 space-y-3">
                {/* Lọc theo năm */}
                {years.length > 0 && (
                  <div>
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1.5 mb-1.5">
                      <CalendarRange className="h-3.5 w-3.5" />
                      Theo năm
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => setFilterYear("")}
                        className={cn(
                          "px-2.5 py-1 text-xs rounded-full border transition",
                          !filterYear
                            ? "bg-orange-500 text-white border-orange-500"
                            : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-orange-300"
                        )}
                      >
                        Tất cả
                      </button>
                      {years.map((y) => (
                        <button
                          key={y}
                          onClick={() => setFilterYear(String(y))}
                          className={cn(
                            "px-2.5 py-1 text-xs rounded-full border transition",
                            filterYear === String(y)
                              ? "bg-orange-500 text-white border-orange-500"
                              : "bg-white text-slate-600 border-slate-200 hover:border-orange-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:border-orange-500"
                          )}
                        >
                          {y}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Lọc theo người đăng (chỉ áp dụng khi xem profile mình) */}
                {isMe && (
                  <div>
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1.5 mb-1.5">
                      <Search className="h-3.5 w-3.5" />
                      Theo người đăng (mình)
                    </label>
                    <input
                      type="text"
                      value={filterAuthorInput}
                      onChange={(e) => setFilterAuthorInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          setFilterAuthor(filterAuthorInput.trim());
                        }
                      }}
                      placeholder="@username hoặc tên..."
                      className="w-full h-8 px-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg focus:border-orange-400 focus:ring-2 focus:ring-orange-100 dark:focus:ring-orange-500/30 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Nhấn Enter để áp dụng. Bỏ trống = tất cả bài của bạn.
                    </p>
                  </div>
                )}

                {/* Lọc theo tag */}
                {tags.length > 0 && (
                  <div>
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1.5 mb-1.5">
                      <Hash className="h-3.5 w-3.5" />
                      Được gắn thẻ
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => setFilterTag("")}
                        className={cn(
                          "px-2.5 py-1 text-xs rounded-full border transition",
                          !filterTag
                            ? "bg-orange-500 text-white border-orange-500"
                            : "bg-white text-slate-600 border-slate-200 hover:border-orange-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:border-orange-500"
                        )}
                      >
                        Tất cả
                      </button>
                      {tags.map((t) => (
                        <button
                          key={t.tag}
                          onClick={() => setFilterTag(t.tag)}
                          className={cn(
                            "px-2.5 py-1 text-xs rounded-full border transition",
                            filterTag === t.tag
                              ? "bg-orange-500 text-white border-orange-500"
                              : "bg-white text-slate-600 border-slate-200 hover:border-orange-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:border-orange-500"
                          )}
                        >
                          #{t.tag}
                          <span className="ml-1 opacity-60">{t.count}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {hasActiveFilter && (
                  <button
                    onClick={clearFilters}
                    className="text-xs text-orange-600 hover:underline flex items-center gap-1"
                  >
                    <X className="h-3 w-3" />
                    Xóa bộ lọc
                  </button>
                )}
              </div>
            )}

            {/* Danh sách bài viết */}
            {loadingPosts ? (
              <div className="flex justify-center py-6">
                <div className="h-6 w-6 rounded-full border-2 border-orange-200 border-t-orange-500 animate-spin" />
              </div>
            ) : posts.length === 0 ? (
              <p className="text-sm text-slate-400 italic py-4 text-center">
                {hasActiveFilter ? "Không có bài viết nào khớp bộ lọc" : "Chưa có bài viết nào"}
              </p>
            ) : (
              <div className="space-y-3">
                {posts.map((p) => (
                  <ProfilePostItem
                    key={p._id}
                    post={p}
                    canDelete={isMe}
                    onDelete={() => setDeletePostId(p._id)}
                    onOpen={() => navigate(`/posts/${p._id}`)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cropper ảnh bìa */}
      {cropperOpen && cropperSrc && (
        <ImageCropper
          imageSrc={cropperSrc}
          aspectRatio={3}
          title="Cắt ảnh bìa"
          onConfirm={handleCoverCrop}
          onCancel={() => {
            setCropperOpen(false);
            setCropperSrc(null);
          }}
        />
      )}

      {/* Dialog xác nhận xóa bài viết */}
      <Dialog open={!!deletePostId} onOpenChange={(o) => !o && setDeletePostId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Xóa bài viết?
            </DialogTitle>
            <DialogDescription>
              Bài viết sẽ bị xóa và không thể khôi phục. Bình luận sẽ vẫn còn
              nhưng nội dung sẽ bị ẩn.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletePostId(null)}>
              Huỷ
            </Button>
            <Button
              onClick={handleDeletePost}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// === Sub-component: 1 bài viết trong danh sách profile ===
const ProfilePostItem = ({
  post,
  canDelete,
  onDelete,
  onOpen,
}: {
  post: Post;
  canDelete: boolean;
  onDelete: () => void;
  onOpen: () => void;
}) => {
  const [showMenu, setShowMenu] = useState(false);
  return (
    <div className="border border-orange-100 rounded-xl p-3 hover:border-orange-200 hover:shadow-sm transition-all group">
      <p className="text-sm text-slate-800 whitespace-pre-wrap line-clamp-3 mb-2">
        {post.content}
      </p>
      {post.media.length > 0 && (
        <div className="grid grid-cols-3 gap-1 mb-2">
          {post.media.slice(0, 3).map((m, i) => (
            <div key={i} className="aspect-square bg-slate-100 dark:bg-slate-800 rounded-md overflow-hidden">
              <img src={m.url} alt="" className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      )}
      {post.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {post.tags.slice(0, 3).map((t) => (
            <span key={t} className="text-[10px] text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-500/20 px-1.5 py-0.5 rounded">
              #{t}
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>{format(new Date(post.createdAt), "dd/MM/yyyy HH:mm", { locale: vi })}</span>
        <div className="flex items-center gap-2">
          <span>♥ {post.likeCount}</span>
          <span>💬 {post.commentCount}</span>
          <button
            onClick={onOpen}
            className="text-orange-600 hover:underline ml-1"
          >
            Mở
          </button>
          {canDelete && (
            <div className="relative">
              <button
                onClick={() => setShowMenu((s) => !s)}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-white"
              >
                ⋯
              </button>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-20 min-w-[120px]">
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        onDelete();
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 flex items-center gap-1.5"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Xóa bài viết
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
