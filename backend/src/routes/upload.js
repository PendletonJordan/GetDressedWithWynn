import { Router } from "express";
import multer from "multer";
import { parsePdfEvents } from "../services/parser.js";

export const uploadRouter = Router();

// Store file in memory (no disk writes — safer for cloud deployments)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
  fileFilter: (req, file, cb) => {
    const allowed = ["application/pdf", "image/jpeg", "image/png"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF, JPG, and PNG files are supported"));
    }
  },
});

// POST /api/upload/:profileId
// Accepts a file upload, parses events, returns them for review
// The frontend shows a preview — events are only saved after user confirms
uploadRouter.post("/:profileId", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  // For now only PDF parsing is fully supported
  // Image OCR would require an additional service (e.g. Google Vision)
  if (req.file.mimetype !== "application/pdf") {
    return res.status(400).json({
      error: "Image parsing coming soon — please upload a PDF for now",
    });
  }

  try {
    const events = await parsePdfEvents(req.file.buffer, req.params.profileId);
    res.json({
      filename: req.file.originalname,
      parsed: events.length,
      events,
    });
  } catch (err) {
    console.error("PDF parsing failed:", err);
    res.status(500).json({ error: err.message });
  }
});
