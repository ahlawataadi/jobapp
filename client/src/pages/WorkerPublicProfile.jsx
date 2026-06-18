import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  useGetWorkerQuery,
  useUnlockWorkerContactMutation,
  useCreateContactPackOrderMutation,
  useVerifyContactPackPurchaseMutation,
} from "../store/jobsApi.js";
import { categoryLabel } from "../constants/categories.js";

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

const PAY_SUFFIX = { hourly: "/hr", daily: "/day", monthly: "/mo", fixed: "" };

function formatRate(wp) {
  if (!wp) return null;
  if (wp.payPreference === "hourly" && wp.hourlyRate) return `₹${wp.hourlyRate.toLocaleString("en-IN")}/hr`;
  if (wp.payPreference === "monthly" && wp.monthlyRate) return `₹${wp.monthlyRate.toLocaleString("en-IN")}/mo`;
  if (wp.payPreference === "daily" && wp.dailyRate) return `₹${wp.dailyRate.toLocaleString("en-IN")}/day`;
  if (wp.dailyRate) return `₹${wp.dailyRate.toLocaleString("en-IN")}/day`;
  if (wp.monthlyRate) return `₹${wp.monthlyRate.toLocaleString("en-IN")}/mo`;
  return null;
}

const PACKS = [
  { key: "starter", credits: 10, price: "₹49" },
  { key: "standard", credits: 25, price: "₹199" },
  { key: "pro", credits: 40, price: "₹499" },
];

