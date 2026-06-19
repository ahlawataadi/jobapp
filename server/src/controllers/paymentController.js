import crypto from "crypto";
import Razorpay from "razorpay";
import Payment from "../models/Payment.js";
import Vendor from "../models/Vendor.js";
import User from "../models/User.js";
import { getConfig } from "../models/AdminConfig.js";

const getGatewayKeys = (config) => ({
  keyId: config.paymentGateway?.keyId || process.env.RAZORPAY_KEY_ID,
  keySecret: config.paymentGateway?.keySecret || process.env.RAZORPAY_KEY_SECRET,
  webhookSecret: config.paymentGateway?.webhookSecret || process.env.RAZORPAY_WEBHOOK_SECRET,
});

const getRazorpay = (keys) =>
  new Razorpay({
    key_id: keys.keyId,
    key_secret: keys.keySecret,
  });

// Treat empty OR placeholder values (e.g. the "rzp_test_xxxxxxxx" defaults from
// .env.example) as "not configured", so we fail fast with a clear message
// instead of letting the Razorpay SDK throw a 500.
const isPlaceholder = (v) => !v || /x{4,}/i.test(v);
const gatewayReady = (keys) => !isPlaceholder(keys.keyId) && !isPlaceholder(keys.keySecret);
const GATEWAY_NOT_CONFIGURED = "Online payments are not configured yet. Add valid Razorpay API keys in Admin → Settings → Payment gateway (or RAZORPAY_* env vars).";

// POST /api/payments/create-order
export const createOrder = async (req, res, next) => {
  try {
    const config = await getConfig();
    if (!config.paymentRequired) {
      return res.status(400).json({ message: "Payment is not required currently" });
    }

    const vendor = await Vendor.findOne({ userId: req.user._id });
    if (!vendor) return res.status(404).json({ message: "Vendor profile not found" });
    if (vendor.paymentStatus === "paid") {
      return res.status(400).json({ message: "Signup fee already paid" });
    }

    const amount = config.signupFeeAmount;
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Signup fee amount is not configured" });
    }

    const keys = getGatewayKeys(config);
    if (!gatewayReady(keys)) {
      return res.status(503).json({ message: GATEWAY_NOT_CONFIGURED });
    }
    const razorpay = getRazorpay(keys);
    let order;
    try {
      order = await razorpay.orders.create({
        amount,
        currency: "INR",
        receipt: `vendor_${vendor._id}`,
        notes: { vendorId: vendor._id.toString() },
      });
    } catch (gwErr) {
      const detail = gwErr?.error?.description || gwErr?.message || "request rejected";
      return res.status(502).json({ message: `Payment gateway error: ${detail}` });
    }

    await Payment.create({
      vendorId: vendor._id,
      razorpayOrderId: order.id,
      amount,
      status: "created",
    });

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: keys.keyId,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/payments/verify
// body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
export const verifyPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: "Missing payment verification fields" });
    }

    const config = await getConfig();
    const keys = getGatewayKeys(config);
    const expected = crypto
      .createHmac("sha256", keys.keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expected !== razorpay_signature) {
      return res.status(400).json({ message: "Invalid payment signature" });
    }

    const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });
    if (!payment) return res.status(404).json({ message: "Payment record not found" });

    payment.razorpayPaymentId = razorpay_payment_id;
    payment.razorpaySignature = razorpay_signature;
    payment.status = "paid";
    await payment.save();

    const vendor = await Vendor.findById(payment.vendorId);
    vendor.paymentStatus = "paid";
    vendor.status = "active";
    await vendor.save();

    res.json({ message: "Payment verified", vendor });
  } catch (err) {
    next(err);
  }
};

