import { useEffect, useState } from "react";
import { useGetAdminConfigQuery, useUpdateAdminConfigMutation } from "../../store/jobsApi.js";
import { applyTheme, FONT_OPTIONS } from "../../utils/applyTheme.js";

const DEFAULTS = { primaryColor: "#4f46e5", accentColor: "#f97316", fontFamily: "Inter" };

function ColorField({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-14 rounded-lg border border-gray-300 cursor-pointer bg-white"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-32 font-mono uppercase focus:ring-2 focus:ring-primary-400 outline-none"
        />
      </div>
    </div>
  );
}

export default function AdminTheme() {
  const { data: configData, isLoading } = useGetAdminConfigQuery();
  const [updateConfig, { isLoading: saving }] = useUpdateAdminConfigMutation();
  const [theme, setTheme] = useState(DEFAULTS);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (configData?.config?.theme) setTheme({ ...DEFAULTS, ...configData.config.theme });
  }, [configData]);

  // Live preview as the admin tweaks values.
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const set = (k, v) => setTheme((t) => ({ ...t, [k]: v }));

  const save = async () => {
    setMsg("");
    try {
      await updateConfig({ theme }).unwrap();
      setMsg("Theme saved.");
    } catch {
      setMsg("Failed to save theme.");
    }
  };

  const reset = () => setTheme(DEFAULTS);

  if (isLoading) return <div className="skeleton h-64 rounded-xl" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Theme &amp; Appearance</h1>
        <p className="text-sm text-gray-500 mt-1">
          Pick your brand colours and font. Changes preview instantly; click Save to apply for everyone.
        </p>
      </div>

      {msg && <p className="text-sm bg-green-50 border border-green-200 text-green-700 rounded-lg px-3 py-2">{msg}</p>}

      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-card space-y-5">
        <div className="grid sm:grid-cols-2 gap-5">
          <ColorField label="Primary colour" value={theme.primaryColor} onChange={(v) => set("primaryColor", v)} />
          <ColorField label="Accent colour" value={theme.accentColor} onChange={(v) => set("accentColor", v)} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Font</label>
            <select
              value={theme.fontFamily}
              onChange={(e) => set("fontFamily", e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:ring-2 focus:ring-primary-400 outline-none"
            >
              {FONT_OPTIONS.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            disabled={saving}
            onClick={save}
            className="bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white px-5 py-2 rounded-lg font-semibold text-sm transition-colors"
          >
            {saving ? "Saving…" : "Save theme"}
          </button>
          <button onClick={reset} className="text-sm text-gray-600 hover:text-gray-900 font-medium px-3">
            Reset to default
          </button>
        </div>
      </div>

      {/* Live preview */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-card space-y-4">
        <h2 className="font-bold text-gray-900">Preview</h2>
        <div className="flex flex-wrap gap-3 items-center">
          <button className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-semibold text-sm">Primary button</button>
          <button className="border border-primary-300 text-primary-700 hover:bg-primary-50 px-4 py-2 rounded-lg font-semibold text-sm">Secondary</button>
          <span className="bg-primary-50 text-primary-700 px-2.5 py-1 rounded-full text-xs font-medium">Primary tag</span>
          <span className="bg-accent-50 text-accent-600 px-2.5 py-1 rounded-full text-xs font-medium">Accent tag</span>
          <a className="text-primary-600 underline text-sm" href="#preview" onClick={(e) => e.preventDefault()}>A themed link</a>
        </div>
        <p className="text-sm text-gray-600">
          Body text uses the selected font. Headings, buttons, tags, links and highlights pick up the primary and accent colours across the whole app.
        </p>
      </div>
    </div>
  );
}
