// Returns true when the user has a paid plan that hasn't expired.
// `user.subscription` = { plan: "none"|"basic"|"pro"|"enterprise", expiresAt }.
export function hasActiveSubscription(user) {
  const sub = user?.subscription;
  if (!sub || !sub.plan || sub.plan === "none") return false;
  if (sub.expiresAt && new Date(sub.expiresAt).getTime() < Date.now()) return false;
  return true;
}

// Express guard: 402 Payment Required when the user has no active plan.
// Premium features (e.g. intro video) must be enforced server-side, not just
// hidden in the UI.
export const requireActiveSubscription = (req, res, next) => {
  if (!hasActiveSubscription(req.user)) {
    return res.status(402).json({ message: "An active subscription is required for this feature." });
  }
  next();
};
