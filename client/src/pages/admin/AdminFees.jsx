import { useEffect, useState } from "react";
import { useGetAdminConfigQuery, useUpdateAdminConfigMutation } from "../../store/jobsApi.js";

const inputCls =
  "border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:ring-2 focus:ring-primary-400 focus:border-primary-400 outline-none";

const DEFAULT_PACKS = {
  starter:  { credits: 10,  price: 49  },
  standard: { credits: 25,  price: 199 },
  pro:      { credits: 40,  price: 499 },
};

const DEFAULT_PLANS = {
  basic:      { priceMonthly: 999,   features: "Up to 10 contact unlocks/month, basic support" },
  pro:        { priceMonthly: 2999,  features: "Up to 30 contact unlocks/month, priority support, featured listings" },
  enterprise: { priceMonthly: 9999,  features: "Unlimited contact unlocks, dedicated account manager, API access" },
};

const DEFAULT_FEATURED = { pricePerWeek: 99 };

function Section({ title, description, onSave, saving, children }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-card space-y-4">
      <div>
        <h2 className="font-bold text-gray-900 text-base">{title}</h2>
        {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
      </div>
      {children}
      <button
        disabled={saving}
        onClick={onSave}
        className="bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white px-5 py-2 rounded-lg font-semibold text-sm transition-colors"
      >
        {saving ? "Saving…" : "Save changes"}
      </button>
    </div>
  );
}

