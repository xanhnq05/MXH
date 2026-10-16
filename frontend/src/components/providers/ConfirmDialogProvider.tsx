// ConfirmDialog + PromptDialog — thay thế window.confirm/window.prompt bằng modal đẹp.
//
// Cách dùng trong component:
//   const { confirm } = useConfirm();
//   const ok = await confirm({ title: "Xoá?", message: "..." });
//   if (!ok) return;
//
//   const { prompt } = usePrompt();
//   const val = await prompt({ title: "Đổi tên", defaultValue: "" });
//   if (val === null) return; // user cancel
//
// Có thể dùng trực tiếp từ event handler async.
// Provider phải bọc app 1 lần ở root (App.tsx).
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Info, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ===== Types =====
type ConfirmVariant = "default" | "danger" | "warning";

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
}

interface PromptOptions {
  title: string;
  message?: string;
  defaultValue?: string;
  placeholder?: string;
  inputType?: "text" | "password";
  confirmLabel?: string;
  cancelLabel?: string;
  confirmHint?: string; // vd: ">=6 ký tự"
}

interface ConfirmContextValue {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
}

interface PromptContextValue {
  prompt: (opts: PromptOptions) => Promise<string | null>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);
const PromptContext = createContext<PromptContextValue | null>(null);

export const useConfirm = () => {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm must be used inside <ConfirmDialogProvider>");
  }
  return ctx;
};

export const usePrompt = () => {
  const ctx = useContext(PromptContext);
  if (!ctx) {
    throw new Error("usePrompt must be used inside <PromptDialogProvider>");
  }
  return ctx;
};

// ===== State của 1 dialog pending =====
interface ConfirmState extends ConfirmOptions {
  resolve: (v: boolean) => void;
}
interface PromptState extends PromptOptions {
  resolve: (v: string | null) => void;
}

// ===== Provider gộp cả confirm + prompt =====
export const ConfirmDialogProvider = ({ children }: { children: ReactNode }) => {
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [promptState, setPromptState] = useState<PromptState | null>(null);
  const [promptValue, setPromptValue] = useState("");
  const promptInputRef = useRef<HTMLInputElement>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({ ...opts, resolve });
    });
  }, []);

  const prompt = useCallback((opts: PromptOptions) => {
    return new Promise<string | null>((resolve) => {
      setPromptState({ ...opts, resolve });
      setPromptValue(opts.defaultValue ?? "");
    });
  }, []);

  // Focus input khi mở prompt
  useEffect(() => {
    if (promptState) {
      const t = setTimeout(() => promptInputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [promptState]);

  const closeConfirm = (v: boolean) => {
    confirmState?.resolve(v);
    setConfirmState(null);
  };
  const closePrompt = (v: string | null) => {
    promptState?.resolve(v);
    setPromptState(null);
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      <PromptContext.Provider value={{ prompt }}>
        {children}

        {/* Confirm modal */}
        <Dialog
          open={!!confirmState}
          onOpenChange={(open) => {
            if (!open) closeConfirm(false);
          }}
        >
          {confirmState && (
            <DialogContent className="max-w-md">
              <DialogHeader>
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "h-9 w-9 rounded-full flex items-center justify-center shrink-0",
                      confirmState.variant === "danger"
                        ? "bg-red-100 text-red-600"
                        : confirmState.variant === "warning"
                          ? "bg-amber-100 text-amber-600"
                          : "bg-orange-100 text-orange-600"
                    )}
                  >
                    {confirmState.variant === "danger" ? (
                      <Trash2 className="h-4 w-4" />
                    ) : confirmState.variant === "warning" ? (
                      <AlertTriangle className="h-4 w-4" />
                    ) : (
                      <Info className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <DialogTitle className="text-base">
                      {confirmState.title}
                    </DialogTitle>
                    {confirmState.message && (
                      <DialogDescription className="mt-1.5 whitespace-pre-line">
                        {confirmState.message}
                      </DialogDescription>
                    )}
                  </div>
                </div>
              </DialogHeader>
              <DialogFooter className="gap-2 sm:gap-2">
                <Button
                  variant="outline"
                  onClick={() => closeConfirm(false)}
                >
                  {confirmState.cancelLabel ?? "Hủy"}
                </Button>
                <Button
                  className={cn(
                    confirmState.variant === "danger" &&
                      "bg-red-600 hover:bg-red-700 text-white"
                  )}
                  onClick={() => closeConfirm(true)}
                >
                  {confirmState.confirmLabel ?? "Xác nhận"}
                </Button>
              </DialogFooter>
            </DialogContent>
          )}
        </Dialog>

        {/* Prompt modal */}
        <Dialog
          open={!!promptState}
          onOpenChange={(open) => {
            if (!open) closePrompt(null);
          }}
        >
          {promptState && (
            <DialogContent
              className="max-w-md"
              onOpenAutoFocus={(e) => {
                e.preventDefault();
                promptInputRef.current?.focus();
                promptInputRef.current?.select();
              }}
            >
              <DialogHeader>
                <DialogTitle className="text-base">
                  {promptState.title}
                </DialogTitle>
                {promptState.message && (
                  <DialogDescription className="mt-1.5 whitespace-pre-line">
                    {promptState.message}
                  </DialogDescription>
                )}
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  closePrompt(promptValue);
                }}
              >
                <Input
                  ref={promptInputRef}
                  type={promptState.inputType ?? "text"}
                  value={promptValue}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPromptValue(e.target.value)}
                  placeholder={promptState.placeholder}
                  autoComplete="off"
                />
                {promptState.confirmHint && (
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    {promptState.confirmHint}
                  </p>
                )}
                <DialogFooter className="mt-4 gap-2 sm:gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => closePrompt(null)}
                  >
                    {promptState.cancelLabel ?? "Hủy"}
                  </Button>
                  <Button type="submit">
                    {promptState.confirmLabel ?? "Xác nhận"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          )}
        </Dialog>
      </PromptContext.Provider>
    </ConfirmContext.Provider>
  );
};
