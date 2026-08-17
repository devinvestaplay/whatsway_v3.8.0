/**
 * ============================================================
 * © 2025 Diploy — a brand of Bisht Technologies Private Limited
 * Original Author: BTPL Engineering Team
 * Website: https://diploy.in
 * Contact: cs@diploy.in
 *
 * Distributed under the Envato / CodeCanyon License Agreement.
 * Licensed to the purchaser for use as defined by the
 * Envato Market (CodeCanyon) Regular or Extended License.
 *
 * You are NOT permitted to redistribute, resell, sublicense,
 * or share this source code, in whole or in part.
 * Respect the author's rights and Envato licensing terms.
 * ============================================================
 */

import { Crown, Calendar, Check, X, ArrowRightLeft, XCircle, CreditCard, Loader2, Wallet } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/auth-context";
import type { PlanData, PlanFeature, PlanPermissions, SubscriptionResponse } from "@/types/types";
import { useLocation } from "wouter";
import { useTranslation } from "@/lib/i18n";
import { useEffect, useState, type FormEvent } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe, Stripe } from "@stripe/stripe-js";

const currencySymbolMap: Record<string, string> = {
  USD: "$",
  INR: "₹",
  EUR: "€",
  GBP: "£",
  AED: "د.إ",
  SGD: "S$",
  AUD: "A$",
  CAD: "C$",
  JPY: "¥",
  CNY: "¥",
  BRL: "R$",
  MXN: "MX$",
  NZD: "NZ$",
  ZAR: "R",
};

function getCurrencySymbol(currency?: string | null): string {
  if (!currency) return "$";
  return currencySymbolMap[currency.toUpperCase()] || currency + " ";
}

function formatMoney(amount: string | number, currency?: string | null) {
  const value = Number(amount || 0);
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: (currency || "USD").toUpperCase(),
      maximumFractionDigits: value % 1 === 0 ? 0 : 2,
    }).format(value);
  } catch {
    return `${getCurrencySymbol(currency)}${value.toLocaleString()}`;
  }
}

type EmbeddedTopupCheckout = {
  paymentId: string;
  paymentIntentId: string;
  clientSecret: string;
  publishableKey: string;
  option: any;
};

type WhiteLabelPlanConfig = {
  id: string;
  plan_key: string;
  plan_name: string;
  status: string;
  display_price: string | number;
  cost_price?: string | number;
  billing_cycle?: string | null;
  badge?: string | null;
  description?: string | null;
  enabled_features?: string[];
};

const planTermLabels: Record<string, string> = {
  quarterly: "3 months",
  half_yearly: "6 months",
  nine_month: "9 months",
  annual: "year",
};

function formatPlanTerm(term?: string | null) {
  return planTermLabels[term || ""] || "6 months";
}

