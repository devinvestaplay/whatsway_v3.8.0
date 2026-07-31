import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";

type ZiinaCheckoutProps = {
  paymentId: string;
  embeddedUrl: string;
  onBack: () => void;
  onSuccess: () => void;
  onFailed?: (message: string) => void;
};

type ZiinaStatusResponse = {
  paymentId: string;
  status: "pending" | "processing" | "completed" | "failed" | "cancelled" | "refunded";
  paidAt?: string;
  subscriptionActivated?: boolean;
};

const FINAL_STATUSES = new Set(["completed", "failed", "cancelled", "refunded"]);

export default function ZiinaCheckout({ paymentId, embeddedUrl, onBack, onSuccess, onFailed }: ZiinaCheckoutProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [messageStatus, setMessageStatus] = useState<string | null>(null);
  const [polls, setPolls] = useState(0);

  const statusQuery = useQuery<ZiinaStatusResponse>({
    queryKey: ["/api/payments/ziina/status", paymentId, polls],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/payments/ziina/${paymentId}/status`);
      return res.json();
    },
    enabled: !!paymentId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (!status || FINAL_STATUSES.has(status) || polls >= 20) return false;
      return 3000;
    },
  });

  useEffect(() => {
    const status = statusQuery.data?.status;
    if (!status) return;
    if (!FINAL_STATUSES.has(status)) setPolls((value) => value + 1);
    if (status === "completed") onSuccess();
    if (status === "failed" || status === "cancelled") onFailed?.(`Payment ${status}`);
  }, [statusQuery.data?.status]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.origin !== "https://pay.ziina.com") return;
      if (iframeRef.current?.contentWindow && event.source !== iframeRef.current.contentWindow) return;
      if (!event.data || event.data.type !== "ZIINA_PAYMENT_STATUS_CHANGE") return;
      const status = String(event.data.status || "").toUpperCase();
      if (!["COMPLETED", "FAILED", "CANCELED", "CANCELLED"].includes(status)) return;
      setMessageStatus(status);
      statusQuery.refetch();
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [statusQuery.refetch]);

  const status = statusQuery.data?.status || "pending";
  const isFinalError = status === "failed" || status === "cancelled" || status === "refunded";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Ziina Checkout</h2>
          <p className="text-sm text-gray-600" aria-live="polite">
            {status === "completed" ? "Payment confirmed" : isFinalError ? `Payment ${status}` : "Payment processing"}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onBack}>Back</Button>
      </div>

      <div className="rounded-lg border bg-slate-50 p-3">
        <div className="mb-3 flex items-center gap-2 text-sm text-slate-700">
          {status === "completed" ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : isFinalError ? <XCircle className="h-4 w-4 text-red-600" /> : <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
          <span>{messageStatus ? `Ziina reported ${messageStatus}. Confirming with server...` : "Complete the secure payment below."}</span>
        </div>
        <iframe
          ref={iframeRef}
          title="Ziina embedded payment checkout"
          src={embeddedUrl}
          allow="payment"
          className="mx-auto h-[78vh] min-h-[620px] w-full max-w-[450px] rounded-md bg-white"
        />
      </div>

      {statusQuery.isError && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4" />
          <span>Unable to confirm payment right now. Please wait or try again.</span>
        </div>
      )}
    </div>
  );
}
