import { useEffect, lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { useDispatch } from "react-redux";
import { api } from "./api/axios.js";
import { setCredentials, logout } from "./store/authSlice.js";
import { useGetAdminConfigQuery } from "./store/jobsApi.js";
import Navbar from "./components/Navbar.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Footer from "./components/Footer.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";

// Route components are code-split so the initial bundle stays small; the admin
// area, charts, and editor only load when their route is actually visited.
const Home = lazy(() => import("./pages/Home.jsx"));
const Login = lazy(() => import("./pages/Login.jsx"));
const Register = lazy(() => import("./pages/Register.jsx"));
const JobSearch = lazy(() => import("./pages/JobSearch.jsx"));
const JobDetail = lazy(() => import("./pages/JobDetail.jsx"));
const Compare = lazy(() => import("./pages/Compare.jsx"));
const VendorOnboard = lazy(() => import("./pages/VendorOnboard.jsx"));
const VendorDashboard = lazy(() => import("./pages/VendorDashboard.jsx"));
const MyApplications = lazy(() => import("./pages/MyApplications.jsx"));
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout.jsx"));
const AdminPanel = lazy(() => import("./pages/AdminPanel.jsx"));
const AdminAnalytics = lazy(() => import("./pages/admin/AdminAnalytics.jsx"));
const AdminPayments = lazy(() => import("./pages/admin/AdminPayments.jsx"));
const AdminWebhooks = lazy(() => import("./pages/admin/AdminWebhooks.jsx"));
const AdminBanners = lazy(() => import("./pages/admin/AdminBanners.jsx"));
const AdminImport = lazy(() => import("./pages/admin/AdminImport.jsx"));
const AdminJobs = lazy(() => import("./pages/admin/AdminJobs.jsx"));
const AdminBlog = lazy(() => import("./pages/admin/AdminBlog.jsx"));
const AdminFees = lazy(() => import("./pages/admin/AdminFees.jsx"));
const BlogList = lazy(() => import("./pages/BlogList.jsx"));
const BlogPost = lazy(() => import("./pages/BlogPost.jsx"));
const VendorProfile = lazy(() => import("./pages/VendorProfile.jsx"));
const Profile = lazy(() => import("./pages/Profile.jsx"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword.jsx"));
const ResetPassword = lazy(() => import("./pages/ResetPassword.jsx"));
const VerifyOtp = lazy(() => import("./pages/VerifyOtp.jsx"));
const AboutUs = lazy(() => import("./pages/AboutUs.jsx"));
const ContactUs = lazy(() => import("./pages/ContactUs.jsx"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy.jsx"));
const TermsAndConditions = lazy(() => import("./pages/TermsAndConditions.jsx"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings.jsx"));
const AdminPages = lazy(() => import("./pages/admin/AdminPages.jsx"));
const AdminBroadcastEmail = lazy(() => import("./pages/admin/AdminBroadcastEmail.jsx"));
const AdminBroadcastSms = lazy(() => import("./pages/admin/AdminBroadcastSms.jsx"));
const WorkerSearch = lazy(() => import("./pages/WorkerSearch.jsx"));
const WorkerPublicProfile = lazy(() => import("./pages/WorkerPublicProfile.jsx"));
const WorkerProfileSetup = lazy(() => import("./pages/WorkerProfileSetup.jsx"));
const ChatPage = lazy(() => import("./pages/ChatPage.jsx"));
const Pricing = lazy(() => import("./pages/Pricing.jsx"));

function SiteMeta() {
  const { data } = useGetAdminConfigQuery();
  useEffect(() => {
    const config = data?.config;
    if (!config) return;
    if (config.siteTitle) document.title = config.siteTitle;
    if (config.metaDescription) {
      let tag = document.querySelector('meta[name="description"]');
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute("name", "description");
        document.head.appendChild(tag);
      }
      tag.setAttribute("content", config.metaDescription);
    }
  }, [data]);
  return null;
}

function AnalyticsScript() {
  const { data } = useGetAdminConfigQuery();
  useEffect(() => {
    const script = data?.config?.analyticsScript;
    if (!script) return;
    const container = document.createElement("div");
    container.innerHTML = script;
    const nodes = [...container.childNodes];
    nodes.forEach((node) => {
      if (node.tagName === "SCRIPT") {
        const s = document.createElement("script");
        [...node.attributes].forEach((attr) => s.setAttribute(attr.name, attr.value));
        s.text = node.textContent;
        document.head.appendChild(s);
      } else {
        document.head.appendChild(node);
      }
    });
  }, [data]);
  return null;
}

export default function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    // Try to silently restore session via refresh-token cookie on app load
    api
      .post("/auth/refresh")
      .then(({ data }) => dispatch(setCredentials(data)))
      .catch(() => dispatch(logout()));
  }, [dispatch]);

  return (
    <ThemeProvider>
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <SiteMeta />
      <AnalyticsScript />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-primary-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm focus:font-semibold"
      >
        Skip to main content
      </a>
      <Navbar />
      <main id="main-content" className="flex-1">
      <Suspense fallback={<div className="max-w-6xl mx-auto px-4 py-10"><div className="skeleton h-64 rounded-xl" /></div>}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-otp" element={<VerifyOtp />} />
        <Route path="/about" element={<AboutUs />} />
        <Route path="/contact" element={<ContactUs />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsAndConditions />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/blog" element={<BlogList />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
        <Route path="/workers" element={<WorkerSearch />} />
        <Route path="/workers/:id" element={<WorkerPublicProfile />} />
        <Route
          path="/worker-profile"
          element={
            <ProtectedRoute roles={["seeker"]}>
              <WorkerProfileSetup />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <ChatPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat/:userId"
          element={
            <ProtectedRoute>
              <ChatPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route path="/jobs" element={<JobSearch />} />
        <Route
          path="/jobs/:id"
          element={
            <ProtectedRoute>
              <JobDetail />
            </ProtectedRoute>
          }
        />
        <Route path="/compare" element={<Compare />} />
        <Route
          path="/vendors/:id"
          element={
            <ProtectedRoute>
              <VendorProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/vendor/onboard"
          element={
            <ProtectedRoute roles={["vendor"]}>
              <VendorOnboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/vendor"
          element={
            <ProtectedRoute roles={["vendor"]}>
              <VendorDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/applications"
          element={
            <ProtectedRoute roles={["seeker", "vendor"]}>
              <MyApplications />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={["admin"]}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminPanel />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="jobs" element={<AdminJobs />} />
          <Route path="blog" element={<AdminBlog />} />
          <Route path="payments" element={<AdminPayments />} />
          <Route path="banners" element={<AdminBanners />} />
          <Route path="webhooks" element={<AdminWebhooks />} />
          <Route path="import" element={<AdminImport />} />
          <Route path="pages" element={<AdminPages />} />
          <Route path="fees" element={<AdminFees />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="broadcasts/email" element={<AdminBroadcastEmail />} />
          <Route path="broadcasts/sms" element={<AdminBroadcastSms />} />
        </Route>
      </Routes>
      </Suspense>
      </main>
      <Footer />
    </div>
    </ThemeProvider>
  );
}
