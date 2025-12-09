// src/routes/playRoutes.js
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import Play from "../models/Play.js";
import User from "../models/User.js"; // Needed for author search
import jwt from "jsonwebtoken";
import { protect, allowRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// ---------------- Multer setup for image & file uploads ----------------
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = "./uploads";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

// Accept images for coverImage and PDF/DOCX for playFile
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedImageTypes = ["image/jpeg", "image/png", "image/jpg"];
    const allowedDocTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (file.fieldname === "coverImage") {
      if (allowedImageTypes.includes(file.mimetype)) cb(null, true);
      else cb(new Error("Only JPG, JPEG, PNG images are allowed for cover image"));
    } else if (file.fieldname === "playFile") {
      if (allowedDocTypes.includes(file.mimetype)) cb(null, true);
      else cb(new Error("Only PDF or DOCX files are allowed for play preview"));
    } else {
      cb(new Error("Invalid file type"));
    }
  },
});

// For handling multiple fields: coverImage and playFile
const uploadFields = upload.fields([
  { name: "coverImage", maxCount: 1 },
  { name: "playFile", maxCount: 1 },
]);

// ------------------ GET Plays (Filters, Search, Pagination) ------------------
router.get("/", async (req, res) => {
  try {
    const {
      search,
      genre,
      fundingType,
      organizationType,
      pubDateFrom,
      pubDateTo,
      subDateFrom,
      subDateTo,
      minDuration,
      maxDuration,
      males,
      females,
      acts,
      page = 1,
      limit = 10,
    } = req.query;

    const filters = {};

    if (genre) filters.genre = genre;
    if (fundingType) filters.funding = fundingType;
    if (organizationType) filters.organizationType = organizationType;
    if (pubDateFrom || pubDateTo) {
      filters.publicationDate = {};
      if (pubDateFrom) filters.publicationDate.$gte = new Date(pubDateFrom);
      if (pubDateTo) filters.publicationDate.$lte = new Date(pubDateTo);
    }
    if (subDateFrom || subDateTo) {
      filters.submissionDate = {};
      if (subDateFrom) filters.submissionDate.$gte = new Date(subDateFrom);
      if (subDateTo) filters.submissionDate.$lte = new Date(subDateTo);
    }
    if (minDuration || maxDuration) {
      filters.duration = {};
      if (minDuration) filters.duration.$gte = parseInt(minDuration);
      if (maxDuration) filters.duration.$lte = parseInt(maxDuration);
    }
    if (males) filters.males = { $gte: parseInt(males) };
    if (females) filters.females = { $gte: parseInt(females) };
    if (acts) filters.acts = parseInt(acts);

    let query = Play.find(filters).populate("author", "_id firstName lastName");

    // ---------------- Search ----------------
    if (search) {
      const searchTrimmed = search.trim();
      const searchWords = searchTrimmed.split(" ");

      const regex = new RegExp(searchTrimmed, "i"); // full search string
      const wordRegexes = searchWords.map((w) => new RegExp(w, "i")); // individual words

      // Find authors that match firstName OR lastName OR fullName
      const matchingAuthors = await User.find({
        $or: [
          { firstName: { $in: wordRegexes } },
          { lastName: { $in: wordRegexes } },
          {
            $expr: {
              $regexMatch: {
                input: { $concat: ["$firstName", " ", "$lastName"] },
                regex: regex,
              },
            },
          },
        ],
      }).select("_id");

      const authorIds = matchingAuthors.map((u) => u._id);

      query = query.find({
        $or: [{ title: regex }, { abstract: regex }, { author: { $in: authorIds } }],
      });
    }

    const totalResults = await query.clone().countDocuments();
    const totalPages = Math.ceil(totalResults / parseInt(limit));
    const pageNum = parseInt(page);

    const plays = await query
      .skip((pageNum - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .sort({ title: 1 });

    const formattedPlays = plays.map((play) => ({
      ...play.toObject(),
      authorId: play.author?._id,
      author: play.author
        ? `${play.author.firstName} ${play.author.lastName}`
        : "Anonymous",
    }));

    res.json({
      plays: formattedPlays,
      totalResults,
      totalPages,
      currentPage: pageNum,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1,
    });
  } catch (err) {
    console.error("Error fetching plays:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ------------------ POST a New Play ------------------
router.post("/", protect, allowRoles(3, 4), uploadFields, async (req, res) => {
  try {
    const {
      title,
      publicationDate,
      acts,
      duration,
      total,
      males,
      females,
      funding,
      abstract,
      genre,
      organizationType,
    } = req.body;

    let coverImage = "";
    if (req.files?.coverImage?.[0]) {
      const imgData = fs.readFileSync(req.files.coverImage[0].path);
      coverImage = `data:${req.files.coverImage[0].mimetype};base64,${imgData.toString(
        "base64"
      )}`;
      fs.unlinkSync(req.files.coverImage[0].path);
    }

    let playFile = "";
    if (req.files?.playFile?.[0]) {
      const fileData = fs.readFileSync(req.files.playFile[0].path);
      playFile = {
        filename: req.files.playFile[0].originalname,
        mimetype: req.files.playFile[0].mimetype,
        data: fileData.toString("base64"),
      };
      fs.unlinkSync(req.files.playFile[0].path);
    }

    const play = new Play({
      title,
      author: req.user._id,
      publicationDate: publicationDate ? new Date(publicationDate) : undefined,
      submissionDate: new Date(),
      acts: acts ? Number(acts) : undefined,
      duration: duration ? Number(duration) : undefined,
      total: total ? Number(total) : undefined,
      males: males ? Number(males) : undefined,
      females: females ? Number(females) : undefined,
      funding,
      coverImage,
      playFile, // <<< Added for PDF/DOCX
      abstract,
      genre,
      organizationType,
    });

    await play.save();
    await play.populate("author", "firstName lastName");

    res.status(201).json({ message: "Play created successfully", play });
  } catch (err) {
    console.error("Error saving play:", err);
    res.status(500).json({ message: err.message });
  }
});

// ------------------ GET Single Play by ID ------------------
router.get("/:id", protect, async (req, res) => {
  try {
    const { id } = req.params;
    const play = await Play.findById(id).populate("author", "_id firstName lastName");
    if (!play) return res.status(404).json({ message: "Play not found" });
    res.json(play);
  } catch (err) {
    console.error("Error fetching play:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ------------------ PUT Update Play ------------------
router.put("/:id", protect, uploadFields, async (req, res) => {
  try {
    const { id } = req.params;
    const play = await Play.findById(id);
    if (!play) return res.status(404).json({ message: "Play not found" });

    if (String(req.user._id) !== String(play.author) && req.user.account < 4) {
      return res.status(403).json({ message: "Not authorized to edit this play" });
    }

    const {
      title,
      publicationDate,
      acts,
      duration,
      total,
      males,
      females,
      funding,
      abstract,
      genre,
      organizationType,
    } = req.body;

    if (title) play.title = title;
    if (publicationDate) play.publicationDate = new Date(publicationDate);
    if (acts) play.acts = Number(acts);
    if (duration) play.duration = Number(duration);
    if (total) play.total = Number(total);
    if (males) play.males = Number(males);
    if (females) play.females = Number(females);
    if (funding) play.funding = funding;
    if (abstract) play.abstract = abstract;
    if (genre) play.genre = genre;
    if (organizationType) play.organizationType = organizationType;

    if (req.files?.coverImage?.[0]) {
      const imgData = fs.readFileSync(req.files.coverImage[0].path);
      play.coverImage = `data:${req.files.coverImage[0].mimetype};base64,${imgData.toString(
        "base64"
      )}`;
      fs.unlinkSync(req.files.coverImage[0].path);
    }

    if (req.files?.playFile?.[0]) {
      const fileData = fs.readFileSync(req.files.playFile[0].path);
      play.playFile = {
        filename: req.files.playFile[0].originalname,
        mimetype: req.files.playFile[0].mimetype,
        data: fileData.toString("base64"),
      };
      fs.unlinkSync(req.files.playFile[0].path);
    }

    await play.save();
    res.json({ message: "Play updated successfully", play });
  } catch (err) {
    console.error("Error updating play:", err);
    res.status(500).json({ message: err.message });
  }
});

// ------------------ GET Play Sample ------------------
router.get("/sample/:id", protect, async (req, res) => {
  try {
    const { id } = req.params;
    const play = await Play.findById(id);
    if (!play) return res.status(404).json({ message: "Play not found" });

    if (!play.playFile || !play.playFile.data) {
      return res.status(404).json({ message: "No available play sample" });
    }

    const fileBuffer = Buffer.from(play.playFile.data, "base64");
    res.setHeader("Content-Disposition", `attachment; filename="${play.playFile.filename}"`);
    res.setHeader("Content-Type", play.playFile.mimetype);
    res.send(fileBuffer);
  } catch (err) {
    console.error("Error fetching play sample:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
