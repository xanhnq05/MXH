// SearchPage - Tìm kiếm người dùng theo username / tên / email
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Search, X, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { userService } from "@/services/user.service";
import { useDebounce } from "@/hooks/useDebounce";
import type { User as UserType } from "@/types/user";
import { cn } from "@/lib/utils";

const getInitials = (name?: string) =>
  (name || "?")
    .split(/\s+/)
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const SearchPage = () => {
  const [q, setQ] = useState("");
  const debounced = useDebounce(q, 300);
  const [results, setResults] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (debounced.length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    setSearched(true);
    userService
      .search(debounced)
      .then((u) => setResults(u || []))
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [debounced]);

  return (
    <div className="h-full overflow-y-auto bg-orange-50/30">
      <div className="max-w-2xl mx-auto p-4 sm:p-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Tìm kiếm</h1>
        <p className="text-sm text-slate-500 mt-1">
          Tìm bạn bè theo tên, username hoặc email
        </p>

        {/* Search bar */}
        <div className="relative mt-5 mb-4">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm theo tên, username hoặc email..."
            className={cn(
              "w-full pl-10 pr-10 py-2.5 rounded-xl border bg-white text-sm",
              "border-orange-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition"
            )}
          />
          {q && (
            <button
              onClick={() => setQ("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:bg-orange-50 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Results */}
        <div className="space-y-2">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 rounded-full border-2 border-orange-200 border-t-orange-500 animate-spin" />
            </div>
          )}

          {!loading && !searched && (
            <div className="text-center py-16 bg-white rounded-2xl border border-orange-100">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-orange-50 flex items-center justify-center text-orange-400 mb-3">
                <Search className="h-8 w-8" />
              </div>
              <p className="font-semibold text-slate-700">Tìm kiếm người dùng</p>
              <p className="text-sm text-slate-500 mt-1">
                Nhập ít nhất 2 ký tự để bắt đầu
              </p>
            </div>
          )}

          {!loading && searched && results.length === 0 && (
            <div className="text-center py-16 bg-white rounded-2xl border border-orange-100">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-orange-50 flex items-center justify-center text-orange-400 mb-3">
                <User className="h-8 w-8" />
              </div>
              <p className="font-semibold text-slate-700">
                Không tìm thấy kết quả
              </p>
              <p className="text-sm text-slate-500 mt-1">
                Thử tìm với từ khoá khác
              </p>
            </div>
          )}

          {results.map((u) => (
            <Link
              key={u._id}
              to={`/profile/${u._id}`}
              className="flex items-center gap-3 p-3 sm:p-4 bg-white rounded-2xl border border-orange-100 hover:border-orange-300 hover:shadow-sm transition-all"
            >
              <Avatar className="h-12 w-12 sm:h-14 sm:w-14 ring-2 ring-orange-100">
                <AvatarImage src={u.avatarUrl} alt={u.displayName} />
                <AvatarFallback className="bg-greenx-gradient text-white font-semibold">
                  {getInitials(u.displayName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 truncate hover:text-orange-600">
                  {u.displayName}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  @{u.username}
                  {u.fullName && u.fullName !== u.displayName && (
                    <> · {u.fullName}</>
                  )}
                </p>
                {u.email && (
                  <p className="text-xs text-slate-400 truncate">{u.email}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SearchPage;
