import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";
import { useUpdateMyWorkerProfileMutation } from "../store/jobsApi.js";
import { WORKER_CATEGORIES, skillsForCategory } from "../constants/categories.js";

const inputCls =
  "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-400 focus:border-primary-400 outline-none";
const label = "block text-sm font-semibold text-gray-700 mb-1";

const LANGUAGES = ["Hindi", "English", "Bengali", "Tamil", "Telugu", "Marathi", "Punjabi"];
const PAY_PREFS = [
  { value: "hourly", label: "Hourly" },
  { value: "daily", label: "Daily" },
  { value: "monthly", label: "Monthly" },
  { value: "fixed", label: "Fixed / Project" },
];

function AvailabilityPicker({ value, onChange }) {
  const today = new Date();
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d.toISOString().slice(0, 10);
  });

  const toggle = (date) => {
    if (value.includes(date)) onChange(value.filter((d) => d !== date));
    else onChange([...value, date]);
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {days.map((d) => (
        <button
          key={d}
          type="button"
          onClick={() => toggle(d)}
          className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
            value.includes(d)
              ? "bg-primary-600 text-white border-primary-600"
              : "bg-white text-gray-600 border-gray-300 hover:border-primary-300"
          }`}
        >
          {new Date(d + "T00:00:00").toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
        </button>
      ))}
    </div>
  );
}

export default function WorkerProfileSetup() {
  const { user } = useSelector((s) => s.auth);
  const [updateProfile, { isLoading }] = useUpdateMyWorkerProfileMutation();

  const [form, setForm] = useState({
    skillCategory: "",
    skills: [],
    bio: "",
    payPreference: "daily",
    hourlyRate: "",
    dailyRate: "",
    district: "",
    city: "",
    experience: "",
    languages: ["Hindi"],
    availability: [],
  });
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    const wp = user?.workerProfile;
    if (wp && wp.skillCategory) {
      setForm({
        skillCategory: wp.skillCategory || "",
        skills: wp.skills || [],
        bio: wp.bio || "",
        payPreference: wp.payPreference || "daily",
        hourlyRate: wp.hourlyRate || "",
        dailyRate: wp.dailyRate || "",
        district: wp.location?.district || "",
        city: wp.location?.city || "",
        experience: wp.experience || "",
        languages: wp.languages?.length ? wp.languages : ["Hindi"],
        availability: wp.availability || [],
      });
    }
  }, [user]);

  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "seeker") {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center">
        <p className="text-gray-500">Worker profile setup is for job seekers only.</p>
      </div>
    );
  }

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const availableSkills = skillsForCategory(form.skillCategory);

  const toggleSkill = (skill) => {
    if (form.skills.includes(skill)) {
      set("skills", form.skills.filter((s) => s !== skill));
    } else {
      set("skills", [...form.skills, skill]);
    }
  };

  const toggleLang = (lang) => {
    if (form.languages.includes(lang)) {
      set("languages", form.languages.filter((l) => l !== lang));
    } else {
      set("languages", [...form.languages, lang]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setMsg("");
    try {
      await updateProfile({
        ...form,
        hourlyRate: Number(form.hourlyRate) || 0,
        dailyRate: Number(form.dailyRate) || 0,
      }).unwrap();
      setMsg("Profile updated! Employers can now find you.");
    } catch (e2) {
      setErr(e2?.data?.message || "Save failed");
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Worker Profile</h1>
      <p className="text-gray-500 text-sm mb-6">
        Fill in your skills and availability so employers can find and hire you.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Category */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-card space-y-4">
          <h2 className="font-bold text-gray-900">Skills & Category</h2>
          <div>
            <label className={label}>Category *</label>
            <select
              className={inputCls}
              value={form.skillCategory}
              onChange={(e) => { set("skillCategory", e.target.value); set("skills", []); }}
              required
            >
              <option value="">Select a category…</option>
              {WORKER_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {availableSkills.length > 0 && (
            <div>
              <label className={label}>Skills (select all that apply)</label>
              <div className="flex flex-wrap gap-2">
                {availableSkills.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSkill(s)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      form.skills.includes(s)
                        ? "bg-primary-600 text-white border-primary-600"
                        : "bg-white text-gray-600 border-gray-300 hover:border-primary-300"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className={label}>Experience</label>
            <input
              className={inputCls}
              placeholder="e.g. 3 years, fresher"
              value={form.experience}
              onChange={(e) => set("experience", e.target.value)}
            />
          </div>

          <div>
            <label className={label}>Bio / About Yourself</label>
            <textarea
              className={inputCls}
              rows={3}
              placeholder="Tell employers about your work experience and specialties…"
              value={form.bio}
              onChange={(e) => set("bio", e.target.value)}
              maxLength={1000}
            />
            <p className="text-xs text-gray-400 mt-1">{form.bio.length}/1000</p>
          </div>
        </div>

        {/* Pay */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-card space-y-4">
          <h2 className="font-bold text-gray-900">Pay Rate</h2>
          <div>
            <label className={label}>Pay preference</label>
            <div className="flex flex-wrap gap-2">
              {PAY_PREFS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => set("payPreference", p.value)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    form.payPreference === p.value
                      ? "bg-primary-600 text-white border-primary-600"
                      : "bg-white text-gray-600 border-gray-300 hover:border-primary-300"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Hourly rate (₹)</label>
              <input
                type="number"
                min="0"
                className={inputCls}
                placeholder="e.g. 150"
                value={form.hourlyRate}
                onChange={(e) => set("hourlyRate", e.target.value)}
              />
            </div>
            <div>
              <label className={label}>Daily rate (₹)</label>
              <input
                type="number"
                min="0"
                className={inputCls}
                placeholder="e.g. 800"
                value={form.dailyRate}
                onChange={(e) => set("dailyRate", e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-card space-y-4">
          <h2 className="font-bold text-gray-900">Location</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>District *</label>
              <input
                className={inputCls}
                placeholder="e.g. Gurugram"
                value={form.district}
                onChange={(e) => set("district", e.target.value)}
                required
              />
            </div>
            <div>
              <label className={label}>City</label>
              <input
                className={inputCls}
                placeholder="e.g. Sector 15"
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Languages */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-card space-y-3">
          <h2 className="font-bold text-gray-900">Languages</h2>
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => toggleLang(l)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  form.languages.includes(l)
                    ? "bg-primary-600 text-white border-primary-600"
                    : "bg-white text-gray-600 border-gray-300 hover:border-primary-300"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Availability */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-card space-y-3">
          <div>
            <h2 className="font-bold text-gray-900">Availability</h2>
            <p className="text-xs text-gray-500 mt-0.5">Mark the days you're available to work (next 30 days).</p>
          </div>
          <AvailabilityPicker value={form.availability} onChange={(v) => set("availability", v)} />
          {form.availability.length > 0 && (
            <p className="text-xs text-gray-500">{form.availability.length} day(s) selected</p>
          )}
        </div>

        {err && <p className="text-red-600 text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-2">{err}</p>}
        {msg && <p className="text-green-700 text-sm bg-green-50 border border-green-100 rounded-lg px-3 py-2">{msg}</p>}

        <button
          disabled={isLoading}
          className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white py-3 rounded-xl font-semibold text-sm transition-colors"
        >
          {isLoading ? "Saving…" : "Save Worker Profile"}
        </button>
      </form>
    </div>
  );
}
