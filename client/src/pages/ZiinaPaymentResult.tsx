import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { AlertCircle, CheckCircle2, Clock, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";

type ZiinaResultProps = { mode: "success" | "cancel" };
const FINAL = new Set(["completed", "failed", "cancelled", "refunded"]);

export default function ZiinaPaymentResult({ mode }: ZiinaResultProps) {
  const [, setLocation] = useLocation();
  const paymentId = useMemo(() => new URLSearchParams(window.location.search).get("paymentId") || "", []);

  const statusQuery = useQuery({
    queryKey: ["/api/payments/ziina/result", paymentId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/payments/ziina/${paymentId}/status`);
      return res.json() as Promise<{ status: string; paidAt?: string; subscriptionActivated?: boolean }>;
    },
    enabled: !!paymentId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (!status || FINAL.has(status)) return false;
      return 3000;
    },
  });

  const status = statusQuery.data?.status;
  const completed = status === "completed";
  const failed = status === "failed" || status === "cancelled" || status === "refunded";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-blue-50 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardContent className="p-8 text-center">
          {!paymentId ? (
            <><AlertCircle className="mx-auto mb-5 h-14 w-14 text-red-600" /><h1 className="text-2xl font-bold">Missing payment reference</h1></>
          ) : completed ? (
            <><CheckCircle2 className="mx-auto mb-5 h-16 w-16 text-emerald-600" /><h1 className="text-2xl font-bold">Payment confirmed</h1><p className="mt-2 text-slate-600">Your subscription is active.</p></>
          ) : failed ? (
            <><XCircle className="mx-auto mb-5 h-16 w-16 text-red-600" /><h1 className="text-2xl font-bold">Payment {status}</h1><p className="mt-2 text-slate-600">No subscription change was made unless Ziina confirms payment.</p></>
          ) : (
            <><Clock className="mx-auto mb-5 h-16 w-16 animate-pulse text-blue-600" /><h1 className="text-2xl font-bold">Payment processing</h1><p className="mt-2 text-slate-600">{mode === "cancel" ? "We are confirming the cancellation with Ziina." : "Waiting for secure webhook confirmation."}</p></>
          )}

          {statusQuery.isError && <p className="mt-4 text-sm text-red-600">Unable to confirm payment right now. Please refresh in a moment.</p>}
          <div className="mt-6 flex flex-col gap-3">
            <Button onClick={() => setLocation(completed ? "/dashboard" : "/plans")}>{completed ? "Go to Dashboard" : "Back to Plans"}</Button>
            <Button variant="outline" onClick={() => statusQuery.refetch()} disabled={!paymentId || statusQuery.isFetching}>Recheck Status</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
