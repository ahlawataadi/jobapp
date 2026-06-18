import { Link } from "react-router-dom";
import { useGetSavedJobsQuery } from "../store/jobsApi.js";
import JobCard from "../components/JobCard.jsx";

export default function SavedJobs() {
  const { data, isLoading } = useGetSavedJobsQuery();
  const jobs = data?.items || [];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Saved jobs</h1>
      <p className="text-gray-500 mb-6">Jobs you've bookmarked for later.</p>

      {isLoading ? (
        <div className="grid md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-40 rounded-xl" />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium">No saved jobs yet</p>
          <p className="text-sm mt-1">
            Browse <Link to="/jobs" className="text-primary-600 font-medium">jobs</Link> and tap “Save” to bookmark them.
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-4">
          {jobs.map((job) => (
            <JobCard key={job._id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}
