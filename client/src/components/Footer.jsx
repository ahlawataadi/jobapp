import { Link } from "react-router-dom";
import { useGetAdminConfigQuery } from "../store/jobsApi.js";

export default function Footer() {
  const { data } = useGetAdminConfigQuery();
  const siteName = data?.config?.siteName || "Haryana Job Marketplace";
  const tagline = data?.config?.metaDescription ||
    "Connecting job seekers with employers across Haryana — diagnostics, manufacturing, logistics, IT and more.";
  return (
    <footer className="bg-gray-900 text-gray-300" aria-label="Site footer">
      <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-5 gap-6 text-sm">
        <div>
          <h2 className="text-white font-semibold mb-2">{siteName}</h2>
          <p className="text-gray-400">{tagline}</p>
        </div>
        <nav aria-label="For job seekers">
          <h3 className="text-white font-medium mb-2">For Job Seekers</h3>
          <ul className="space-y-1">
            <li><Link to="/jobs" className="hover:text-white">Browse Jobs</Link></li>
            <li><Link to="/register" className="hover:text-white">Create Account</Link></li>
            <li><Link to="/applications" className="hover:text-white">My Applications</Link></li>
          </ul>
        </nav>
        <nav aria-label="For employers">
          <h3 className="text-white font-medium mb-2">For Employers</h3>
          <ul className="space-y-1">
            <li><Link to="/vendor/onboard" className="hover:text-white">Vendor Onboarding</Link></li>
            <li><Link to="/vendor" className="hover:text-white">Vendor Dashboard</Link></li>
          </ul>
        </nav>
        <nav aria-label="Company">
          <h3 className="text-white font-medium mb-2">Company</h3>
          <ul className="space-y-1">
            <li><Link to="/about" className="hover:text-white">About Us</Link></li>
            <li><Link to="/contact" className="hover:text-white">Contact Us</Link></li>
            <li><Link to="/privacy" className="hover:text-white">Privacy Policy</Link></li>
            <li><Link to="/terms" className="hover:text-white">Terms &amp; Conditions</Link></li>
          </ul>
        </nav>
        <div>
          <h3 className="text-white font-medium mb-2">Districts</h3>
          <p className="text-gray-400">
            Gurugram · Faridabad · Hisar · Panipat · Panchkula · Rohtak · Karnal · Ambala
          </p>
        </div>
      </div>
      <div className="border-t border-gray-800 py-4 text-center text-xs text-gray-500">
        <p>© {new Date().getFullYear()} Haryana Job Marketplace. All rights reserved.</p>
      </div>
    </footer>
  );
}
