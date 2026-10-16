import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, leftIcon, rightIcon, ...props }, ref) => {
    if (leftIcon || rightIcon) {
      return (
        <div
          className={cn(
            "flex h-9 items-center rounded-md border border-input bg-background px-3 transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1 focus-within:ring-offset-background",
            className
          )}
        >
          {leftIcon && (
            <span className="mr-2 text-muted-foreground [&_svg]:size-4">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            {...props}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
          />
          {rightIcon && (
            <span className="ml-2 text-muted-foreground [&_svg]:size-4">
              {rightIcon}
            </span>
          )}
        </div>
      );
    }
    return (
      <input
        ref={ref}
        {...props}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
      />
    );
  }
);
Input.displayName = "Input";
