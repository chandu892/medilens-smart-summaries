export type PasswordScore = {
  score: number; // 0..4
  label: string;
  percent: number;
  checks: { label: string; ok: boolean }[];
};

export function scorePassword(password: string): PasswordScore {
  const checks = [
    { label: "At least 8 characters", ok: password.length >= 8 },
    { label: "Upper & lowercase letters", ok: /[a-z]/.test(password) && /[A-Z]/.test(password) },
    { label: "At least one number", ok: /\d/.test(password) },
    { label: "At least one symbol", ok: /[^A-Za-z0-9]/.test(password) },
  ];
  const score = checks.filter((c) => c.ok).length;
  const labels = ["Very weak", "Weak", "Fair", "Good", "Strong"];
  return {
    score,
    label: password ? labels[score]! : "Enter a password",
    percent: password ? Math.max(8, (score / 4) * 100) : 0,
    checks,
  };
}
