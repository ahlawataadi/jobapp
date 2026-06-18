export const notFound = (req, res, next) => {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` });
};

export const errorHandler = (err, req, res, next) => {
  console.error(err);

  if (err.code === 11000) {
    return res.status(409).json({ message: "Duplicate value", details: err.keyValue });
  }

  if (err.name === "ValidationError") {
    return res.status(400).json({ message: err.message });
  }

  const status = err.status || 500;
  // Don't leak internal error details on 5xx in production — surface a generic
  // message. Client (4xx) errors keep their message since they're intentional.
  const message =
    status >= 500 && process.env.NODE_ENV === "production"
      ? "Internal server error"
      : err.message || "Internal server error";
  res.status(status).json({ message });
};
