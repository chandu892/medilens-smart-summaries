import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, Loader2, QrCode, RefreshCw, Shield } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/services/config";

export const Route = createFileRoute("/_authenticated/qr")({
  head: () => ({ meta: [{ title: "Emergency QR — MediLens" }] }),
  component: QRPage,
});

interface QRResponse {
  token: string;
  qr_url: string;
  expires_at: string | null;
}

function QRPage() {
  const [qrData, setQrData] = useState<QRResponse | null>(null);

  const createMut = useMutation({
    mutationFn: () => apiFetch<QRResponse>("/qr/create", { method: "POST" }),
    onSuccess: (data) => {
      setQrData(data);
      toast.success("Emergency QR code created.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // QR image URL: use a public QR generator or the backend endpoint
  const qrImageUrl = qrData
    ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
        `${window.location.origin}/qr/verify/${qrData.token}`,
      )}`
    : null;

  return (
    <AppShell title="Emergency QR">
      <div className="max-w-lg space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Emergency QR Code</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Generate a secure QR code that authorized healthcare professionals can scan
            in an emergency to access your critical medical information.
          </p>
        </div>

        {/* Info card */}
        <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <div className="flex items-start gap-3">
            <Shield className="size-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium">What they'll see</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Allergies, active medications, current conditions, and recent report summaries.
                The scanner must authenticate before viewing any data.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <AlertTriangle className="size-5 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium">Privacy protected</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Codes expire in 24 hours. Creating a new one deactivates the previous one.
                Access is logged in your audit trail.
              </p>
            </div>
          </div>
        </div>

        {/* QR display */}
        {qrData && qrImageUrl ? (
          <div className="rounded-2xl border border-border bg-card p-6 flex flex-col items-center gap-4">
            <CheckCircle2 className="size-6 text-emerald-500" />
            <p className="text-sm font-medium text-center">
              QR Code active until{" "}
              {qrData.expires_at
                ? new Date(qrData.expires_at).toLocaleString()
                : "24 hours from now"}
            </p>
            <img
              src={qrImageUrl}
              alt="Emergency QR Code"
              className="rounded-xl border border-border"
              width={250}
              height={250}
            />
            <p className="text-xs text-muted-foreground text-center">
              Token: <code className="font-mono">{qrData.token.slice(0, 16)}…</code>
            </p>
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => createMut.mutate()}
              disabled={createMut.isPending}
            >
              <RefreshCw className="mr-1.5 size-4" /> Regenerate
            </Button>
          </div>
        ) : (
          <Button
            className="h-12 w-full rounded-xl text-base"
            onClick={() => createMut.mutate()}
            disabled={createMut.isPending}
          >
            {createMut.isPending ? (
              <><Loader2 className="mr-2 size-4 animate-spin" /> Generating…</>
            ) : (
              <><QrCode className="mr-2 size-5" /> Generate Emergency QR</>
            )}
          </Button>
        )}
      </div>
    </AppShell>
  );
}
