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
  res.status(status).json({
    message: err.message || "Internal server error",
  });
};
