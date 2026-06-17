import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  useGetJobsQuery,
  useSuggestJobsQuery,
  useFeaturedVendorsQuery,
  useActiveBannerQuery,
  useListBlogsQuery,
} from "../store/jobsApi.js";
import DistrictMap from "../components/DistrictMap.jsx";
import JobCard from "../components/JobCard.jsx";
import Carousel from "../components/Carousel.jsx";


const THEME_STYLES = {
  primary: "from-primary-600 via-primary-500 to-accent-500",
  accent: "from-accent-500 via-orange-500 to-red-500",
  green: "from-green-600 via-emerald-500 to-teal-500",
  purple: "from-purple-600 via-violet-500 to-indigo-500",
};

function OfferBanner() {
  const { data } = useActiveBannerQuery();
  const banner = data?.banner;
  if (!banner) return null;

  return (
    <section
      className={`bg-gradient-to-r ${THEME_STYLES[banner.theme] || THEME_STYLES.primary} text-white rounded-2xl p-5 md:p-6 flex items-center justify-between gap-4 flex-wrap shadow-card-hover`}
    >
      <div>
        <h3 className="font-bold text-lg md:text-xl">{banner.title}</h3>
        {banner.subtitle && <p className="text-white/90 text-sm mt-1">{banner.subtitle}</p>}
      </div>
      {banner.ctaText && (
        <Link
          to={banner.ctaLink || "/jobs"}
          className="bg-white text-gray-900 font-semibold px-5 py-2 rounded-lg hover:bg-gray-100 transition-colors shrink-0"
        >
          {banner.ctaText}
        </Link>
      )}
    </section>
  );
}

