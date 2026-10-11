import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthUser, saveAuth } from "@/lib/auth-store";
import { roleLabel } from "@/lib/roles";
import { updateProfile, changePassword } from "@/services/auth.service";
import { apiFetch } from "@/services/config";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — MediLens" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const user = useAuthUser();
  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [license, setLicense] = useState(user?.license_number ?? "");
  const [saving, setSaving] = useState(false);

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [changingPw, setChangingPw] = useState(false);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile({
        full_name: fullName,
        ...(license ? { license_number: license } : {}),
      });
      // Update local store
      if (user) {
        saveAuth({ ...user, full_name: fullName, license_number: license || null });
      }
      toast.success("Profile updated.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  }

  async function doChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPw !== confirmPw) { toast.error("Passwords don't match."); return; }
    if (newPw.length < 8) { toast.error("Password must be at least 8 characters."); return; }
    setChangingPw(true);
    try {
      await changePassword(currentPw, newPw);
      toast.success("Password changed successfully.");
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to change password.");
    } finally {
      setChangingPw(false);
    }
  }

  return (
    <AppShell title="Settings">
      <div className="max-w-lg space-y-8">
        <h1 className="text-2xl font-bold">Settings</h1>

        {/* Profile */}
        <section className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <h2 className="font-semibold">Profile</h2>
          <div className="rounded-xl bg-secondary px-4 py-3 text-sm">
            <p className="text-muted-foreground">Email</p>
            <p className="font-medium">{user?.email}</p>
          </div>
          <div className="rounded-xl bg-secondary px-4 py-3 text-sm">
            <p className="text-muted-foreground">Role</p>
            <p className="font-medium">{roleLabel(user?.role ?? "patient")}</p>
          </div>
          <form onSubmit={saveProfile} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                className="rounded-xl"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            {(user?.role === "doctor" || user?.role === "specialist") && (
              <div className="space-y-1.5">
                <Label htmlFor="license">License number</Label>
                <Input
                  id="license"
                  className="rounded-xl"
                  value={license}
                  onChange={(e) => setLicense(e.target.value)}
                />
              </div>
            )}
            <Button type="submit" className="rounded-xl" disabled={saving}>
              {saving ? "Saving…" : "Save profile"}
            </Button>
          </form>
        </section>

        {/* Password */}
        <section className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <h2 className="font-semibold">Change password</h2>
          <form onSubmit={doChangePassword} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="currentPw">Current password</Label>
              <Input
                id="currentPw"
                type="password"
                className="rounded-xl"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="newPw">New password</Label>
              <Input
                id="newPw"
                type="password"
                className="rounded-xl"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPw">Confirm new password</Label>
              <Input
                id="confirmPw"
                type="password"
                className="rounded-xl"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
              />
            </div>
            <Button type="submit" className="rounded-xl" disabled={changingPw}>
              {changingPw ? "Updating…" : "Update password"}
            </Button>
          </form>
        </section>
      </div>
    </AppShell>
  );
}
