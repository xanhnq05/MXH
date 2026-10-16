// EditProfilePage - Theme cam GreenX + Combobox + đổi username + xóa tài khoản
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  Camera,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Building2,
  GraduationCap,
  Globe2,
  Phone,
  FileText,
  AtSign,
  Edit2,
  AlertTriangle,
  Trash2,
  Info,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import Input from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Combobox from "@/components/ui/Combobox";
import ImageCropper from "@/components/ui/ImageCropper";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuthStore } from "@/stores/useAuthStore";
import { userService } from "@/services/user.service";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { COUNTRIES, CITIES, WORKPLACES, SCHOOLS } from "@/constants/locations";

const getInitials = (name?: string) =>
  (name || "?")
    .split(/\s+/)
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const formatDaysLeft = (date?: string | Date) => {
  if (!date) return null;
  const days =
    (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24);
  if (days >= 7) return null;
  return Math.ceil(7 - days);
};

const EditProfilePage = () => {
  const { user, updateUser, signOut } = useAuthStore();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [phone, setPhone] = useState<string>(user?.phone || "");
  const [country, setCountry] = useState<string>(user?.country || "");
  const [city, setCity] = useState<string>(user?.city || "");
  const [school, setSchool] = useState<string>(user?.school || "");
  const [workplace, setWorkplace] = useState<string>(user?.workplace || "");

  // Username state
  const [username, setUsername] = useState<string>(user?.username || "");
  const [editingUsername, setEditingUsername] = useState(false);
  const [usernameDaysLeft, setUsernameDaysLeft] = useState<number | null>(
    formatDaysLeft((user as any)?.usernameLastChanged)
  );
  const [savingUsername, setSavingUsername] = useState(false);

  // Common saving states
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  // Cropper state
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperSrc, setCropperSrc] = useState<string | null>(null);
  const [cropperAspect, setCropperAspect] = useState(1);
  const [cropperTitle, setCropperTitle] = useState("Cắt ảnh");
  const [cropperType, setCropperType] = useState<"avatar" | "cover" | null>(null);

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  if (!user) return null;

  // Tính lại countdown khi user.usernameLastChanged thay đổi
  useEffect(() => {
    setUsernameDaysLeft(formatDaysLeft((user as any)?.usernameLastChanged));
  }, [(user as any)?.usernameLastChanged]);

  const handleSave = async () => {
    if (!displayName.trim()) {
      toast.error("Tên hiển thị không được trống");
      return;
    }
    try {
      setSaving(true);
      const updated = await userService.updateProfile({
        displayName: displayName.trim().slice(0, 60),
        bio: bio.slice(0, 100),
        phone: phone.slice(0, 20),
        country: country.slice(0, 80),
        city: city.slice(0, 80),
        school: school.slice(0, 120),
        workplace: workplace.slice(0, 120),
      } as any);
      updateUser(updated);
      toast.success("Đã cập nhật hồ sơ");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Lỗi");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveUsername = async () => {
    const newUsername = username
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_]/g, "");
    if (newUsername.length < 3) {
      toast.error("Username phải có ít nhất 3 ký tự");
      return;
    }
    if (newUsername === user.username) {
      setEditingUsername(false);
      return;
    }
    if (usernameDaysLeft && usernameDaysLeft > 0) {
      toast.error(`Bạn chỉ có thể đổi username sau ${usernameDaysLeft} ngày nữa`);
      return;
    }
    try {
      setSavingUsername(true);
      const updated = await userService.updateProfile({
        username: newUsername,
      } as any);
      updateUser(updated);
      setEditingUsername(false);
      setUsernameDaysLeft(7);
      toast.success("Đã cập nhật username");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Lỗi");
    } finally {
      setSavingUsername(false);
    }
  };

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ảnh tối đa 5MB");
      return;
    }
    // Mở ImageCropper
    setCropperSrc(URL.createObjectURL(file));
    setCropperAspect(1); // avatar vuông
    setCropperTitle("Cắt ảnh đại diện");
    setCropperType("avatar");
    setCropperOpen(true);
    // Reset input
    if (avatarInputRef.current) avatarInputRef.current.value = "";
  };

  const handleCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Ảnh bìa tối đa 8MB");
      return;
    }
    setCropperSrc(URL.createObjectURL(file));
    setCropperAspect(3); // cover tỉ lệ 3:1
    setCropperTitle("Cắt ảnh bìa");
    setCropperType("cover");
    setCropperOpen(true);
    if (coverInputRef.current) coverInputRef.current.value = "";
  };

  const handleCropConfirm = async (blob: Blob) => {
    const file = new File([blob], `${cropperType}.jpg`, { type: "image/jpeg" });
    const previewUrl = URL.createObjectURL(file);
    if (cropperType === "avatar") {
      setAvatarPreview(previewUrl);
      setUploadingAvatar(true);
      try {
        const updated = await userService.uploadAvatar(file);
        updateUser(updated);
        toast.success("Đã cập nhật ảnh đại diện");
      } catch (e: any) {
        toast.error(e?.response?.data?.message || "Upload thất bại");
        setAvatarPreview(null);
      } finally {
        setUploadingAvatar(false);
      }
    } else if (cropperType === "cover") {
      setCoverPreview(previewUrl);
      setUploadingCover(true);
      try {
        const updated = await userService.uploadCover(file);
        updateUser(updated);
        toast.success("Đã cập nhật ảnh bìa");
      } catch (e: any) {
        toast.error(e?.response?.data?.message || "Upload thất bại");
        setCoverPreview(null);
      } finally {
        setUploadingCover(false);
      }
    }
    setCropperOpen(false);
    setCropperSrc(null);
    setCropperType(null);
  };

  const handleCropCancel = () => {
    setCropperOpen(false);
    setCropperSrc(null);
    setCropperType(null);
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== user.email) {
      toast.error("Email xác nhận không khớp");
      return;
    }
    try {
      setDeleting(true);
      await userService.deleteAccount();
      toast.success("Tài khoản đã được xóa vĩnh viễn");
      await signOut();
      navigate("/signin");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Lỗi");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-orange-50/30 dark:bg-slate-950">
      <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            Sửa hồ sơ
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Cập nhật thông tin để bạn bè dễ tìm và gợi ý phù hợp
          </p>
        </div>

        {/* Cover + Avatar */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-orange-100 dark:border-slate-800 overflow-hidden">
          <div className="relative h-40 sm:h-48 bg-gradient-to-br from-orange-200 via-orange-100 to-amber-50">
            {(coverPreview || user.coverUrl) && (
              <img
                src={coverPreview || user.coverUrl}
                alt="cover"
                className="w-full h-full object-cover"
              />
            )}
            <button
              onClick={() => coverInputRef.current?.click()}
              disabled={uploadingCover}
              className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-white px-3 py-1.5 rounded-lg shadow-sm text-sm font-medium"
            >
              {uploadingCover ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ImageIcon className="h-4 w-4" />
              )}
              Đổi ảnh bìa
            </button>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleCover}
            />
          </div>

          <div className="px-5 pb-5 -mt-12">
            <div className="relative inline-block">
              <Avatar className="h-24 w-24 ring-4 ring-white shadow-md">
                <AvatarImage
                  src={avatarPreview || user.avatarUrl}
                  alt={user.displayName}
                />
                <AvatarFallback className="bg-greenx-gradient text-white text-2xl font-semibold">
                  {getInitials(user.displayName)}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute -bottom-1 -right-1 h-9 w-9 rounded-full bg-greenx-gradient text-white flex items-center justify-center shadow-md ring-2 ring-white hover:opacity-90"
                aria-label="Đổi ảnh đại diện"
              >
                {uploadingAvatar ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatar}
              />
            </div>
          </div>
        </div>

        {/* Thông tin cơ bản */}
        <Section title="Thông tin cơ bản" icon={<FileText className="h-4 w-4" />}>
          <Input
            label="Họ và tên"
            required
            value={displayName}
            onChange={setDisplayName}
            maxLength={60}
            placeholder="Nguyễn Văn A"
            autoCapitalize="words"
          />
          <Input
            label="Số điện thoại"
            type="tel"
            value={phone}
            onChange={setPhone}
            placeholder="+84 987 654 321"
            leftIcon={<Phone className="h-4 w-4" />}
            maxLength={20}
          />
          <div>
            <Label className="block text-sm font-medium text-slate-700 mb-1.5">
              Tiểu sử
            </Label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={100}
              rows={3}
              placeholder="Chia sẻ đôi chút về bạn..."
              className={cn(
                "w-full rounded-lg border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 px-3 py-2.5 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 dark:focus:ring-orange-500/30",
                "border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition-colors resize-none"
              )}
            />
            <p className="text-xs text-slate-500 mt-1 text-right">
              {bio.length} / 100
            </p>
          </div>
        </Section>

        {/* Nơi sống & Học vấn — dùng Combobox */}
        <Section
          title="Nơi sống & Học vấn"
          icon={<MapPin className="h-4 w-4" />}
          description="Giúp bạn bè dễ nhận ra và gợi ý bạn bè cùng khu vực"
        >
          <div>
            <Label className="block text-sm font-medium text-slate-700 mb-1.5">
              Quốc gia
            </Label>
            <Combobox
              value={country}
              onChange={setCountry}
              options={COUNTRIES.map((c) => c.value)}
              placeholder="Chọn quốc gia"
            />
          </div>
          <div>
            <Label className="block text-sm font-medium text-slate-700 mb-1.5">
              Thành phố
            </Label>
            <Combobox
              value={city}
              onChange={setCity}
              options={CITIES}
              placeholder="Chọn thành phố đang sống"
              emptyText="Không tìm thấy thành phố"
            />
          </div>
          <div>
            <Label className="block text-sm font-medium text-slate-700 mb-1.5">
              Trường học / Đại học
            </Label>
            <Combobox
              value={school}
              onChange={setSchool}
              options={SCHOOLS}
              placeholder="Tìm trường đang học / đã tốt nghiệp"
              emptyText="Không tìm thấy trường"
            />
          </div>
          <div>
            <Label className="block text-sm font-medium text-slate-700 mb-1.5">
              Cơ quan làm việc
            </Label>
            <Combobox
              value={workplace}
              onChange={setWorkplace}
              options={WORKPLACES}
              placeholder="Tìm công ty / cơ quan"
              emptyText="Không tìm thấy công ty"
            />
          </div>
        </Section>

        {/* Tài khoản — username với cooldown 7 ngày */}
        <Section title="Tài khoản" icon={<AtSign className="h-4 w-4" />}>
          <div>
            <Label className="block text-sm font-medium text-slate-700 mb-1.5">
              Username
            </Label>
            {!editingUsername ? (
              <div className="flex items-center gap-2">
                <div className="flex-1 h-10 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm flex items-center">
                  @{user.username}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditingUsername(true)}
                  disabled={!!usernameDaysLeft}
                  className="gap-1.5"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  Đổi
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Input
                  value={username}
                  onChange={setUsername}
                  placeholder="username_moi"
                  leftIcon={<AtSign className="h-4 w-4" />}
                  maxLength={30}
                />
                <p className="text-xs text-slate-500">
                  Chỉ gồm chữ thường, số và dấu gạch dưới. Tối thiểu 3 ký tự.
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleSaveUsername}
                    disabled={savingUsername}
                    className="bg-greenx-gradient hover:opacity-90 text-white"
                  >
                    {savingUsername && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    )}
                    Lưu username
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setUsername(user.username);
                      setEditingUsername(false);
                    }}
                  >
                    Huỷ
                  </Button>
                </div>
              </div>
            )}
            {usernameDaysLeft && usernameDaysLeft > 0 && (
              <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
                <Info className="h-3 w-3" />
                Bạn chỉ có thể đổi username sau {usernameDaysLeft} ngày nữa
              </p>
            )}
            <p className="text-xs text-slate-500 mt-1.5">
              Username dùng để bạn bè tìm kiếm. Chỉ được đổi 7 ngày/lần.
            </p>
          </div>

          <Input
            label="Email"
            value={user.email}
            disabled
            onChange={() => {}}
            leftIcon={<AtSign className="h-4 w-4" />}
            hint="Email không thể thay đổi"
          />
        </Section>

        {/* Vùng nguy hiểm */}
        <Section
          title="Vùng nguy hiểm"
          icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
          variant="danger"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-red-50 rounded-xl border border-red-100">
            <div>
              <p className="font-semibold text-red-700">Xóa tài khoản vĩnh viễn</p>
              <p className="text-xs text-red-600 mt-1">
                Tài khoản và mọi dữ liệu liên quan sẽ bị xóa vĩnh viễn. Không thể
                khôi phục.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDeleteOpen(true)}
              className="border-red-200 text-red-600 hover:bg-red-100 gap-1.5 shrink-0"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Xóa tài khoản
            </Button>
          </div>
        </Section>

        {/* Actions */}
        <div className="flex gap-3 sticky bottom-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur p-3 -mx-3 border-t border-orange-100 dark:border-slate-800">
          <Button
            variant="outline"
            onClick={() => navigate("/profile")}
            className="flex-1"
          >
            Huỷ
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-greenx-gradient hover:opacity-90 text-white"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Lưu thay đổi
          </Button>
        </div>
      </div>

      {/* Image cropper */}
      {cropperOpen && cropperSrc && (
        <ImageCropper
          imageSrc={cropperSrc}
          aspectRatio={cropperAspect}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
          title={cropperTitle}
        />
      )}

      {/* Delete confirm dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Xóa tài khoản vĩnh viễn
            </DialogTitle>
            <DialogDescription>
              Hành động này <strong>không thể hoàn tác</strong>. Tất cả dữ liệu
              của bạn sẽ bị xóa vĩnh viễn.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-slate-700">
              Nhập email{" "}
              <code className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-800 font-mono">
                {user.email}
              </code>{" "}
              để xác nhận:
            </p>
            <Input
              value={deleteConfirm}
              onChange={setDeleteConfirm}
              placeholder="Email của bạn"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteOpen(false);
                setDeleteConfirm("");
              }}
            >
              Huỷ
            </Button>
            <Button
              onClick={handleDeleteAccount}
              disabled={deleting || deleteConfirm !== user.email}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Tôi hiểu, xóa tài khoản
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Section = ({
  title,
  description,
  icon,
  children,
  variant = "default",
}: {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  variant?: "default" | "danger";
}) => (
  <div
    className={cn(
      "rounded-2xl border p-4 sm:p-5 space-y-4 bg-white dark:bg-slate-900 border-orange-100 dark:border-slate-800",
      variant === "danger"
        ? "border-red-100"
        : "border-orange-100"
    )}
  >
    <div className="flex items-start gap-2">
      {icon && (
        <div
          className={cn(
            "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
            variant === "danger"
              ? "bg-red-100 text-red-600"
              : "bg-orange-100 text-orange-600"
          )}
        >
          {icon}
        </div>
      )}
      <div>
        <h2
          className={cn(
            "font-semibold",
            variant === "danger" ? "text-red-700" : "text-slate-900"
          )}
        >
          {title}
        </h2>
        {description && (
          <p className="text-xs text-slate-500 mt-0.5">{description}</p>
        )}
      </div>
    </div>
    <div className="space-y-4">{children}</div>
  </div>
);

export default EditProfilePage;
