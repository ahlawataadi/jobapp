import User from "../models/User.js";
import Vendor from "../models/Vendor.js";
import Job from "../models/Job.js";
import Application from "../models/Application.js";
import Payment from "../models/Payment.js";

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
};

const groupByDay = async (Model, since) => {
  const rows = await Model.aggregate([
    { $match: { createdAt: { $gte: since } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);
  return rows.map((r) => ({ date: r._id, count: r.count }));
};

// GET /api/admin/analytics
export const getAnalytics = async (req, res, next) => {
  try {
    const since = daysAgo(30);

    const [
      totalUsers,
      totalVendors,
      totalJobs,
      openJobs,
      totalApplications,
      activeUsers,
      suspendedUsers,
      usersByRoleAgg,
      vendorsByStatusAgg,
      jobsByDistrictAgg,
      paymentsTotalAgg,
      userSignups,
      vendorSignups,
      jobPostings,
      applicationsOverTime,
    ] = await Promise.all([
      User.countDocuments(),
      Vendor.countDocuments(),
      Job.countDocuments(),
      Job.countDocuments({ status: "open" }),
      Application.countDocuments(),
      User.countDocuments({ status: "active" }),
      User.countDocuments({ status: "suspended" }),
      User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]),
      Vendor.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Job.aggregate([
        { $match: { status: "open" } },
        { $group: { _id: "$location.district", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      Payment.aggregate([
        { $match: { status: "paid" } },
        { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
      ]),
      groupByDay(User, since),
      groupByDay(Vendor, since),
      groupByDay(Job, since),
      groupByDay(Application, since),
    ]);

    res.json({
      totals: {
        users: totalUsers,
        vendors: totalVendors,
        jobs: totalJobs,
        openJobs,
        applications: totalApplications,
        activeUsers,
        suspendedUsers,
        paymentsTotal: paymentsTotalAgg[0]?.total || 0,
        paymentsCount: paymentsTotalAgg[0]?.count || 0,
      },
      usersByRole: usersByRoleAgg.map((r) => ({ role: r._id, count: r.count })),
      vendorsByStatus: vendorsByStatusAgg.map((r) => ({ status: r._id, count: r.count })),
      jobsByDistrict: jobsByDistrictAgg.map((r) => ({ district: r._id || "Unknown", count: r.count })),
      trends: {
        userSignups,
        vendorSignups,
        jobPostings,
        applications: applicationsOverTime,
      },
    });
  } catch (err) {
    next(err);
  }
};
