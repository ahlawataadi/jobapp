import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useGetJobsQuery } from "../store/jobsApi.js";
import FilterPanel from "../components/FilterPanel.jsx";
import JobCard from "../components/JobCard.jsx";
import CompareTray from "../components/CompareTray.jsx";
import Pagination from "../components/Pagination.jsx";

const MAX_COMPARE = 4;

export default function JobSearch() {
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState({
    sort: "recent",
    page: 1,
    q: searchParams.get("q") || undefined,
    category: searchParams.get("category") || undefined,
    district: searchParams.get("district") || undefined,
  });
  const [selected, setSelected] = useState([]);
  const { data, isLoading, error } = useGetJobsQuery(filters);

  const addToCompare = (job) => {
    setSelected((prev) => {
      if (prev.some((j) => j._id === job._id)) return prev;
      if (prev.length >= MAX_COMPARE) return prev;
      return [...prev, job];
    });
  };

  const toggleCompare = (job) => {
    setSelected((prev) =>
      prev.some((j) => j._id === job._id)
        ? prev.filter((j) => j._id !== job._id)
        : prev.length < MAX_COMPARE
        ? [...prev, job]
        : prev
    );
  };

  const removeFromCompare = (id) => {
    setSelected((prev) => prev.filter((j) => j._id !== id));
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-4 gap-6">
      <div className="md:col-span-1">
        <FilterPanel filters={filters} onChange={(f) => setFilters({ ...f, page: 1 })} />
      </div>
      <div className="md:col-span-3 space-y-4">
        <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm">
          <span className="text-gray-600">{data?.total ?? 0} jobs found</span>
          <div className="flex items-center gap-2">
            <label className="text-gray-600 font-medium">Sort by</label>
            <select
              className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-primary-400 outline-none"
              value={filters.sort || "recent"}
              onChange={(e) => setFilters({ ...filters, sort: e.target.value, page: 1 })}
            >
              <option value="recent">Most recent</option>
              <option value="salary">Highest salary</option>
              <option value="salary_asc">Lowest salary</option>
            </select>
          </div>
        </div>
        {isLoading &&
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border border-gray-200 rounded-xl p-4 bg-white space-y-3">
              <div className="skeleton h-5 w-2/3 rounded" />
              <div className="skeleton h-4 w-1/2 rounded" />
              <div className="skeleton h-4 w-full rounded" />
              <div className="skeleton h-4 w-1/3 rounded" />
            </div>
          ))}
        {error && (
          <p className="text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
            Failed to load jobs.
          </p>
        )}
        {data?.items?.length === 0 && (
          <p className="text-gray-500 bg-white border border-gray-200 rounded-xl p-6 text-center">
            No jobs found. Try adjusting filters.
          </p>
        )}
        {data?.items?.map((job) => (
          <JobCard
            key={job._id}
            job={job}
            selected={selected.some((j) => j._id === job._id)}
            onToggleCompare={toggleCompare}
          />
        ))}
        <Pagination page={filters.page} pages={data?.pages} onChange={(p) => setFilters({ ...filters, page: p })} />
        <CompareTray
          items={selected}
          onAdd={addToCompare}
          onRemove={removeFromCompare}
          onClear={() => setSelected([])}
        />
      </div>
    </div>
  );
}