export default function WorkerPublicProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.auth);
  const { data, isLoading, refetch } = useGetWorkerQuery(id, { skip: !user });
  const [unlock, { isLoading: unlocking }] = useUnlockWorkerContactMutation();
  const [createPackOrder] = useCreateContactPackOrderMutation();
  const [verifyPackPurchase] = useVerifyContactPackPurchaseMutation();
  const [buying, setBuying] = useState(false);
  const [showPackModal, setShowPackModal] = useState(false);
  const [msg, setMsg] = useState("");

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-3">
        <p className="text-gray-500">Log in to view worker profiles.</p>
        <Link to="/login" className="bg-primary-600 text-white px-6 py-2 rounded-lg font-semibold">Log in</Link>
      </div>
    );
  }

  if (isLoading) {
    return <div className="max-w-xl mx-auto px-4 py-10 text-gray-400">Loading…</div>;
  }

  const worker = data?.worker;
  const contactUnlocked = data?.contactUnlocked;

  if (!worker) {
    return (
      <div className="max-w-xl mx-auto px-4 py-10 text-center">
        <p className="text-gray-500">Worker not found.</p>
        <Link to="/workers" className="text-primary-600 font-medium mt-2 block">← Back to search</Link>
      </div>
    );
  }

  const wp = worker.workerProfile || {};

  const handleUnlock = async () => {
    setMsg("");
    try {
      const res = await unlock(id).unwrap();
      if (res.already || res.unlocked) {
        refetch();
        setMsg(`Contact unlocked: ${res.phone || "—"} / ${res.email || "—"}`);
      }
    } catch (e) {
      if (e?.status === 402) {
        setShowPackModal(true);
      } else {
        setMsg(e?.data?.message || "Could not unlock contact");
      }
    }
  };

  const handleBuyPack = async (packKey) => {
    setMsg("");
    setBuying(true);
    try {
      const ok = await loadRazorpayScript();
      if (!ok) throw new Error("Failed to load payment checkout");

      const order = await createPackOrder({ pack: packKey }).unwrap();
      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "Haryana Job Marketplace",
        description: `Contact credits — ${packKey} pack`,
        order_id: order.orderId,
        handler: async (response) => {
          try {
            const res = await verifyPackPurchase(response).unwrap();
            setShowPackModal(false);
            setMsg(`Added ${res.creditsAdded} credits. You now have ${res.contactCredits}.`);
          } catch (e) {
            setMsg(e?.data?.message || "Payment verification failed");
          }
        },
        theme: { color: "#1d4ed8" },
      });
      rzp.open();
    } catch (e) {
      setMsg(e?.data?.message || e.message || "Purchase failed");
    } finally {
      setBuying(false);
    }
  };

  const initials = (worker.name || "?")[0].toUpperCase();

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <Link to="/workers" className="text-sm text-primary-600 hover:text-primary-800">← Back to search</Link>

      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-card">
        <div className="flex items-start gap-4">
          {worker.avatarUrl ? (
            <img src={worker.avatarUrl} alt={worker.name} className="w-16 h-16 rounded-full object-cover shrink-0" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-primary-100 text-primary-700 font-bold text-2xl flex items-center justify-center shrink-0">
              {initials}
            </div>
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">{worker.name}</h1>
              {wp.verificationBadge && (
                <span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium">✓ Verified</span>
              )}
              {wp.featured && (
                <span className="bg-yellow-50 text-yellow-700 text-xs px-2 py-0.5 rounded-full font-medium">⭐ Featured</span>
              )}
            </div>
            <p className="text-gray-600 mt-1">
              {categoryLabel(wp.skillCategory)}
              {wp.location?.district ? ` · ${wp.location.district}` : ""}
            </p>
            {formatRate(wp) && (
              <p className="text-primary-700 font-semibold text-sm mt-1">{formatRate(wp)}</p>
            )}
          </div>
        </div>

        {wp.skills?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {wp.skills.map((s) => (
              <span key={s} className="bg-gray-100 text-gray-700 text-xs px-2.5 py-1 rounded-full">{s}</span>
            ))}
          </div>
        )}

        {wp.bio && (
          <p className="text-gray-700 text-sm mt-4 leading-relaxed">{wp.bio}</p>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 text-sm">
          {wp.experience && (
            <div className="bg-gray-50 rounded-lg p-2">
              <p className="text-xs text-gray-400">Experience</p>
              <p className="font-medium text-gray-800">{wp.experience}</p>
            </div>
          )}
          {wp.languages?.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-2">
              <p className="text-xs text-gray-400">Languages</p>
              <p className="font-medium text-gray-800">{wp.languages.join(", ")}</p>
            </div>
          )}
          {wp.availability?.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-2">
              <p className="text-xs text-gray-400">Available</p>
              <p className="font-medium text-gray-800">{wp.availability.length} days marked</p>
            </div>
          )}
        </div>
      </div>

      {/* Contact / Unlock */}
      {user.role === "vendor" && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-card space-y-3">
          <h2 className="font-bold text-gray-900">Contact Worker</h2>
          {contactUnlocked ? (
            <div className="space-y-1 text-sm">
              {worker.phone && <p className="text-gray-700">📞 {worker.phone}</p>}
              {worker.email && <p className="text-gray-700">✉️ {worker.email}</p>}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-gray-500">Unlock this worker's contact details using one credit.</p>
              <p className="text-xs text-gray-400">You have {user.contactCredits ?? 0} credits remaining.</p>
              <button
                onClick={handleUnlock}
                disabled={unlocking}
                className="bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors"
              >
                {unlocking ? "Unlocking…" : "Unlock Contact (1 credit)"}
              </button>
            </div>
          )}
          {msg && <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">{msg}</p>}
        </div>
      )}

      {/* Intro Video */}
      {wp.profileVideoUrl && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-card">
          <h2 className="font-bold text-gray-900 mb-3">Intro Video</h2>
          <video src={wp.profileVideoUrl} controls className="w-full rounded-lg max-h-64 bg-black" />
        </div>
      )}

      {/* Chat */}
      {user && user._id !== id && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-card">
          <h2 className="font-bold text-gray-900 mb-2">Message</h2>
          <p className="text-sm text-gray-500 mb-3">
            Chat securely — contact details are automatically filtered from messages.
          </p>
          <Link
            to={`/chat/${id}`}
            className="inline-block bg-gray-900 hover:bg-gray-800 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            Open Chat
          </Link>
        </div>
      )}

      {/* Contact Pack Modal */}
      {showPackModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl space-y-4">
            <h2 className="font-bold text-gray-900 text-lg">Purchase Contact Pack</h2>
            <p className="text-sm text-gray-600">You have no credits. Buy a pack to unlock worker contacts.</p>
            <div className="space-y-3">
              {PACKS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => handleBuyPack(p.key)}
                  disabled={buying}
                  className="w-full border border-gray-200 hover:border-primary-400 rounded-xl px-4 py-3 text-left transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-gray-900">{p.credits} contacts</p>
                      <p className="text-xs text-gray-500 capitalize">{p.key}</p>
                    </div>
                    <span className="text-primary-700 font-bold">{p.price}</span>
                  </div>
                </button>
              ))}
            </div>
            <button onClick={() => setShowPackModal(false)} className="w-full text-gray-500 text-sm pt-1">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