// POST /api/payments/subscribe/create-order
// body: { plan: "basic" | "pro" | "enterprise" }
export const createSubscriptionOrder = async (req, res, next) => {
  try {
    const { plan } = req.body;
    if (!["basic", "pro", "enterprise"].includes(plan)) {
      return res.status(400).json({ message: "Invalid plan. Choose: basic, pro, or enterprise" });
    }

    const config = await getConfig();
    const planKey = req.user.role === "vendor" ? "vendorPlans" : "seekerPlans";
    const planConfig = config[planKey]?.[plan] ?? config.subscriptionPlans?.[plan];
    if (planConfig === undefined || planConfig === null) {
      return res.status(400).json({ message: "Subscription plan not configured" });
    }

    // Free plan — activate immediately without Razorpay
    if ((planConfig.priceMonthly ?? 0) === 0) {
      const User = (await import("../models/User.js")).default;
      const user = await User.findById(req.user._id);
      user.subscription.plan = plan;
      const exp = new Date(); exp.setDate(exp.getDate() + 30);
      user.subscription.expiresAt = exp;
      await user.save();
      await Payment.create({ type: "subscription", userId: req.user._id, subscriptionPlan: plan, razorpayOrderId: `free_${Date.now()}`, amount: 0, status: "paid" });
      return res.json({ free: true, plan });
    }

    const amountPaise = Math.round(planConfig.priceMonthly * 100);
    const keys = getGatewayKeys(config);
    if (!gatewayReady(keys)) {
      return res.status(503).json({ message: GATEWAY_NOT_CONFIGURED });
    }
    const razorpay = getRazorpay(keys);

    let order;
    try {
      order = await razorpay.orders.create({
        amount: amountPaise,
        currency: "INR",
        // Razorpay caps receipt at 40 chars; full userId is in notes below.
        receipt: `sub_${req.user._id.toString().slice(-6)}_${Date.now()}`,
        notes: { userId: req.user._id.toString(), plan },
      });
    } catch (gwErr) {
      const detail = gwErr?.error?.description || gwErr?.message || "request rejected";
      return res.status(502).json({ message: `Payment gateway error: ${detail}` });
    }

    await Payment.create({
      type: "subscription",
      userId: req.user._id,
      subscriptionPlan: plan,
      razorpayOrderId: order.id,
      amount: amountPaise,
      status: "created",
    });

    res.json({ orderId: order.id, amount: order.amount, currency: order.currency, keyId: keys.keyId, plan });
  } catch (err) {
    next(err);
  }
};

// POST /api/payments/subscribe/verify
// body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
export const verifySubscriptionPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: "Missing payment verification fields" });
    }

    const config = await getConfig();
    const keys = getGatewayKeys(config);
    const expected = crypto
      .createHmac("sha256", keys.keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expected !== razorpay_signature) {
      return res.status(400).json({ message: "Invalid payment signature" });
    }

    const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id, type: "subscription" });
    if (!payment) return res.status(404).json({ message: "Payment record not found" });

    payment.razorpayPaymentId = razorpay_payment_id;
    payment.razorpaySignature = razorpay_signature;
    payment.status = "paid";
    await payment.save();

    const user = await User.findById(payment.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    user.subscription.plan = payment.subscriptionPlan;
    user.subscription.expiresAt = expiresAt;
    await user.save();

    res.json({ message: "Subscription activated", plan: payment.subscriptionPlan, expiresAt });
  } catch (err) {
    next(err);
  }
};

// POST /api/payments/webhook  (Razorpay webhook - source of truth)
export const razorpayWebhook = async (req, res, next) => {
  try {
    const signature = req.headers["x-razorpay-signature"];
    const config = await getConfig();
    const keys = getGatewayKeys(config);
    const expected = crypto
      .createHmac("sha256", keys.webhookSecret)
      .update(req.rawBody)
      .digest("hex");

    if (signature !== expected) {
      return res.status(400).json({ message: "Invalid webhook signature" });
    }

    const event = req.body;

    if (event.event === "payment.captured") {
      const orderId = event.payload.payment.entity.order_id;
      const paymentId = event.payload.payment.entity.id;

      const payment = await Payment.findOne({ razorpayOrderId: orderId });
      if (payment && payment.status !== "paid") {
        payment.status = "paid";
        payment.razorpayPaymentId = paymentId;
        await payment.save();

        const vendor = await Vendor.findById(payment.vendorId);
        if (vendor) {
          vendor.paymentStatus = "paid";
          vendor.status = "active";
          await vendor.save();
        }
      }
    }

    res.json({ received: true });
  } catch (err) {
    next(err);
  }
};
