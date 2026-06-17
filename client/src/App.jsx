import { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { useDispatch } from "react-redux";
import { api } from "./api/axios.js";
import { setCredentials, logout } from "./store/authSlice.js";
import { useGetAdminConfigQuery } from "./store/jobsApi.js";
import Navbar from "./components/Navbar.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import JobSearch from "./pages/JobSearch.jsx";
import JobDetail from "./pages/JobDetail.jsx";
import Compare from "./pages/Compare.jsx";
import VendorOnboard from "./pages/VendorOnboard.jsx";
import VendorDashboard from "./pages/VendorDashboard.jsx";
import MyApplications from "./pages/MyApplications.jsx";
import AdminLayout from "./pages/admin/AdminLayout.jsx";
import AdminPanel from "./pages/AdminPanel.jsx";
import AdminAnalytics from "./pages/admin/AdminAnalytics.jsx";
import AdminPayments from "./pages/admin/AdminPayments.jsx";
import AdminWebhooks from "./pages/admin/AdminWebhooks.jsx";
import AdminBanners from "./pages/admin/AdminBanners.jsx";
import AdminImport from "./pages/admin/AdminImport.jsx";
import AdminJobs from "./pages/admin/AdminJobs.jsx";
import AdminBlog from "./pages/admin/AdminBlog.jsx";
import AdminFees from "./pages/admin/AdminFees.jsx";
import BlogList from "./pages/BlogList.jsx";
import BlogPost from "./pages/BlogPost.jsx";
import VendorProfile from "./pages/VendorProfile.jsx";
import Profile from "./pages/Profile.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import VerifyOtp from "./pages/VerifyOtp.jsx";
import AboutUs from "./pages/AboutUs.jsx";
import ContactUs from "./pages/ContactUs.jsx";
import PrivacyPolicy from "./pages/PrivacyPolicy.jsx";
import TermsAndConditions from "./pages/TermsAndConditions.jsx";
import AdminSettings from "./pages/admin/AdminSettings.jsx";
import AdminPages from "./pages/admin/AdminPages.jsx";
import AdminBroadcastEmail from "./pages/admin/AdminBroadcastEmail.jsx";
import AdminBroadcastSms from "./pages/admin/AdminBroadcastSms.jsx";
import WorkerSearch from "./pages/WorkerSearch.jsx";
import WorkerPublicProfile from "./pages/WorkerPublicProfile.jsx";
import WorkerProfileSetup from "./pages/WorkerProfileSetup.jsx";
import ChatPage from "./pages/ChatPage.jsx";
import Pricing from "./pages/Pricing.jsx";
import Footer from "./components/Footer.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";

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
      <Navbar />
      <div className="flex-1">
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
        <Route path="/jobs/:id" element={<JobDetail />} />
        <Route path="/compare" element={<Compare />} />
        <Route path="/vendors/:id" element={<VendorProfile />} />
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
      </div>
      <Footer />
    </div>
    </ThemeProvider>
  );
}
