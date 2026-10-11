export const USER_ROLES = [
  { value: "patient", label: "Patient" },
  { value: "doctor", label: "Doctor" },
  { value: "specialist", label: "Specialist" },
  { value: "medical_coder", label: "Medical Coder" },
  { value: "researcher", label: "Researcher" },
  { value: "insurance_provider", label: "Insurance Provider" },
] as const;

export type UserRole = (typeof USER_ROLES)[number]["value"];

export const LICENSE_REQUIRED_ROLES: UserRole[] = ["doctor", "specialist"];

export function roleLabel(role: string) {
  return USER_ROLES.find((r) => r.value === role)?.label ?? "Patient";
}