export default function AdminFees() {
  const { data: configData, isLoading } = useGetAdminConfigQuery();
  const [updateConfig, { isLoading: saving }] = useUpdateAdminConfigMutation();
  const [savedMsg, setSavedMsg] = useState("");

  const [signupFee, setSignupFee] = useState({ required: false, amount: 0 });
  const [packs, setPacks] = useState(DEFAULT_PACKS);
  const [plans, setPlans] = useState(DEFAULT_PLANS);
  const [featured, setFeatured] = useState(DEFAULT_FEATURED);

  useEffect(() => {
    const cfg = configData?.config;
    if (!cfg) return;

    setSignupFee({
      required: cfg.paymentRequired ?? false,
      amount: typeof cfg.signupFeeAmount === "number" ? cfg.signupFeeAmount / 100 : 0,
    });

    if (cfg.contactPacks) {
      setPacks({
        starter:  { ...DEFAULT_PACKS.starter,  ...cfg.contactPacks.starter  },
        standard: { ...DEFAULT_PACKS.standard, ...cfg.contactPacks.standard },
        pro:      { ...DEFAULT_PACKS.pro,       ...cfg.contactPacks.pro      },
      });
    }
    if (cfg.subscriptionPlans) {
      setPlans({
        basic:      { ...DEFAULT_PLANS.basic,      ...cfg.subscriptionPlans.basic      },
        pro:        { ...DEFAULT_PLANS.pro,         ...cfg.subscriptionPlans.pro        },
        enterprise: { ...DEFAULT_PLANS.enterprise, ...cfg.subscriptionPlans.enterprise },
      });
    }
    if (cfg.featuredWorkerFee) {
      setFeatured({ pricePerWeek: cfg.featuredWorkerFee.pricePerWeek ?? 99 });
    }
  }, [configData]);

  const notify = (msg) => { setSavedMsg(msg); setTimeout(() => setSavedMsg(""), 4000); };

  const saveSignupFee = async () => {
    try {
      await updateConfig({
        paymentRequired: signupFee.required,
        signupFeeAmount: Math.round(signupFee.amount * 100),
      }).unwrap();
      notify("Vendor signup fee saved.");
    } catch {
      notify("Failed to save.");
    }
  };

  const savePacks = async () => {
    try {
      await updateConfig({ contactPacks: packs }).unwrap();
      notify("Contact pack prices saved.");
    } catch {
      notify("Failed to save.");
    }
  };

  const savePlans = async () => {
    try {
      await updateConfig({ subscriptionPlans: plans }).unwrap();
      notify("Subscription plans saved.");
    } catch {
      notify("Failed to save.");
    }
  };

  const saveFeatured = async () => {
    try {
      await updateConfig({ featuredWorkerFee: featured }).unwrap();
      notify("Featured worker fee saved.");
    } catch {
      notify("Failed to save.");
    }
  };

  const setPackField = (tier, field, value) =>
    setPacks((p) => ({ ...p, [tier]: { ...p[tier], [field]: value } }));

  const setPlanField = (tier, field, value) =>
    setPlans((p) => ({ ...p, [tier]: { ...p[tier], [field]: value } }));

  if (isLoading) return <div className="skeleton h-64 rounded-xl" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Fees &amp; Pricing</h1>
        <p className="text-sm text-gray-500 mt-1">Configure all platform fees, contact pack prices, and subscription plans.</p>
      </div>

      {savedMsg && (
        <p className="text-sm bg-green-50 border border-green-200 text-green-700 rounded-lg px-3 py-2">{savedMsg}</p>
      )}

      {/* Vendor Signup Fee */}
      <Section
        title="Vendor Signup Fee"
        description="One-time fee charged when a new employer/vendor registers. Leave amount at ₹0 if you want to collect the fee later via a separate payment link."
        onSave={saveSignupFee}
        saving={saving}
      >
        <div className="space-y-3 text-sm">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 accent-primary-600"
              checked={signupFee.required}
              onChange={(e) => setSignupFee({ ...signupFee, required: e.target.checked })}
            />
            <span className="text-gray-700 font-medium">Require payment before vendor account is activated</span>
          </label>
          <div className="max-w-xs">
            <label className="block text-gray-600 mb-1">Signup fee amount (₹)</label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-400">₹</span>
              <input
                type="number"
                min="0"
                step="1"
                className={inputCls + " pl-7"}
                value={signupFee.amount}
                onChange={(e) => setSignupFee({ ...signupFee, amount: Number(e.target.value) })}
                disabled={!signupFee.required}
              />
            </div>
          </div>
        </div>
      </Section>

      {/* Contact Pack Pricing */}
      <Section
        title="Contact Pack Pricing"
        description="Vendors purchase credits to unlock worker phone numbers and emails. One credit = one contact unlock."
        onSave={savePacks}
        saving={saving}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-200">
                <th className="pb-2 font-medium">Pack name</th>
                <th className="pb-2 font-medium pl-4">Credits</th>
                <th className="pb-2 font-medium pl-4">Price (₹)</th>
                <th className="pb-2 font-medium pl-4 text-gray-400">Cost per contact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[
                { key: "starter",  label: "Starter" },
                { key: "standard", label: "Standard" },
                { key: "pro",      label: "Pro" },
              ].map(({ key, label }) => (
                <tr key={key}>
                  <td className="py-3 font-medium text-gray-900">{label}</td>
                  <td className="py-3 pl-4">
                    <input
                      type="number"
                      min="1"
                      className="border border-gray-300 rounded-lg px-3 py-1.5 w-24 text-sm focus:ring-2 focus:ring-primary-400 outline-none"
                      value={packs[key].credits}
                      onChange={(e) => setPackField(key, "credits", Number(e.target.value))}
                    />
                  </td>
                  <td className="py-3 pl-4">
                    <div className="relative w-28">
                      <span className="absolute left-3 top-1.5 text-gray-400">₹</span>
                      <input
                        type="number"
                        min="0"
                        className="border border-gray-300 rounded-lg px-3 py-1.5 pl-7 w-28 text-sm focus:ring-2 focus:ring-primary-400 outline-none"
                        value={packs[key].price}
                        onChange={(e) => setPackField(key, "price", Number(e.target.value))}
                      />
                    </div>
                  </td>
                  <td className="py-3 pl-4 text-gray-400">
                    ₹{packs[key].credits > 0 ? (packs[key].price / packs[key].credits).toFixed(1) : "—"}/contact
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Subscription Plans */}
      <Section
        title="Subscription Plans"
        description="Monthly plans for vendors. Features text is shown to vendors on the pricing page."
        onSave={savePlans}
        saving={saving}
      >
        <div className="space-y-4">
          {[
            { key: "basic",      label: "Basic",      badge: "bg-gray-100 text-gray-700" },
            { key: "pro",        label: "Pro",         badge: "bg-primary-50 text-primary-700" },
            { key: "enterprise", label: "Enterprise",  badge: "bg-accent-50 text-accent-700" },
          ].map(({ key, label, badge }) => (
            <div key={key} className="border border-gray-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badge}`}>{label}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <label className="block text-gray-600 mb-1">Monthly price (₹/month)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-400">₹</span>
                    <input
                      type="number"
                      min="0"
                      className={inputCls + " pl-7"}
                      value={plans[key].priceMonthly}
                      onChange={(e) => setPlanField(key, "priceMonthly", Number(e.target.value))}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-gray-600 mb-1">Features description</label>
                  <input
                    type="text"
                    className={inputCls}
                    value={plans[key].features}
                    onChange={(e) => setPlanField(key, "features", e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Featured Worker Fee */}
      <Section
        title="Featured Worker Fee"
        description="Fee charged to highlight a worker at the top of search results. Admin can also grant featured status manually from a worker's profile."
        onSave={saveFeatured}
        saving={saving}
      >
        <div className="max-w-xs text-sm">
          <label className="block text-gray-600 mb-1">Price per week (₹/week)</label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-gray-400">₹</span>
            <input
              type="number"
              min="0"
              className={inputCls + " pl-7"}
              value={featured.pricePerWeek}
              onChange={(e) => setFeatured({ pricePerWeek: Number(e.target.value) })}
            />
          </div>
        </div>
      </Section>
    </div>
  );
}