function HeroSearch() {
  const [q, setQ] = useState("");
  const [radius, setRadius] = useState(25);
  const [focused, setFocused] = useState(false);
  const { data: suggestions } = useSuggestJobsQuery(q, { skip: q.trim().length < 2 });
  const navigate = useNavigate();

  const goSearch = (term) => {
    const params = new URLSearchParams();
    if (term) params.set("q", term);
    navigate(`/jobs?${params.toString()}`);
  };

  return (
    <div className="bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 text-white rounded-2xl p-6 md:p-12 relative overflow-hidden">
      <div className="absolute -top-10 -right-10 w-64 h-64 bg-white/5 rounded-full" />
      <div className="absolute bottom-0 left-1/3 w-48 h-48 bg-accent-500/10 rounded-full" />
      <div className="relative">
        <h1 className="text-2xl md:text-4xl font-extrabold mb-2 tracking-tight">
          Find your next job
        </h1>
        <p className="text-primary-100 mb-6 text-sm md:text-base">
          Search openings from medical labs, manufacturing, logistics, IT and more — all in one place.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            goSearch(q);
          }}
          className="bg-white rounded-xl p-2 flex flex-col md:flex-row gap-2 relative shadow-card-hover"
        >
          <div className="flex-1 relative">
            <input
              className="w-full border-0 focus:ring-2 focus:ring-primary-400 rounded-lg px-4 py-3 text-gray-900 outline-none"
              placeholder="Job title, e.g. Lab Technician"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setTimeout(() => setFocused(false), 100)}
            />
            {focused && suggestions?.items?.length > 0 && (
              <ul className="absolute z-10 top-full left-0 right-0 bg-white border rounded-lg mt-1 shadow-card-hover text-gray-900 text-sm overflow-hidden">
                {suggestions.items.map((s) => (
                  <li
                    key={s}
                    className="px-4 py-2 hover:bg-primary-50 cursor-pointer"
                    onMouseDown={() => {
                      setQ(s);
                      goSearch(s);
                    }}
                  >
                    {s}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex items-center gap-2 text-gray-700 text-sm px-3">
            <label className="whitespace-nowrap">Radius: {radius} km</label>
            <input
              type="range"
              min="5"
              max="100"
              step="5"
              value={radius}
              onChange={(e) => setRadius(e.target.value)}
              className="w-28 accent-primary-600"
            />
          </div>
          <button className="bg-accent-500 hover:bg-accent-600 text-white px-8 py-3 rounded-lg font-semibold transition-colors">
            Search
          </button>
        </form>
      </div>
    </div>
  );
}

function FeaturedCarousel() {
  const { data, isLoading } = useFeaturedVendorsQuery();
  const items = data?.items || [];

  if (isLoading || items.length === 0) return null;

  return (
    <section>
      <h2 className="text-xl font-bold text-gray-900 mb-3">Featured employers</h2>
      <Carousel itemWidth={230}>
        {items.map((v) => (
          <Link
            to={`/vendors/${v._id}`}
            key={v._id}
            className="min-w-[230px] bg-white border border-gray-200 rounded-xl p-4 shrink-0 shadow-card hover:shadow-card-hover transition-shadow"
          >
            <div className="w-10 h-10 rounded-lg bg-primary-50 text-primary-700 font-bold flex items-center justify-center mb-2 overflow-hidden">
              {v.logoUrl ? (
                <img src={v.logoUrl} alt={v.orgName} className="w-full h-full object-cover" />
              ) : (
                v.orgName?.[0]?.toUpperCase()
              )}
            </div>
            <div className="font-semibold text-gray-900 truncate">{v.orgName}</div>
            <div className="text-sm text-gray-600">{v.industry}</div>
            <div className="text-sm text-gray-500">{v.district}</div>
            <div className="text-sm text-yellow-600 mt-2 font-medium">
              {v.avgRating > 0 ? `★ ${v.avgRating.toFixed(1)}` : "New"}
            </div>
          </Link>
        ))}
      </Carousel>
    </section>
  );
}

function LiveFeed() {
  const { data, isLoading } = useGetJobsQuery({ sort: "recent", page: 1, limit: 3 });
  const items = data?.items || [];

  if (isLoading) {
    return (
      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-3">Recently posted</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="border border-gray-200 rounded-xl p-4 bg-white space-y-3">
              <div className="skeleton h-5 w-2/3 rounded" />
              <div className="skeleton h-4 w-1/2 rounded" />
              <div className="skeleton h-4 w-full rounded" />
              <div className="skeleton h-4 w-1/3 rounded" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-bold text-gray-900">Recently posted</h2>
        <Link to="/jobs" className="text-sm text-primary-700 font-medium hover:text-primary-900">View all jobs</Link>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {items.map((job) => (
          <JobCard key={job._id} job={job} />
        ))}
      </div>
    </section>
  );
}

function QuickFilters() {
  const categories = ["Lab Technician", "Driver", "Warehouse", "Production", "Admin", "IT Services"];
  return (
    <section className="flex flex-wrap gap-2">
      {categories.map((c) => (
        <Link
          key={c}
          to={`/jobs?category=${encodeURIComponent(c)}`}
          className="text-sm bg-white border border-gray-200 rounded-full px-4 py-1.5 font-medium text-gray-700 hover:border-primary-300 hover:text-primary-700 hover:bg-primary-50 transition-colors shadow-card"
        >
          {c}
        </Link>
      ))}
    </section>
  );
}

function BlogSection() {
  const { data, isLoading } = useListBlogsQuery({ limit: 3, page: 1 });
  const posts = data?.items || [];

  if (isLoading) return null;
  if (posts.length === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-bold text-gray-900">Career advice &amp; news</h2>
        <Link to="/blog" className="text-sm text-primary-700 font-medium hover:text-primary-900">
          View all articles
        </Link>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {posts.map((p) => (
          <Link
            key={p._id}
            to={`/blog/${p.slug}`}
            className="bg-white border border-gray-200 rounded-xl p-5 shadow-card hover:shadow-card-hover transition-shadow flex flex-col"
          >
            {p.coverImage && (
              <img src={p.coverImage} alt="" className="w-full h-32 object-cover rounded-lg mb-3" />
            )}
            {p.category && (
              <span className="inline-block self-start text-xs font-semibold text-primary-700 bg-primary-50 px-2.5 py-1 rounded-full mb-3">
                {p.category}
              </span>
            )}
            <h3 className="font-bold text-gray-900 leading-snug mb-2 line-clamp-2">{p.title}</h3>
            {p.excerpt && <p className="text-sm text-gray-600 line-clamp-2 flex-1">{p.excerpt}</p>}
            <p className="text-xs text-gray-400 mt-3 pt-3 border-t border-gray-100">
              {p.publishedAt ? new Date(p.publishedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : ""}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-10">
      <HeroSearch />
      <OfferBanner />
      <QuickFilters />
      <DistrictMap />
      <FeaturedCarousel />
      <LiveFeed />
      <BlogSection />
      <div className="text-center">
        <Link
          to="/jobs"
          className="inline-block bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors shadow-card hover:shadow-card-hover"
        >
          Browse all jobs
        </Link>
      </div>
    </div>
  );
}
