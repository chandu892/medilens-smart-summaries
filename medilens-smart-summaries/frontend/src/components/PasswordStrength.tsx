import { Check, X } from "lucide-react";
import { scorePassword } from "@/lib/password";
import { cn } from "@/lib/utils";

export function PasswordStrength({ password }: { password: string }) {
  const { score, label, percent, checks } = scorePassword(password);
  const barTone = ["bg-destructive", "bg-destructive", "bg-warning", "bg-brand", "bg-success"][
    score
  ];

  return (
    <div className="space-y-2">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all duration-300", barTone)}
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Password strength: <span className="font-medium text-foreground">{label}</span>
      </p>
      <ul className="grid gap-1 sm:grid-cols-2">
        {checks.map((c) => (
          <li
            key={c.label}
            className={cn(
              "flex items-center gap-1.5 text-xs",
              c.ok ? "text-success" : "text-muted-foreground",
            )}
          >
            {c.ok ? <Check className="size-3.5" /> : <X className="size-3.5" />}
            {c.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
