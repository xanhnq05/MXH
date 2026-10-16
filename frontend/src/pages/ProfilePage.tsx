// ProfilePage — Redesign với theme cam GreenX + hiển thị country/city/school/workplace
import { useEffect, useState } from "react";
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
  Edit2,
  Loader2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/useAuthStore";
import { useLightbox } from "@/stores/useLightboxStore";
import { userService } from "@/services/user.service";
import { friendshipService } from "@/services/other.service";
import { toast } from "sonner";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { User } from "@/types/user";

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
    <div className="flex items-center gap-2 text-sm text-slate-600">
      <span className="text-orange-400">{icon}</span>
      <span>{value}</span>
    </div>
  );
};

const ProfilePage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: me } = useAuthStore();
  const { show: openLightbox } = useLightbox();
  const [profile, setProfile] = useState<User | null>(null);
  const [friendshipStatus, setFriendshipStatus] = useState<"none" | "pending" | "sent" | "friends">("none");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const targetId = userId || me?._id;
  const isMe = !userId || userId === me?._id;

  useEffect(() => {
    loadProfile();
  }, [targetId]);

  const loadProfile = async () => {
    if (!targetId && !isMe) return;
    try {
      setLoading(true);
      const p = isMe
        ? me
        : await userService.getById(targetId!);
      setProfile(p);
      if (!isMe) await checkFriendship();
    } catch (e) {
      toast.error("Không tải được hồ sơ");
    } finally {
      setLoading(false);
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

  if (loading || !profile) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="h-10 w-10 rounded-full border-2 border-orange-200 border-t-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-orange-50/30">
      <div className="max-w-2xl mx-auto">
        {/* Cover */}
        <div className="relative h-48 sm:h-56 bg-gradient-to-br from-orange-400 via-orange-300 to-amber-200 group">
          {profile.coverUrl ? (
            <button
              type="button"
              onClick={() => profile.coverUrl && openLightbox([profile.coverUrl], 0)}
              className="w-full h-full cursor-zoom-in"
            >
              <img
                src={profile.coverUrl}
                alt="cover"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                <span className="text-white text-xs font-medium bg-black/40 px-2.5 py-1 rounded-full">
                  Bấm để phóng to
                </span>
              </div>
            </button>
          ) : null}
          {/* Online badge */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full shadow-sm z-10">
            <span
              className={cn(
                "w-2 h-2 rounded-full",
                profile.isOnline ? "bg-green-500" : "bg-slate-400"
              )}
            />
            <span className="text-xs font-medium text-slate-700">
              {profile.isOnline ? "Đang online" : "Offline"}
            </span>
          </div>
          {isMe && (
            <button
              onClick={() => navigate("/profile/edit")}
              className="absolute top-3 right-3 inline-flex items-center gap-1.5 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm text-sm font-medium text-slate-700 hover:bg-white z-10"
            >
              <Edit2 className="h-3.5 w-3.5" />
              Sửa hồ sơ
            </button>
          )}
        </div>

        {/* Avatar + Name + Actions */}
        <div className="px-4 sm:px-6 -mt-14 relative">
          <button
            type="button"
            onClick={() => profile.avatarUrl && openLightbox([profile.avatarUrl], 0)}
            className="absolute -top-10 left-4 sm:left-6 rounded-full ring-4 ring-white shadow-lg overflow-hidden cursor-zoom-in group/avatar"
            aria-label="Phóng to ảnh đại diện"
          >
            <Avatar className="h-28 w-28">
              <AvatarImage src={profile.avatarUrl} alt={profile.displayName} />
              <AvatarFallback className="bg-greenx-gradient text-white text-3xl font-semibold">
                {getInitials(profile.displayName)}
              </AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 bg-black/0 group-hover/avatar:bg-black/20 transition flex items-center justify-center opacity-0 group-hover/avatar:opacity-100">
              <span className="text-white text-xs font-medium">Phóng to</span>
            </div>
          </button>

          <div className="ml-36 sm:ml-40 pt-2">
            {/* Họ tên */}
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              {profile.displayName}
            </h1>
            {/* Username */}
            <p className="text-slate-500 text-sm mt-0.5">@{profile.username}</p>
          </div>

          {/* Action buttons */}
          {!isMe && (
            <div className="flex gap-2 mt-3 ml-36 sm:ml-40">
              {friendshipStatus === "none" && (
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
              {friendshipStatus === "sent" && (
                <Button size="sm" variant="outline" disabled className="gap-1.5">
                  <Clock className="h-4 w-4" />
                  Đã gửi lời mời
                </Button>
              )}
              {friendshipStatus === "pending" && (
                <Button
                  size="sm"
                  onClick={handleAccept}
                  disabled={actionLoading}
                  className="bg-greenx-gradient hover:opacity-90 text-white"
                >
                  <UserCheck className="h-4 w-4 mr-1.5" />
                  Chấp nhận
                </Button>
              )}
              {friendshipStatus === "friends" && (
                <>
                  <Button size="sm" variant="outline" className="gap-1.5">
                    <MessageCircle className="h-4 w-4" />
                    Nhắn tin
                  </Button>
                  <Button size="sm" variant="outline" className="text-slate-600">
                    <UserCheck className="h-4 w-4 mr-1.5" />
                    Bạn bè
                  </Button>
                </>
              )}
            </div>
          )}
          {isMe && (
            <div className="flex gap-2 mt-3 ml-36 sm:ml-40">
              <Button
                size="sm"
                onClick={() => navigate("/profile/edit")}
                className="bg-greenx-gradient hover:opacity-90 text-white"
              >
                <Edit2 className="h-4 w-4 mr-1.5" />
                Sửa hồ sơ
              </Button>
            </div>
          )}
        </div>

        {/* Info cards */}
        <div className="px-4 sm:px-6 mt-5 space-y-3 pb-8">
          {/* Bio */}
          {profile.bio && (
            <div className="bg-white rounded-2xl border border-orange-100 p-4">
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{profile.bio}</p>
            </div>
          )}

          {/* Thông tin cơ bản */}
          <div className="bg-white rounded-2xl border border-orange-100 p-4 space-y-3">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <span className="w-5 h-5 rounded bg-orange-100 text-orange-500 flex items-center justify-center text-xs">ℹ</span>
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
                  value={profile.birthday}
                />
              )}
              {!profile.country && !profile.school && !profile.workplace && !profile.phone && !profile.birthday && (
                <p className="text-sm text-slate-400 italic">
                  {isMe ? "Thêm thông tin để bạn bè biết thêm về bạn" : "Chưa có thông tin"}
                </p>
              )}
            </div>
          </div>

          {/* Bài viết */}
          <div className="bg-white rounded-2xl border border-orange-100 p-4">
            <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <span className="w-5 h-5 rounded bg-orange-100 text-orange-500 flex items-center justify-center text-xs">📝</span>
              Bài viết
            </h3>
            <p className="text-sm text-slate-400 italic">Đang tải...</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
