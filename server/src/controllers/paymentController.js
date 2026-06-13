import crypto from "crypto";
import Razorpay from "razorpay";
import Payment from "../models/Payment.js";
import Vendor from "../models/Vendor.js";
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
    const razorpay = getRazorpay(keys);
    const order = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt: `vendor_${vendor._id}`,
      notes: { vendorId: vendor._id.toString() },
    });

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
