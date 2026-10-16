import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuthStore } from "@/stores/useAuthStore";
import { chatService } from "@/services/chat.service";
import { userService } from "@/services/user.service";
import { toast } from "sonner";
import {
  ArrowLeft,
  Crown,
  Shield,
  User as UserIcon,
  UserMinus,
  VolumeX,
  Volume2,
  Pin,
  Trash2,
  UserPlus,
  LogOut,
} from "lucide-react";
import type { Conversation, Member, User } from "@/types/message";

const GroupSettingsPage = () => {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { user: me } = useAuthStore();
  const [conv, setConv] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);

  useEffect(() => {
    if (!conversationId) return;
    loadConv();
  }, [conversationId]);

  const loadConv = async () => {
    try {
      setLoading(true);
      const c = await chatService.getConversation(conversationId!);
      setConv(c);
      setName(c.name || "");
    } catch (e: any) {
      toast.error("Không tải được hội thoại");
    } finally {
      setLoading(false);
    }
  };

  const meMember = conv?.members.find((m) => {
    const uid = typeof m.userId === "object" ? m.userId._id : m.userId;
    return uid === me?._id;
  });
  const myRole = meMember?.role;
  const isAdmin = myRole === "owner" || myRole === "admin";

  const handleSaveName = async () => {
    if (!conv || !name.trim()) return;
    try {
      setSavingName(true);
      const updated = await chatService.updateGroup(conv._id, { name: name.trim() });
      setConv(updated);
      toast.success("Đã cập nhật tên nhóm");
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Lỗi");
    } finally {
      setSavingName(false);
    }
  };

  const handleLeave = async () => {
    if (!conv) return;
    try {
      const r = await chatService.leaveGroup(conv._id);
      toast.success(r.deleted ? "Đã xoá nhóm" : "Đã rời nhóm");
      navigate("/chat");
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Lỗi");
    }
  };

  const handleDelete = async () => {
    if (!conv) return;
    try {
      await chatService.deleteGroup(conv._id);
      toast.success("Đã xoá nhóm");
      navigate("/chat");
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Lỗi");
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!conv) return;
    try {
      await chatService.removeMember(conv._id, userId);
      setConv({
        ...conv,
        members: conv.members.filter((m) => {
          const uid = typeof m.userId === "object" ? m.userId._id : m.userId;
          return uid !== userId;
        }),
      });
      toast.success("Đã xoá thành viên");
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Lỗi");
    } finally {
      setMemberToRemove(null);
    }
  };

  const handleChangeRole = async (userId: string, newRole: "admin" | "member") => {
    if (!conv) return;
    try {
      const updated = await chatService.changeRole(conv._id, userId, newRole);
      setConv(updated);
      toast.success("Đã cập nhật vai trò");
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Lỗi");
    }
  };

  const handleSetNickname = async (userId: string, currentNick: string) => {
    if (!conv) return;
    const nick = prompt("Biệt danh (để trống để xoá):", currentNick || "");
    if (nick === null) return;
    try {
      // API hiện chỉ set cho chính mình, ta dùng tạm chính mình
      const updated = await chatService.setNickname(conv._id, nick.trim() || null);
      setConv(updated);
      toast.success("Đã cập nhật biệt danh");
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Lỗi");
    }
  };

  const handleMuteToggle = async () => {
    if (!conv || !me) return;
    const isMuted = (conv.mutedBy || []).some((id: any) =>
      typeof id === "string" ? id === me._id : id.toString() === me._id
    );
    try {
      await chatService.mute(conv._id, !isMuted);
      setConv({
        ...conv,
        mutedBy: isMuted
          ? (conv.mutedBy || []).filter((id: any) => {
              const sid = typeof id === "string" ? id : id.toString();
              return sid !== me._id;
            })
          : [...(conv.mutedBy || []), me._id],
      });
      toast.success(isMuted ? "Đã bật thông báo" : "Đã tắt thông báo");
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Lỗi");
    }
  };

  const isMuted = (conv?.mutedBy || []).some((id: any) => {
    if (!me) return false;
    return typeof id === "string" ? id === me._id : id.toString() === me._id;
  });

  // Search users to add
  useEffect(() => {
    if (searchQ.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const u = await userService.search(searchQ);
        // Loại trừ member hiện tại
        const memberIds = new Set(
          conv?.members.map((m) =>
            typeof m.userId === "object" ? m.userId._id : m.userId
          ) || []
        );
        setSearchResults(u.filter((x) => !memberIds.has(x._id)));
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [searchQ, conv]);

  const handleAddMembers = async (userIds: string[]) => {
    if (!conv) return;
    try {
      const updated = await chatService.addMembers(conv._id, userIds);
      setConv(updated);
      toast.success("Đã thêm thành viên");
      setAddOpen(false);
      setSearchQ("");
      setSearchResults([]);
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Lỗi");
    }
  };

  if (loading || !conv) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (conv.type !== "group") {
    return (
      <div className="p-8 text-center">
        <p>Hội thoại 1-1 không có trang cài đặt nhóm.</p>
        <Button variant="link" onClick={() => navigate(`/chat/${conv._id}`)}>
          Quay lại
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/chat/${conv._id}`)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Cài đặt nhóm</h1>
        </div>

        {/* Tên nhóm */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <Label>Tên nhóm</Label>
            <div className="flex gap-2">
              <Input
                value={name}
                onChange={(v: string) => setName(v)}
                disabled={!isAdmin}
              />
              {isAdmin && (
                <Button onClick={handleSaveName} disabled={savingName}>
                  {savingName ? <Spinner className="mr-2" /> : null}
                  Lưu
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Thành viên */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">
                Thành viên ({conv.members.length})
              </h3>
              {isAdmin && (
                <Button size="sm" onClick={() => setAddOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-1" /> Thêm
                </Button>
              )}
            </div>

            <div className="space-y-2">
              {conv.members.map((m) => {
                const u = typeof m.userId === "object" ? m.userId : null;
                if (!u) return null;
                const uid = u._id;
                const isMe = uid === me?._id;
                return (
                  <div
                    key={uid}
                    className="flex items-center gap-3 p-2 rounded hover:bg-accent"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={u.avatarUrl} />
                      <AvatarFallback>{u.displayName?.[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">
                          {u.displayName} {isMe && "(Bạn)"}
                        </p>
                        {m.role === "owner" && (
                          <Crown className="h-4 w-4 text-yellow-500" />
                        )}
                        {m.role === "admin" && <Shield className="h-4 w-4 text-blue-500" />}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        @{u.username}
                        {m.nickname && ` · Biệt danh: ${m.nickname}`}
                      </p>
                    </div>
                    {isAdmin && !isMe && m.role !== "owner" && (
                      <div className="flex gap-1">
                        {myRole === "owner" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleChangeRole(
                                uid,
                                m.role === "admin" ? "member" : "admin"
                              )
                            }
                          >
                            {m.role === "admin" ? "Hạ" : "Lên admin"}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setMemberToRemove(m)}
                          className="text-destructive"
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Tuỳ chọn */}
        <Card>
          <CardContent className="p-4 space-y-2">
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={handleMuteToggle}
            >
              {isMuted ? (
                <Volume2 className="h-4 w-4 mr-2" />
              ) : (
                <VolumeX className="h-4 w-4 mr-2" />
              )}
              {isMuted ? "Bật thông báo" : "Tắt thông báo"}
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => setConfirmLeave(true)}
            >
              <LogOut className="h-4 w-4 mr-2" /> Rời nhóm
            </Button>
            {myRole === "owner" && (
              <Button
                variant="ghost"
                className="w-full justify-start text-destructive"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" /> Xoá nhóm
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add member dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm thành viên</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Tìm username, email, tên..."
            value={searchQ}
            onChange={(v: string) => setSearchQ(v)}
          />
          <div className="max-h-80 overflow-y-auto space-y-1">
            {searching && <div className="text-center py-4"><Spinner /></div>}
            {!searching && searchQ.length >= 2 && searchResults.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Không tìm thấy
              </p>
            )}
            {searchResults.map((u) => (
              <button
                key={u._id}
                onClick={() => handleAddMembers([u._id])}
                className="w-full flex items-center gap-3 p-2 hover:bg-accent rounded text-left"
              >
                <Avatar>
                  <AvatarImage src={u.avatarUrl} />
                  <AvatarFallback>{u.displayName?.[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{u.displayName}</p>
                  <p className="text-xs text-muted-foreground truncate">@{u.username}</p>
                </div>
                <UserPlus className="h-4 w-4" />
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm leave */}
      <AlertDialog open={confirmLeave} onOpenChange={setConfirmLeave}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rời nhóm?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn sẽ không nhận được tin nhắn mới từ nhóm này.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction onClick={handleLeave}>Rời nhóm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm delete */}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá nhóm?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này không thể hoàn tác. Tất cả tin nhắn sẽ bị xoá.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Xoá vĩnh viễn
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm remove member */}
      <AlertDialog
        open={!!memberToRemove}
        onOpenChange={(o: boolean) => !o && setMemberToRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá thành viên?</AlertDialogTitle>
            <AlertDialogDescription>
              {memberToRemove && typeof memberToRemove.userId === "object"
                ? `Xoá ${memberToRemove.userId.displayName} khỏi nhóm?`
                : "Xoá thành viên này?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (memberToRemove) {
                  const uid = typeof memberToRemove.userId === "object"
                    ? memberToRemove.userId._id
                    : memberToRemove.userId;
                  handleRemoveMember(uid);
                }
              }}
              className="bg-destructive text-destructive-foreground"
            >
              Xoá
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default GroupSettingsPage;
