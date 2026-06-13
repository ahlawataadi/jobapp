import { useState } from "react";
import { useCreateOrderMutation, useVerifyPaymentMutation } from "../store/jobsApi.js";

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

export default function RazorpayCheckout({ onSuccess }) {
  const [createOrder] = useCreateOrderMutation();
  const [verifyPayment] = useVerifyPaymentMutation();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePay = async () => {
    setError("");
    setLoading(true);
    try {
      const ok = await loadRazorpayScript();
      if (!ok) throw new Error("Failed to load Razorpay checkout");

      const order = await createOrder().unwrap();

      const options = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "Haryana Job Marketplace",
        description: "Vendor signup fee",
        order_id: order.orderId,
        handler: async (response) => {
          await verifyPayment(response).unwrap();
          onSuccess?.();
        },
        theme: { color: "#1d4ed8" },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      setError(err?.data?.message || err.message || "Payment failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        onClick={handlePay}
        disabled={loading}
        className="bg-blue-700 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {loading ? "Processing..." : "Pay Signup Fee"}
      </button>
      {error && <p className="text-red-600 text-sm">{error}</p>}
    </div>
  );
}
