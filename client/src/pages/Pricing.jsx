import { useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  useGetAdminConfigQuery,
  useCreateSubscriptionOrderMutation,
  useVerifySubscriptionMutation,
} from "../store/jobsApi.js";

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

const PLAN_META = {
  basic: {
    label: "Basic",
    color: "border-gray-200",
    badge: "bg-gray-100 text-gray-700",
    highlight: false,
  },
  pro: {
    label: "Pro",
    color: "border-primary-400 ring-2 ring-primary-200",
    badge: "bg-primary-600 text-white",
    highlight: true,
  },
  enterprise: {
    label: "Enterprise",
    color: "border-gray-200",
    badge: "bg-gray-900 text-white",
    highlight: false,
  },
};

function PlanCard({ planKey, plan, currentPlan, siteName, razorpayKeyId, onSuccess }) {
  const { user } = useSelector((s) => s.auth);
  const [createOrder] = useCreateSubscriptionOrderMutation();
  const [verifySubscription] = useVerifySubscriptionMutation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const meta = PLAN_META[planKey];
  const isCurrent = currentPlan === planKey;
  // Admin-configured override (Fees & Pricing → Button label); falls back to defaults.
  const customLabel = plan?.buttonLabel?.trim();

  const handleSubscribe = async () => {
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const ok = await loadRazorpayScript();
      if (!ok) throw new Error("Failed to load payment gateway");

      const order = await createOrder({ plan: planKey }).unwrap();

      await new Promise((resolve, reject) => {
        const options = {
          key: order.keyId || razorpayKeyId,
          amount: order.amount,
          currency: order.currency,
          name: siteName || "Job Marketplace",
          description: `${meta.label} Plan — 1 month`,
          order_id: order.orderId,
          handler: async (response) => {
            try {
              await verifySubscription(response).unwrap();
              setSuccess(`${meta.label} plan activated! Valid for 30 days.`);
              onSuccess?.();
              resolve();
            } catch (e) {
              reject(e);
            }
          },
          modal: { ondismiss: () => resolve() },
          theme: { color: "#1d4ed8" },
        };
        const rzp = new window.Razorpay(options);
        rzp.on("payment.failed", (resp) => reject(new Error(resp.error?.description || "Payment failed")));
        rzp.open();
      });
    } catch (err) {
      setError(err?.data?.message || err.message || "Payment failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`relative bg-white border-2 rounded-2xl p-6 flex flex-col gap-4 shadow-card transition-shadow hover:shadow-card-hover ${meta.color}`}>
      {meta.highlight && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-primary-600 text-white text-xs font-bold px-3 py-1 rounded-full">Most Popular</span>
        </div>
      )}
      <div>
        <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full mb-2 ${meta.badge}`}>{meta.label}</span>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-extrabold text-gray-900">₹{plan.priceMonthly?.toLocaleString("en-IN")}</span>
          <span className="text-gray-500 text-sm">/month</span>
        </div>
      </div>

      <ul className="space-y-2 flex-1">
        {(plan.features || "").split(",").map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
            <span className="text-green-500 mt-0.5 shrink-0">✓</span>
            {f.trim()}
          </li>
        ))}
      </ul>

      {success && <p className="text-green-700 text-sm bg-green-50 border border-green-100 rounded-lg px-3 py-2">{success}</p>}
      {error && <p className="text-red-600 text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

      {user ? (
        isCurrent ? (
          <div className="text-center py-2.5 rounded-xl border-2 border-green-300 bg-green-50 text-green-700 text-sm font-semibold">
            ✓ Current plan
          </div>
        ) : (
          <button
            onClick={handleSubscribe}
            disabled={loading}
            className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-colors disabled:opacity-60 ${
              meta.highlight
                ? "bg-primary-600 hover:bg-primary-700 text-white"
                : "bg-gray-900 hover:bg-gray-800 text-white"
            }`}
          >
            {loading ? "Processing…" : customLabel || `Subscribe — ₹${plan.priceMonthly?.toLocaleString("en-IN")}/mo`}
          </button>
        )
      ) : (
        <Link
          to="/login"
          className={`w-full py-2.5 rounded-xl font-semibold text-sm text-center transition-colors block ${
            meta.highlight
              ? "bg-primary-600 hover:bg-primary-700 text-white"
              : "bg-gray-900 hover:bg-gray-800 text-white"
          }`}
        >
          {customLabel || "Log in to subscribe"}
        </Link>
      )}
    </div>
  );
}

