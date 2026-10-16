import { useState } from "react";
import EmojiPicker, { EmojiClickData, Theme } from "emoji-picker-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Smile } from "lucide-react";
import { useThemeStore } from "@/stores/useThemeStore";

interface EmojiPickerButtonProps {
  onEmojiClick: (emoji: string) => void;
}

const EmojiPickerButton = ({ onEmojiClick }: EmojiPickerButtonProps) => {
  const [open, setOpen] = useState(false);
  const { theme } = useThemeStore();

  const handleClick = (data: EmojiClickData) => {
    onEmojiClick(data.emoji);
  };

  // Map theme store sang theme của emoji-picker-react
  let resolvedTheme: Theme = Theme.LIGHT;
  if (theme === "dark") resolvedTheme = Theme.DARK;
  else if (theme === "system") {
    resolvedTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
      ? Theme.DARK
      : Theme.LIGHT;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground"
          title="Emoji"
        >
          <Smile className="h-5 w-5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        className="w-auto p-0 border-none shadow-xl"
      >
        <EmojiPicker
          onEmojiClick={handleClick}
          theme={resolvedTheme}
          width={320}
          height={400}
          searchPlaceholder="Tìm emoji..."
          previewConfig={{ showPreview: false }}
        />
      </PopoverContent>
    </Popover>
  );
};

export default EmojiPickerButton;
