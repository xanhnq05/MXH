// Combobox tìm kiếm gợi ý — dùng cho country/city/school/workplace
// Không phụ thuộc thư viện ngoài, dùng popover + list tự build
import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
  maxLength?: number;
}

const Combobox = ({
  value,
  onChange,
  options,
  placeholder,
  emptyText = "Không có kết quả",
  disabled,
  className,
  maxLength,
}: ComboboxProps) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Click outside → close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Filter options
  const filtered = query
    ? options.filter((o) => o.toLowerCase().includes(query.toLowerCase()))
    : options.slice(0, 50);

  const handleSelect = (option: string) => {
    onChange(option);
    setOpen(false);
    setQuery("");
  };

  const handleClear = () => {
    onChange("");
    setQuery("");
    inputRef.current?.focus();
  };

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      {/* Input hiển thị */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={open ? query : value}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            setQuery("");
          }}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={maxLength}
          className={cn(
            "w-full rounded-lg border bg-white px-3 py-2.5 pr-10 text-sm text-slate-900",
            "placeholder:text-slate-400 outline-none",
            "border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition-colors",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        />
        {value && !disabled && !open && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-slate-400 hover:text-slate-600"
            tabIndex={-1}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        {open && (
          <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div
          className={cn(
            "absolute z-50 mt-1 w-full max-h-60 overflow-y-auto",
            "rounded-lg border border-orange-200 bg-white shadow-lg",
            "scrollbar-thin"
          )}
        >
          {filtered.length === 0 ? (
            <div className="px-3 py-4 text-sm text-slate-500 text-center">
              {emptyText}
            </div>
          ) : (
            <ul className="py-1">
              {filtered.map((option) => {
                const selected = option === value;
                return (
                  <li
                    key={option}
                    onClick={() => handleSelect(option)}
                    className={cn(
                      "px-3 py-2 text-sm cursor-pointer flex items-center justify-between",
                      "hover:bg-orange-50",
                      selected && "bg-orange-50 text-orange-700 font-medium"
                    )}
                  >
                    <span className="truncate">{option}</span>
                    {selected && <Check className="h-4 w-4 text-orange-500 shrink-0" />}
                  </li>
                );
              })}
              {query && !options.includes(query) && query.trim().length > 0 && (
                <li
                  onClick={() => handleSelect(query)}
                  className="px-3 py-2 text-sm cursor-pointer border-t border-orange-100 text-orange-600 hover:bg-orange-50"
                >
                  Dùng "<span className="font-medium">{query}</span>"
                </li>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default Combobox;
