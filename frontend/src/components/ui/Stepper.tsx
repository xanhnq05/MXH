// Stepper indicator: hiển thị các bước theo dạng dots + label
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Step {
  label: string;
  description?: string;
}

interface StepperProps {
  steps: Step[];
  current: number; // 0-based index
  className?: string;
}

const Stepper = ({ steps, current, className }: StepperProps) => {
  return (
    <ol className={cn("flex items-center w-full", className)}>
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li
            key={i}
            className={cn(
              "flex items-center",
              i < steps.length - 1 && "flex-1"
            )}
          >
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <div
                className={cn(
                  "flex items-center justify-center w-9 h-9 rounded-full text-sm font-semibold transition-all",
                  done && "bg-blue-600 text-white",
                  active && "bg-blue-600 text-white ring-4 ring-blue-100",
                  !done && !active && "bg-slate-100 text-slate-400 border-2 border-slate-200"
                )}
              >
                {done ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <div className="text-center">
                <p
                  className={cn(
                    "text-xs font-medium whitespace-nowrap",
                    active ? "text-blue-600" : done ? "text-slate-700" : "text-slate-400"
                  )}
                >
                  {s.label}
                </p>
                {s.description && (
                  <p className="text-[10px] text-slate-400 mt-0.5 whitespace-nowrap">
                    {s.description}
                  </p>
                )}
              </div>
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-0.5 mx-2 mb-5 transition-colors",
                  i < current ? "bg-blue-600" : "bg-slate-200"
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
};

export default Stepper;