function formatPlanFeatureLabel(featureKey: string) {
  return featureKey
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function TopupPaymentForm({
  checkout,
  onCancel,
  onSuccess,
}: {
  checkout: EmbeddedTopupCheckout;
  onCancel: () => void;
  onSuccess: (balance: number) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
      });
      if (error) throw new Error(error.message || "Payment could not be completed.");
      if (!paymentIntent?.id) throw new Error("Payment confirmation was not returned.");

      const response = await apiRequest("POST", "/api/topups/stripe/verify", {
        paymentId: checkout.paymentId,
        paymentIntentId: paymentIntent.id,
      });
      const data = await response.json();
      onSuccess(Number(data.balance || 0));
    } catch (error: any) {
      toast({
        title: "Payment failed",
        description: error.message || "Unable to complete the secure payment.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4 rounded-xl border border-green-100 bg-green-50/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-gray-900">Secure checkout</p>
          <p className="text-xs text-gray-500">
            {Number(checkout.option.points || 0).toLocaleString()} credits - {formatMoney(checkout.option.amount, checkout.option.currency)}
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
      </div>
      <PaymentElement />
      <Button type="submit" className="w-full bg-green-700 hover:bg-green-800" disabled={!stripe || submitting}>
        {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
        Pay securely
      </Button>
    </form>
  );
}

export default function BillingSubscriptionPage({ embedded = false }: { embedded?: boolean } = {}) {
  const { t } = useTranslation();
  const { user, currency: userCurrency, currencySymbol: userCurrencySymbol } = useAuth();
  const [, setLocation] = useLocation();

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState<string | null>(null);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState("");
  const [buyingTopupId, setBuyingTopupId] = useState<string | null>(null);
  const [verifyingTopup, setVerifyingTopup] = useState(false);
  const [topupReturnHandled, setTopupReturnHandled] = useState(false);
  const [embeddedTopup, setEmbeddedTopup] = useState<EmbeddedTopupCheckout | null>(null);
  const [topupStripePromise, setTopupStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const canUseTopups = !!user?.id && user.role !== "superadmin";

  const handleCancelSubscription = async (subscriptionId: string) => {
    setCancellingId(subscriptionId);
    try {
      const response = await apiRequest("PATCH", `/api/subscriptions/${subscriptionId}/cancel`, {});
      const data = await response.json();
      if (data.success) {
        toast({
          title: "Subscription Cancelled",
          description: data.message || "Your subscription has been cancelled successfully.",
        });
        queryClient.invalidateQueries({ queryKey: [`api/subscriptions/user/${user?.id}`] });
      } else {
        throw new Error(data.message || "Failed to cancel");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel subscription",
        variant: "destructive",
      });
    } finally {
      setCancellingId(null);
      setShowCancelConfirm(null);
    }
  };

  const {
    data: activeplandata,
    isLoading,
    isError,
  } = useQuery<any>({
    queryKey: [`api/subscriptions/user/${user?.id}`],
    queryFn: () =>
      apiRequest("GET", `api/subscriptions/user/${user?.id}`).then((res) =>
        res.json()
      ),
    enabled: !!user?.id,
  });

  const { data: topupOptionsData } = useQuery<{ rows: any[] }>({
    queryKey: ["/api/topups/options"],
    queryFn: () => apiRequest("GET", "/api/topups/options").then((res) => res.json()),
    enabled: canUseTopups,
  });

  const { data: creditData } = useQuery<{ balance: number; rows: any[] }>({
    queryKey: ["/api/topups/balance"],
    queryFn: () => apiRequest("GET", "/api/topups/balance").then((res) => res.json()),
    enabled: canUseTopups,
  });

  const { data: workspacesData } = useQuery<any>({
    queryKey: ["/api/channels"],
    queryFn: () => apiRequest("GET", "/api/channels").then((res) => res.json()),
    enabled: canUseTopups,
  });
  const { data: whiteLabelPlansData } = useQuery<{ rows: WhiteLabelPlanConfig[] }>({
    queryKey: ["/api/white-label/billing/plans"],
    queryFn: () => apiRequest("GET", "/api/white-label/billing/plans").then((res) => res.json()),
  });
  const workspaces = Array.isArray(workspacesData)
    ? workspacesData
    : Array.isArray(workspacesData?.data)
      ? workspacesData.data
      : Array.isArray(workspacesData?.channels)
        ? workspacesData.channels
        : [];
  const topupOptions = Array.isArray(topupOptionsData?.rows) ? topupOptionsData.rows : [];
  const whiteLabelPlans = Array.isArray(whiteLabelPlansData?.rows) ? whiteLabelPlansData.rows : [];

  useEffect(() => {
    if (!canUseTopups || topupReturnHandled || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("topup_session_id");
    const paymentId = params.get("topup_payment_id");
    if (params.get("topup_cancelled")) {
      setTopupReturnHandled(true);
      toast({ title: "Topup cancelled", description: "No credits were charged or added." });
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }
    if (!sessionId || !paymentId) return;

    setTopupReturnHandled(true);
    setVerifyingTopup(true);
    apiRequest("POST", "/api/topups/stripe/verify", { sessionId, paymentId })
      .then((res) => res.json())
      .then((data) => {
        toast({
          title: "Credits added",
          description: `Your new credit balance is ${Number(data.balance || 0).toLocaleString()}.`,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/topups/balance"] });
        queryClient.invalidateQueries({ queryKey: ["/api/channels"] });
        window.history.replaceState({}, "", window.location.pathname);
      })
      .catch((error: any) => {
        toast({
          title: "Topup verification failed",
          description: error.message || "Please refresh the billing page after Stripe confirms the payment.",
          variant: "destructive",
        });
      })
      .finally(() => setVerifyingTopup(false));
  }, [canUseTopups, queryClient, toast, topupReturnHandled]);

  const handleBuyTopup = async (topupOptionId: string) => {
    setBuyingTopupId(topupOptionId);
    try {
      const option = topupOptions.find((item) => item.id === topupOptionId);
      const response = await apiRequest("POST", "/api/topups/stripe/checkout", {
        topupOptionId,
        workspaceId: selectedWorkspaceId || null,
      });
      const data = await response.json();
      if (!data.clientSecret || !data.publishableKey || !data.paymentId || !data.paymentIntentId) {
        throw new Error("Secure checkout could not be initialized.");
      }
      setTopupStripePromise(loadStripe(data.publishableKey));
      setEmbeddedTopup({
        paymentId: data.paymentId,
        paymentIntentId: data.paymentIntentId,
        clientSecret: data.clientSecret,
        publishableKey: data.publishableKey,
        option: option || data.payment || {},
      });
    } catch (error: any) {
      toast({
        title: "Topup checkout failed",
        description: error.message || "Unable to start secure checkout.",
        variant: "destructive",
      });
    } finally {
      setBuyingTopupId(null);
    }
  };

  if (isLoading) {
    return (
      <div className={embedded ? "flex items-center justify-center p-4" : "flex-1 min-h-screen flex items-center justify-center p-4 bg-white text-gray-700"}>
        <p>{t("billing_subscription.loading")}</p>
      </div>
    );
  }


  return (
    <div className={embedded ? "" : "flex-1 bg-white text-gray-900 dots-bg"}>
      <div className="p-6 pb-0 bg-white border">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-green-100 rounded-lg">
            <Crown className="w-6 h-6 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">
            Active Plan Details
          </h2>
        </div>
        <p className="text-gray-500 text-sm ml-14 pb-2">
          View and manage your current subscription plans
        </p>
      </div>
      {canUseTopups && (
        <section className="p-6 pb-0">
          <div className="grid gap-4 lg:grid-cols-[minmax(260px,340px)_1fr]">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-500">Credit Balance</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">
                    {Number(creditData?.balance || 0).toLocaleString()}
                  </p>
                </div>
                <div className="rounded-lg bg-green-100 p-3">
                  <Wallet className="h-6 w-6 text-green-700" />
                </div>
              </div>
              {verifyingTopup && (
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Confirming Stripe payment
                </div>
              )}
              <label className="mt-5 block text-sm font-semibold text-gray-700">
                Apply credits to workspace
                <select
                  className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none focus:border-green-600"
                  value={selectedWorkspaceId}
                  onChange={(event) => setSelectedWorkspaceId(event.target.value)}
                >
                  <option value="">Client balance only</option>
                  {workspaces.map((workspace: any) => (
                    <option key={workspace.id} value={workspace.id}>
                      {workspace.name || workspace.phoneNumber || workspace.id}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Credit Topups</h3>
                  <p className="text-sm text-gray-500">Buy prepaid credits with secure in-page checkout.</p>
                </div>
                <CreditCard className="h-5 w-5 text-green-700" />
              </div>
              {embeddedTopup && topupStripePromise && (
                <Elements
                  stripe={topupStripePromise}
                  options={{
                    clientSecret: embeddedTopup.clientSecret,
                    appearance: {
                      theme: "stripe",
                      variables: { colorPrimary: "#15803d", borderRadius: "8px" },
                    },
                  }}
                >
                  <TopupPaymentForm
                    checkout={embeddedTopup}
                    onCancel={() => {
                      setEmbeddedTopup(null);
                      setTopupStripePromise(null);
                    }}
                    onSuccess={(balance) => {
                      toast({
                        title: "Credits added",
                        description: `Your new credit balance is ${balance.toLocaleString()}.`,
                      });
                      setEmbeddedTopup(null);
                      setTopupStripePromise(null);
                      queryClient.invalidateQueries({ queryKey: ["/api/topups/balance"] });
                      queryClient.invalidateQueries({ queryKey: ["/api/channels"] });
                    }}
                  />
                </Elements>
              )}
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {topupOptions.map((option) => (
                  <div key={option.id} className="rounded-lg border border-gray-200 p-4">
                    <p className="text-sm font-semibold text-gray-500">{option.label}</p>
                    <p className="mt-2 text-2xl font-bold text-gray-900">
                      {Number(option.points || 0).toLocaleString()}
                      <span className="ml-1 text-sm font-medium text-gray-500">credits</span>
                    </p>
                    <p className="mt-1 text-sm text-gray-500">{formatMoney(option.amount, option.currency)}</p>
                    <Button
                      className="mt-4 w-full bg-green-700 hover:bg-green-800"
                      disabled={buyingTopupId === option.id || verifyingTopup || !!embeddedTopup}
                      onClick={() => handleBuyTopup(option.id)}
                    >
                      {buyingTopupId === option.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                      Buy
                    </Button>
                  </div>
                ))}
                {topupOptions.length === 0 && (
                  <div className="col-span-full rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
                    No active topup packages are available yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}
      {whiteLabelPlans.length > 0 && (
        <section className="p-6 pb-0">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Available Plans</h3>
                <p className="text-sm text-gray-500">Plans configured by your provider for this domain.</p>
              </div>
              <Crown className="h-5 w-5 text-green-700" />
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {whiteLabelPlans.map((plan) => {
                const features = Array.isArray(plan.enabled_features) ? plan.enabled_features.slice(0, 4) : [];
                return (
                  <div key={plan.id} className="flex min-h-[220px] flex-col rounded-lg border border-gray-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="font-bold text-gray-900">{plan.plan_name}</h4>
                        {plan.description && <p className="mt-1 line-clamp-2 text-xs text-gray-500">{plan.description}</p>}
                      </div>
                      {plan.badge && (
                        <span className="rounded-full bg-green-100 px-2 py-1 text-[10px] font-bold uppercase text-green-700">
                          {plan.badge}
                        </span>
                      )}
                    </div>
                    <p className="mt-4 text-2xl font-black text-gray-900">
                      {Number(plan.display_price || 0).toLocaleString()}
                      <span className="ml-1 text-xs font-semibold text-gray-500">/ {formatPlanTerm(plan.billing_cycle)}</span>
                    </p>
                    <ul className="mt-4 flex-1 space-y-2">
                      {features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-xs text-gray-600">
                          <Check className="mt-0.5 h-3.5 w-3.5 flex-none text-green-600" />
                          <span>{formatPlanFeatureLabel(feature)}</span>
                        </li>
                      ))}
                      {features.length === 0 && <li className="text-xs text-gray-400">Features will be confirmed by your provider.</li>}
                    </ul>
                    <Button className="mt-4 w-full" variant="outline" onClick={() => setLocation("/settings?tab=billing")}>
                      View Billing
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}
      <main className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 p-6">
        {isError ||
        !activeplandata?.success ||
        !Array.isArray(activeplandata.data) ||
        activeplandata.data.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-gray-200 shadow-sm">
            <div className="p-4 bg-gray-100 rounded-full">
              <svg
                className="w-10 h-10 text-gray-500"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 13h6m-3-3v6m9 1V7a2 2 0 00-2-2h-3.5L14 3H10L8.5 5H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2z"
                />
              </svg>
            </div>

            <h3 className="mt-4 text-lg font-semibold text-gray-800">
              {t("billing_subscription.noSubscription.title")}
            </h3>
            <p className="text-gray-500 text-sm mt-1">
              {t("billing_subscription.noSubscription.description")}
            </p>

            <button
              className="mt-6 px-5 py-2.5 text-sm font-medium bg-green-700 text-white rounded-xl hover:bg-green-800"
              onClick={() => setLocation("/plan-upgrade")}
            >
              {t("billing_subscription.noSubscription.upgradePlan")}
            </button>
          </div>
        ) : (
          activeplandata.data.map((item: any) => {
            const subscription = item?.subscription;
            if (!subscription) return null;
            const transaction = item?.transaction;
            const planData: Partial<PlanData> = subscription.planData ?? {};
            
            const currentCurrencySymbol = getCurrencySymbol(transaction?.currency);

            const planFeatures: PlanFeature[] = Array.isArray(planData.features)
              ? planData.features
              : [];
            const planPermissions: PlanPermissions | null =
              planData.permissions && typeof planData.permissions === "object"
                ? planData.permissions
                : null;
            const renewsDate = subscription.endDate
              ? new Date(subscription.endDate).toLocaleDateString()
              : "-";
            const startDate = subscription.startDate
              ? new Date(subscription.startDate).toLocaleDateString()
              : "-";

            const isMonthly = subscription.billingCycle === "monthly";
            const isAnnual = subscription.billingCycle === "annual" || subscription.billingCycle === "yearly";

            // Multi-currency logic
            const currencyCode = (transaction?.currency || subscription.currency || "USD").toUpperCase();
            const multiPrices = planData.multiCurrencyPrices?.[currencyCode];
            
            let displayMonthly = "-";
            let displayAnnual = "-";

            if (multiPrices) {
              displayMonthly = multiPrices.monthly;
              displayAnnual = multiPrices.annual;
            } else if (currencyCode === "USD") {
              displayMonthly = planData.monthlyPrice || "-";
              displayAnnual = planData.annualPrice || "-";
            }

            // Always show the actual transaction amount for the active cycle if we have it
            if (transaction?.amount) {
              const formattedAmount = Number(transaction.amount).toFixed(2);
              if (isMonthly) displayMonthly = formattedAmount;
              if (isAnnual) displayAnnual = formattedAmount;
            }

            return (
              <div
                key={subscription.id}
                className="bg-white rounded-xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col h-full max-w-sm"
              >
                {/* Header with gradient */}
                <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-4 relative">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Crown className="w-5 h-5 text-yellow-300" />
                      <h2 className="text-lg font-bold">{planData.name || "Subscription"}</h2>
                    </div>
                    <span className={`backdrop-blur-sm text-xs font-semibold rounded-full px-2.5 py-1 capitalize ${
                      (subscription as any).gatewayStatus === "cancel_at_period_end"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-white/20 text-white"
                    }`}>
                      {(subscription as any).gatewayStatus === "cancel_at_period_end"
                        ? "Cancels " + renewsDate
                        : subscription.status}
                    </span>
                  </div>
                  <p className="text-green-100 text-xs line-clamp-2">
                    {planData.description || ""}
                  </p>
                </div>

                {/* Body Content */}
                <div className="p-4 flex-grow flex flex-col space-y-4">
                  {/* Date Info - Compact */}
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-blue-50 rounded-lg p-2 text-center">
                      <Calendar className="w-3.5 h-3.5 text-blue-600 mx-auto mb-1" />
                      <p className="text-gray-500 text-[10px] mb-0.5">
                        {t("billing_subscription.card.billing")}
                      </p>
                      <p className="font-semibold text-gray-800 capitalize truncate">
                        {subscription.billingCycle}
                      </p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-2 text-center">
                      <Calendar className="w-3.5 h-3.5 text-green-600 mx-auto mb-1" />
                      <p className="text-gray-500 text-[10px] mb-0.5">
                        {t("billing_subscription.card.starts")}
                      </p>
                      <p className="font-semibold text-gray-800 text-[10px]">
                        {startDate}
                      </p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-2 text-center">
                      <Calendar className="w-3.5 h-3.5 text-purple-600 mx-auto mb-1" />
                      <p className="text-gray-500 text-[10px] mb-0.5">
                        {t("billing_subscription.card.renews")}
                      </p>
                      <p className="font-semibold text-gray-800 text-[10px]">
                        {renewsDate}
                      </p>
                    </div>
                  </div>

                  {/* Pricing Section - Simplified to only show purchased price */}
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 shadow-inner">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {t("billing_subscription.card.pricing")}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700 uppercase">
                        {subscription.billingCycle}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-gray-900">
                        {currentCurrencySymbol}{transaction?.amount ? Number(transaction.amount).toFixed(2) : (isMonthly ? displayMonthly : displayAnnual)}
                      </span>
                      <span className="text-gray-500 text-xs font-medium">
                        / {isMonthly ? t("billing_subscription.card.monthly") : t("billing_subscription.card.annual")}
                      </span>
                    </div>
                  </div>

                  {/* Permissions */}
                  {planPermissions && (
                    <div>
                      <h3 className="text-xs font-semibold text-gray-700 mb-2">
                        {t("billing_subscription.card.details")}
                      </h3>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(planPermissions).map(
                          ([key, value]) => (
                            <div
                              key={key}
                              className="flex items-center gap-1 text-[10px] bg-gray-100 rounded-md px-2 py-1"
                            >
                              <Check className="w-3 h-3 text-green-600" />
                              <span className="text-gray-700 capitalize">
                                {value} {key}
                              </span>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}

                  {/* Features - Scrollable */}
                  <div className="flex-grow">
                    <h3 className="text-xs font-semibold text-gray-700 mb-2">
                      {t("billing_subscription.card.features")}
                    </h3>
                    <ul className="space-y-1.5 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                      {planFeatures.map((feature: PlanFeature | string, idx: number) => {
                        const featureName =
                          typeof feature === "string"
                            ? feature
                            : feature?.name ?? "";
                        const featureIncluded =
                          typeof feature === "string"
                            ? true
                            : feature?.included !== false;
                        return (
                          <li
                            key={idx}
                            className={`flex items-start gap-1.5 text-xs ${
                              featureIncluded
                                ? "text-gray-700"
                                : "text-gray-400 line-through"
                            }`}
                          >
                            {featureIncluded ? (
                              <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />
                            ) : (
                              <X className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                            )}
                            <span className="leading-tight">{featureName}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>

                {subscription.status === "active" && (
                  <div className="p-4 pt-2 space-y-2 border-t border-gray-100">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setLocation("/plan-upgrade")}
                    >
                      <ArrowRightLeft className="w-4 h-4 mr-2" />
                      Change Plan
                    </Button>

                    {showCancelConfirm === subscription.id ? (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-2">
                        <p className="text-xs text-red-700 font-medium">
                          Are you sure you want to cancel? Your plan will remain active until {renewsDate}, after which it will not renew.
                        </p>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="destructive"
                            className="flex-1"
                            disabled={cancellingId === subscription.id}
                            onClick={() => handleCancelSubscription(subscription.id)}
                          >
                            {cancellingId === subscription.id ? "Cancelling..." : "Yes, Cancel"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => setShowCancelConfirm(null)}
                          >
                            Keep Plan
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setShowCancelConfirm(subscription.id)}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Cancel Subscription
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </main>

      {/* Custom Scrollbar */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #10b981;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}
