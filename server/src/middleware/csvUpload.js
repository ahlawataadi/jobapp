import multer from "multer";

const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "text/csv" || file.originalname.toLowerCase().endsWith(".csv")) cb(null, true);
    else cb(new Error("Only CSV files are allowed"));
  },
});

export default csvUpload;