function PlanGrid({ plans, currentPlan, siteName, razorpayKeyId, onSuccess }) {
  if (!plans) {
    return (
      <div className="grid md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => <div key={i} className="skeleton h-64 rounded-2xl" />)}
      </div>
    );
  }
  return (
    <div className="grid md:grid-cols-3 gap-6 items-start">
      {["basic", "pro", "enterprise"].map((key) => (
        <PlanCard
          key={key}
          planKey={key}
          plan={plans[key]}
          currentPlan={currentPlan}
          siteName={siteName}
          razorpayKeyId={razorpayKeyId}
          onSuccess={onSuccess}
        />
      ))}
    </div>
  );
}

const ROLE_META = {
  seeker: {
    label: "Job Seekers",
    desc: "Plans for individuals looking for work",
    planKey: "seekerPlans",
  },
  vendor: {
    label: "Employers / Vendors",
    desc: "Plans for businesses posting jobs",
    planKey: "vendorPlans",
  },
};

export default function Pricing() {
  const { user } = useSelector((s) => s.auth);
  const { data: configData } = useGetAdminConfigQuery();
  const config = configData?.config;
  const siteName = config?.siteName;
  const currentPlan = user?.subscription?.plan || "none";
  const expiresAt = user?.subscription?.expiresAt;

  // Determine which tab to show
  const userRole = user?.role === "vendor" ? "vendor" : user?.role === "seeker" ? "seeker" : null;
  const [guestTab, setGuestTab] = useState("seeker");
  const activeRole = userRole ?? guestTab;
  const activePlans = config?.[ROLE_META[activeRole].planKey];

  const handleSuccess = () => {
    setTimeout(() => window.location.reload(), 1500);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-3">Choose your plan</h1>
        <p className="text-gray-500 text-lg max-w-xl mx-auto">
          Unlock premium features tailored to your role. Cancel any time.
        </p>
        {currentPlan !== "none" && expiresAt && (
          <p className="mt-3 text-sm text-primary-700 bg-primary-50 border border-primary-200 inline-block px-4 py-2 rounded-full">
            You're on the <strong className="capitalize">{currentPlan}</strong> plan · expires {new Date(expiresAt).toLocaleDateString("en-IN")}
          </p>
        )}
      </div>

      {/* Role indicator for logged-in users; tab selector for guests */}
      {userRole ? (
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center gap-2 bg-gray-100 rounded-xl px-4 py-2 text-sm font-medium text-gray-700">
            <span className="w-2 h-2 rounded-full bg-primary-500 inline-block" />
            Showing plans for <strong className="text-gray-900">{ROLE_META[activeRole].label}</strong>
          </div>
        </div>
      ) : (
        <div className="flex justify-center mb-8">
          <div className="inline-flex bg-gray-100 rounded-xl p-1 gap-1">
            {Object.entries(ROLE_META).map(([role, meta]) => (
              <button
                key={role}
                onClick={() => setGuestTab(role)}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  guestTab === role
                    ? "bg-white shadow text-gray-900"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {meta.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <PlanGrid
        plans={activePlans}
        currentPlan={currentPlan}
        siteName={siteName}
        razorpayKeyId={config?.paymentGateway?.keyId}
        onSuccess={handleSuccess}
      />

      <div className="mt-12 bg-gray-50 border border-gray-200 rounded-2xl p-8 text-center space-y-2">
        <h2 className="font-bold text-gray-900 text-lg">What's included in all plans</h2>
        {activeRole === "seeker" ? (
          <p className="text-sm text-gray-600">Intro video profile · Priority search visibility · Resume highlights · Job alerts</p>
        ) : (
          <p className="text-sm text-gray-600">Intro company video · Verified badge · Priority support · Applicant tracking</p>
        )}
        <p className="text-xs text-gray-400 mt-4">
          All subscriptions are billed monthly. Plans auto-expire after 30 days. Contact support to renew or upgrade.
        </p>
      </div>

      <div className="mt-8 grid sm:grid-cols-3 gap-4 text-sm">
        {[
          { q: "Can I cancel anytime?", a: "Yes. Your plan simply expires at the end of the 30-day period — no recurring charge." },
          { q: "Which plan unlocks video profiles?", a: "All paid plans (Basic, Pro, Enterprise) allow you to upload an intro video to your profile." },
          { q: "How do I activate my plan?", a: "Pay via the checkout above. Your plan activates instantly once payment is confirmed." },
        ].map(({ q, a }) => (
          <div key={q} className="bg-white border border-gray-200 rounded-xl p-4 text-left">
            <p className="font-semibold text-gray-900 mb-1">{q}</p>
            <p className="text-gray-500">{a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
