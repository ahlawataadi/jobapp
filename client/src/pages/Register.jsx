import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../api/axios.js";
import { useGetAdminConfigQuery } from "../store/jobsApi.js";

const inputCls =
  "w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-400 focus:border-primary-400 outline-none";

export default function Register() {
  const { data: configData } = useGetAdminConfigQuery();
  const siteName = configData?.config?.siteName || "Haryana Job Marketplace";
  // Only offer verification channels the admin has actually enabled.
  const otp = configData?.config?.otpSettings || {};
  const emailEnabled = otp.emailEnabled !== false;
  const smsEnabled = otp.smsEnabled !== false;
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "", role: "seeker", channel: "email" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Channels available to pick from (SMS needs a phone + SMS OTP enabled).
  const channelOptions = [
    ...(emailEnabled ? [{ v: "email", label: "Email" }] : []),
    ...(smsEnabled && form.phone ? [{ v: "phone", label: "SMS" }] : []),
  ];
  // Keep the selected channel valid as toggles/phone change.
  useEffect(() => {
    if (channelOptions.length && !channelOptions.some((o) => o.v === form.channel)) {
      setForm((f) => ({ ...f, channel: channelOptions[0].v }));
    }
  }, [emailEnabled, smsEnabled, form.phone]); // eslint-disable-line react-hooks/exhaustive-deps
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/register", form);
      if (data.verified) {
        // Both OTP channels are disabled — the backend already activated the
        // account, but signup must never log the user in itself. Send them
        // to log in explicitly instead.
        navigate("/login");
        return;
      }
      navigate("/verify-otp", { state: { userId: data.userId, channel: data.channel, devOtp: data.devOtp } });
    } catch (err) {
      setError(err?.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-card-hover border border-gray-100">
        <div className="text-center mb-6">
          <span className="inline-flex bg-primary-600 text-white w-12 h-12 rounded-xl items-center justify-center font-bold text-xl mb-3">
            H
          </span>
          <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
          <p className="text-sm text-gray-500 mt-1">Join {siteName} today</p>
        </div>
        {error && (
          <p className="text-red-600 text-sm mb-3 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
        <form onSubmit={handleSubmit} className="space-y-3" noValidate>
          <div>
            <label htmlFor="reg-name" className="block text-sm font-semibold text-gray-700 mb-1">Full name</label>
            <input
              id="reg-name"
              placeholder="Your name"
              required
              autoComplete="name"
              className={inputCls}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="reg-email" className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
            <input
              id="reg-email"
              type="email"
              placeholder="you@example.com"
              required
              autoComplete="email"
              className={inputCls}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="reg-phone" className="block text-sm font-semibold text-gray-700 mb-1">Phone</label>
            <input
              id="reg-phone"
              placeholder="10-digit mobile number"
              autoComplete="tel"
              className={inputCls}
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          {/* Only show the channel chooser when both email and SMS verification
              are enabled (a real choice). When only one is on, it's used
              automatically; when neither is on, no verification happens. */}
          {channelOptions.length >= 2 && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Send verification code via</label>
              <div className="grid grid-cols-2 gap-2">
                {channelOptions.map((opt) => (
                  <label
                    key={opt.v}
                    className={`flex items-center justify-center gap-2 border rounded-lg px-3 py-2.5 text-sm font-medium cursor-pointer transition-colors ${
                      form.channel === opt.v
                        ? "border-primary-500 bg-primary-50 text-primary-700"
                        : "border-gray-300 text-gray-600 hover:border-primary-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="channel"
                      className="accent-primary-600"
                      checked={form.channel === opt.v}
                      onChange={() => setForm({ ...form, channel: opt.v })}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>
          )}
          <div>
            <label htmlFor="reg-password" className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
            <input
              id="reg-password"
              type="password"
              placeholder="At least 6 characters"
              required
              minLength={6}
              autoComplete="new-password"
              className={inputCls}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">I am a</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { v: "seeker", label: "Job Seeker" },
                { v: "vendor", label: "Vendor / Employer" },
              ].map((opt) => (
                <label
                  key={opt.v}
                  className={`flex items-center justify-center gap-2 border rounded-lg px-3 py-2.5 text-sm font-medium cursor-pointer transition-colors ${
                    form.role === opt.v
                      ? "border-primary-500 bg-primary-50 text-primary-700"
                      : "border-gray-300 text-gray-600 hover:border-primary-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    className="accent-primary-600"
                    checked={form.role === opt.v}
                    onChange={() => setForm({ ...form, role: opt.v })}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>
          <button
            disabled={loading}
            aria-disabled={loading}
            aria-busy={loading}
            className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white py-2.5 rounded-lg font-semibold transition-colors"
          >
            {loading ? "Creating account..." : "Sign up"}
          </button>
        </form>
        <p className="text-sm text-gray-600 mt-4 text-center">
          Already have an account?{" "}
          <Link to="/login" className="text-primary-700 font-semibold hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
