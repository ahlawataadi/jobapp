import { useState } from "react";
import {
  useListBannersQuery,
  useCreateBannerMutation,
  useUpdateBannerMutation,
  useDeleteBannerMutation,
} from "../../store/jobsApi.js";
import Pagination from "../../components/Pagination.jsx";

const inputCls =
  "border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-400 focus:border-primary-400 outline-none";

const THEMES = ["primary", "accent", "green", "purple"];

const emptyForm = { title: "", subtitle: "", ctaText: "Learn more", ctaLink: "/jobs", theme: "primary", isActive: true };

export default function AdminBanners() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useListBannersQuery({ page, limit: 10 });
  const [createBanner, { isLoading: creating, error: createError }] = useCreateBannerMutation();
  const [updateBanner] = useUpdateBannerMutation();
  const [deleteBanner] = useDeleteBannerMutation();
  const [form, setForm] = useState(emptyForm);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await createBanner(form).unwrap();
      setForm(emptyForm);
    } catch {}
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-card">
        <h2 className="font-bold text-gray-900 mb-2">Homepage Offer Banner</h2>
        <p className="text-sm text-gray-500 mb-4">
          The most recently updated active banner is shown at the top of the homepage. Use the toggle to show/hide a banner.
        </p>

        {createError && (
          <p className="text-red-600 text-sm mb-3 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {createError?.data?.message || "Failed to create banner"}
          </p>
        )}

        <form onSubmit={handleCreate} className="space-y-3 text-sm mb-6 border-b border-gray-100 pb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              className={inputCls}
              placeholder="Title (e.g. Flat 20% off vendor signup fee!)"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <input
              className={inputCls}
              placeholder="Subtitle (optional)"
              value={form.subtitle}
              onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
            />
            <input
              className={inputCls}
              placeholder="CTA text"
              value={form.ctaText}
              onChange={(e) => setForm({ ...form, ctaText: e.target.value })}
            />
            <input
              className={inputCls}
              placeholder="CTA link (e.g. /jobs)"
              value={form.ctaLink}
              onChange={(e) => setForm({ ...form, ctaLink: e.target.value })}
            />
            <select className={inputCls} value={form.theme} onChange={(e) => setForm({ ...form, theme: e.target.value })}>
              {THEMES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                className="accent-primary-600"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              />
              Active (show on homepage)
            </label>
          </div>
          <button disabled={creating} className="bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white px-5 py-2 rounded-lg font-semibold transition-colors">
            {creating ? "Adding..." : "Add Banner"}
          </button>
        </form>

        {isLoading && <p className="text-sm text-gray-500">Loading...</p>}
        <div className="space-y-3">
          {data?.items?.map((banner) => (
            <div key={banner._id} className="border border-gray-200 rounded-lg p-4 flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <p className="font-medium text-gray-900">{banner.title}</p>
                {banner.subtitle && <p className="text-sm text-gray-500">{banner.subtitle}</p>}
                <p className="text-xs text-gray-400 mt-1">
                  Theme: {banner.theme} · CTA: "{banner.ctaText}" → {banner.ctaLink}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <label className="flex items-center gap-1.5 text-xs text-gray-600">
                  <input
                    type="checkbox"
                    className="accent-primary-600"
                    checked={banner.isActive}
                    onChange={(e) => updateBanner({ id: banner._id, isActive: e.target.checked })}
                  />
                  Active
                </label>
                <button
                  onClick={() => deleteBanner(banner._id)}
                  className="text-xs px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          {!isLoading && !data?.items?.length && <p className="text-sm text-gray-500">No banners created yet.</p>}
        </div>
        <Pagination page={page} pages={data?.pages} onChange={setPage} />
      </div>
    </div>
  );
}
