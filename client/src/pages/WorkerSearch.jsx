import { useState } from "react";
import { useListWorkersQuery } from "../store/jobsApi.js";
import { WORKER_CATEGORIES } from "../constants/categories.js";
import WorkerCard from "../components/WorkerCard.jsx";

const inputCls =
  "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-400 focus:border-primary-400 outline-none";

const btn =
  "border border-gray-300 hover:border-primary-400 disabled:opacity-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors";

export default function WorkerSearch() {
  const [filters, setFilters] = useState({ category: "", skill: "", district: "", verified: "" });
  const [page, setPage] = useState(1);

  const { data, isLoading } = useListWorkersQuery({ ...filters, page, limit: 20 });
  const workers = data?.items || [];
  const pages = data?.pages || 1;

  const selectedCat = WORKER_CATEGORIES.find((c) => c.value === filters.category);

  const update = (k, v) => {
    setFilters((f) => ({ ...f, [k]: v, ...(k === "category" ? { skill: "" } : {}) }));
    setPage(1);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Find Workers</h1>
        <p className="text-gray-500 mt-1">Browse skilled workers by category, location, and availability.</p>
      </div>

      <div className="grid md:grid-cols-[240px_1fr] gap-6">
        {/* Filters */}
        <aside className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-card text-sm space-y-4">
            <h3 className="font-bold text-gray-900">Filters</h3>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Category</label>
              <select className={inputCls} value={filters.category} onChange={(e) => update("category", e.target.value)}>
                <option value="">All categories</option>
                {WORKER_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            {selectedCat && (
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Skill</label>
                <select className={inputCls} value={filters.skill} onChange={(e) => update("skill", e.target.value)}>
                  <option value="">All skills</option>
                  {selectedCat.skills.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block font-semibold text-gray-700 mb-1">District</label>
              <input
                className={inputCls}
                placeholder="e.g. Gurugram"
                value={filters.district}
                onChange={(e) => update("district", e.target.value)}
              />
            </div>

            <label className="flex items-center gap-2 text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                className="accent-primary-600"
                checked={filters.verified === "true"}
                onChange={(e) => update("verified", e.target.checked ? "true" : "")}
              />
              Verified workers only
            </label>

            {(filters.category || filters.skill || filters.district || filters.verified) && (
              <button
                onClick={() => { setFilters({ category: "", skill: "", district: "", verified: "" }); setPage(1); }}
                className="text-xs text-primary-600 hover:text-primary-800 font-medium"
              >
                Clear all
              </button>
            )}
          </div>
        </aside>

        {/* Results */}
        <div>
          {isLoading ? (
            <div className="grid sm:grid-cols-2 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="skeleton h-24 rounded-xl" />
              ))}
            </div>
          ) : workers.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-lg font-medium">No workers found</p>
              <p className="text-sm mt-1">Try adjusting your filters.</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500 mb-4">{data?.total || 0} workers found</p>
              <div className="grid sm:grid-cols-2 gap-4">
                {workers.map((w) => (
                  <WorkerCard key={w._id} worker={w} />
                ))}
              </div>

              {pages > 1 && (
                <div className="flex justify-center gap-2 mt-8">
                  <button className={btn} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
                  <span className="px-3 py-2 text-sm text-gray-600">Page {page} / {pages}</span>
                  <button className={btn} disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
