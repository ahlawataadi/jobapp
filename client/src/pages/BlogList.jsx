import { useState } from "react";
import { Link } from "react-router-dom";
import { useListBlogsQuery } from "../store/jobsApi.js";

const btn =
  "border border-gray-300 hover:border-primary-400 disabled:opacity-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors";

export default function BlogList() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useListBlogsQuery({ page, limit: 9 });
  const posts = data?.items || [];
  const pages = data?.pages || 1;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-1">Blog</h1>
      <p className="text-gray-500 mb-6">News, hiring tips and updates.</p>

      {isLoading ? (
        <p className="text-gray-400">Loading…</p>
      ) : posts.length === 0 ? (
        <p className="text-gray-400">No posts published yet.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((p) => (
            <Link
              key={p._id}
              to={`/blog/${p.slug}`}
              className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-card hover:shadow-card-hover transition-shadow"
            >
              {p.coverImage ? (
                <img src={p.coverImage} alt="" className="w-full h-44 object-cover" />
              ) : (
                <div className="w-full h-44 bg-primary-50" />
              )}
              <div className="p-4">
                {p.category && <span className="text-xs font-semibold text-primary-600 uppercase tracking-wide">{p.category}</span>}
                <h2 className="font-bold text-gray-900 mt-1 line-clamp-2">{p.title}</h2>
                {p.excerpt && <p className="text-sm text-gray-600 mt-2 line-clamp-3">{p.excerpt}</p>}
                <p className="text-xs text-gray-400 mt-3">{p.publishedAt ? new Date(p.publishedAt).toLocaleDateString() : ""}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {pages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-8">
          <button className={btn} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Prev
          </button>
          <span className="px-3 py-2 text-sm text-gray-600">
            Page {page} / {pages}
          </span>
          <button className={btn} disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}
