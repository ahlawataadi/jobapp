import { useState } from "react";
import { useSuggestJobsQuery } from "../store/jobsApi.js";

const DISTRICTS = [
  "Gurugram",
  "Faridabad",
  "Hisar",
  "Panipat",
  "Panchkula",
  "Rohtak",
  "Karnal",
  "Ambala",
];

const JOB_TYPES = ["full-time", "part-time", "contract", "internship"];

const inputCls =
  "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-400 focus:border-primary-400 outline-none";

export default function FilterPanel({ filters, onChange }) {
  const update = (key, value) => onChange({ ...filters, [key]: value });
  const [focused, setFocused] = useState(false);
  const q = filters.q || "";
  const { data: suggestions } = useSuggestJobsQuery(q, { skip: q.trim().length < 2 });

  const hasFilters = filters.district || filters.jobType || filters.minSalary || filters.maxSalary || filters.q;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4 text-sm shadow-card">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gray-900">Filters</h3>
        {hasFilters && (
          <button
            onClick={() => onChange({ sort: filters.sort || "recent" })}
            className="text-xs text-primary-600 hover:text-primary-800 font-medium"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="relative">
        <label className="block font-semibold text-gray-700 mb-1">Search</label>
        <input
          className={inputCls}
          placeholder="Job title or keyword"
          value={q}
          onChange={(e) => update("q", e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 100)}
        />
        {focused && suggestions?.items?.length > 0 && (
          <ul className="absolute z-10 top-full left-0 right-0 bg-white border rounded-lg mt-1 shadow-card-hover overflow-hidden">
            {suggestions.items.map((s) => (
              <li
                key={s}
                className="px-3 py-2 hover:bg-primary-50 cursor-pointer"
                onMouseDown={() => update("q", s)}
              >
                {s}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-gray-100 pt-4">
        <label className="block font-semibold text-gray-700 mb-1">District</label>
        <select
          className={inputCls}
          value={filters.district || ""}
          onChange={(e) => update("district", e.target.value)}
        >
          <option value="">All districts</option>
          {DISTRICTS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block font-semibold text-gray-700 mb-1.5">Job Type</label>
        <div className="flex flex-wrap gap-1.5">
          {JOB_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => update("jobType", filters.jobType === t ? "" : t)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border capitalize transition-colors ${
                filters.jobType === t
                  ? "bg-primary-600 text-white border-primary-600"
                  : "bg-white text-gray-600 border-gray-300 hover:border-primary-300"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-gray-100 pt-4 flex gap-2">
        <div className="flex-1">
          <label className="block font-semibold text-gray-700 mb-1">Min Salary</label>
          <input
            type="number"
            className={inputCls}
            value={filters.minSalary || ""}
            onChange={(e) => update("minSalary", e.target.value)}
          />
        </div>
        <div className="flex-1">
          <label className="block font-semibold text-gray-700 mb-1">Max Salary</label>
          <input
            type="number"
            className={inputCls}
            value={filters.maxSalary || ""}
            onChange={(e) => update("maxSalary", e.target.value)}
          />
        </div>
      </div>

      <div className="border-t border-gray-100 pt-4">
        <label className="block font-semibold text-gray-700 mb-1">Sort</label>
        <select
          className={inputCls}
          value={filters.sort || "recent"}
          onChange={(e) => update("sort", e.target.value)}
        >
          <option value="recent">Most recent</option>
          <option value="salary">Highest salary</option>
        </select>
      </div>
    </div>
  );
}
