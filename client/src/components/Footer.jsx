import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-5 gap-6 text-sm">
        <div>
          <h3 className="text-white font-semibold mb-2">Haryana Job Marketplace</h3>
          <p className="text-gray-400">
            Connecting job seekers with employers across Haryana — diagnostics, manufacturing,
            logistics, IT and more.
          </p>
        </div>
        <div>
          <h4 className="text-white font-medium mb-2">For Job Seekers</h4>
          <ul className="space-y-1">
            <li><Link to="/jobs" className="hover:text-white">Browse Jobs</Link></li>
            <li><Link to="/register" className="hover:text-white">Create Account</Link></li>
            <li><Link to="/applications" className="hover:text-white">My Applications</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-medium mb-2">For Employers</h4>
          <ul className="space-y-1">
            <li><Link to="/vendor/onboard" className="hover:text-white">Vendor Onboarding</Link></li>
            <li><Link to="/vendor" className="hover:text-white">Vendor Dashboard</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-medium mb-2">Company</h4>
          <ul className="space-y-1">
            <li><Link to="/about" className="hover:text-white">About Us</Link></li>
            <li><Link to="/contact" className="hover:text-white">Contact Us</Link></li>
            <li><Link to="/privacy" className="hover:text-white">Privacy Policy</Link></li>
            <li><Link to="/terms" className="hover:text-white">Terms &amp; Conditions</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-medium mb-2">Districts</h4>
          <p className="text-gray-400">
            Gurugram · Faridabad · Hisar · Panipat · Panchkula · Rohtak · Karnal · Ambala
          </p>
        </div>
      </div>
      <div className="border-t border-gray-800 py-4 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} Haryana Job Marketplace. All rights reserved.
      </div>
    </footer>
  );
}
