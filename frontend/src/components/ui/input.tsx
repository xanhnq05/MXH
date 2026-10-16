// Input với label, icon, hint và error — bind mọi giá trị thành string
// Updated: sanitize + bind chỉ dưới dạng string, tránh XSS/CSS injection
import { forwardRef, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface InputProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "type" | "value" | "onChange"
  > {
  label?: string;
  hint?: string;
  error?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  /** Container class */
  containerClassName?: string;
  /** Bắt buộc — dấu * đỏ */
  required?: boolean;
  /** Loại input — password sẽ có nút toggle */
  type?: "text" | "email" | "password" | "tel" | "date" | "number" | "search";
  /** Bind trực tiếp giá trị (luôn là string) */
  value: string | number;
  /**
   * Hỗ trợ 2 kiểu callback:
   * - (value: string) => void: bind kiểu mới
   * - (e: React.ChangeEvent<HTMLInputElement>) => void: backward-compat với code cũ dùng e.target.value
   */
  onChange: any;
  /** Auto uppercase đầu câu */
  autoCapitalize?: "on" | "off" | "words" | "sentences";
  /** Max length (kết hợp với HTML maxLength) */
  maxLength?: number;
  /** Sanitize onChange — loại bỏ ký tự nguy hiểm (cho password hoặc name) */
  sanitize?: (value: string) => string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      hint,
      error,
      leftIcon,
      rightIcon,
      containerClassName,
      required,
      type = "text",
      value,
      onChange,
      sanitize,
      autoCapitalize = "off",
      maxLength,
      className,
      ...rest
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === "password";
    const actualType = isPassword && showPassword ? "text" : type;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let v = e.target.value;
      if (sanitize) v = sanitize(v);
      // Hỗ trợ cả (value: string) và (e) => ... callback
      const cb = onChange as ((v: string) => void) | ((e: React.ChangeEvent<HTMLInputElement>) => void);
      if (cb.length === 1) {
        (cb as (v: string) => void)(v);
      } else {
        // Trả về event với target.value đã được sanitize
        const syntheticEvent = {
          ...e,
          target: { ...e.target, value: v },
        } as React.ChangeEvent<HTMLInputElement>;
        (cb as (e: React.ChangeEvent<HTMLInputElement>) => void)(syntheticEvent);
      }
    };

    return (
      <div className={cn("w-full space-y-1.5", containerClassName)}>
        {label && (
          <label className="block text-sm font-medium text-slate-700">
            {label}
            {required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
        )}
        <div
          className={cn(
            "relative flex items-center rounded-lg border bg-white transition-colors",
            error
              ? "border-red-400 focus-within:border-red-500"
              : "border-slate-200 focus-within:border-blue-500",
            "focus-within:ring-2 focus-within:ring-blue-100"
          )}
        >
          {leftIcon && (
            <span className="pl-3 pr-1 text-slate-400 flex items-center pointer-events-none">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            {...rest}
            type={actualType}
            value={value}
            onChange={handleChange}
            maxLength={maxLength}
            autoCapitalize={autoCapitalize}
            autoComplete={rest.autoComplete || "off"}
            className={cn(
              "flex-1 w-full bg-transparent px-3 py-2.5 text-slate-900 placeholder:text-slate-400 outline-none disabled:opacity-50",
              leftIcon ? "pl-1" : "",
              isPassword ? "pr-10" : rightIcon ? "pr-10" : "",
              className
            )}
          />
          {isPassword ? (
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3 text-slate-400 hover:text-slate-600"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          ) : (
            rightIcon && (
              <span className="absolute right-3 text-slate-400 flex items-center pointer-events-none">
                {rightIcon}
              </span>
            )
          )}
        </div>
        {error ? (
          <p className="text-xs text-red-500">{error}</p>
        ) : hint ? (
          <p className="text-xs text-slate-500">{hint}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";
export { Input };
export default Input;
