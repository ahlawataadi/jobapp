import { useState } from "react";
import { useSelector } from "react-redux";
import {
  useGetAdminConfigQuery,
  useCreateSeekerSignupOrderMutation,
  useVerifySeekerSignupMutation,
} from "../store/jobsApi.js";

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

// Shown to job seekers who owe the (optional) signup fee.
export default function SeekerSignupFeePrompt() {
  const { user } = useSelector((s) => s.auth);
  const { data: configData } = useGetAdminConfigQuery();
  const [createOrder] = useCreateSeekerSignupOrderMutation();
  const [verify] = useVerifySeekerSignupMutation();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const fee = configData?.config?.seekerSignupFee;
  const siteName = configData?.config?.siteName || "Haryana Job Marketplace";
  if (user?.role !== "seeker" || !fee?.enabled || !(fee.amount > 0) || user?.signupFeePaid) return null;

  const amount = `₹${(fee.amount / 100).toLocaleString("en-IN")}`;

  const pay = async () => {
    setMsg("");
    setBusy(true);
    try {
      const ok = await loadRazorpayScript();
      if (!ok) throw new Error("Failed to load payment checkout");
      const order = await createOrder().unwrap();
      if (order.free || order.already) {
        setMsg("Nothing to pay.");
        return;
      }
      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: siteName,
        description: "Job seeker signup fee",
        order_id: order.orderId,
        handler: async (response) => {
          try {
            await verify(response).unwrap();
            setMsg("Payment received — thank you!");
          } catch (e) {
            setMsg(e?.data?.message || "Verification failed");
          }
        },
        theme: { color: "#4f46e5" },
      });
      rzp.open();
    } catch (e) {
      setMsg(e?.data?.message || e.message || "Payment failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between gap-3 flex-wrap">
      <div>
        <p className="font-semibold text-amber-900">Complete your signup ({amount})</p>
        <p className="text-sm text-amber-700">A one-time signup fee is required to activate full access.</p>
        {msg && <p className="text-sm text-amber-800 mt-1">{msg}</p>}
      </div>
      <button
        onClick={pay}
        disabled={busy}
        className="bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors shrink-0"
      >
        {busy ? "Processing…" : `Pay ${amount}`}
      </button>
    </div>
  );
}
