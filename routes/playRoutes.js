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

// ---------------- Multer setup for image uploads ----------------
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
const upload = multer({ storage });

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
      const wordRegexes = searchWords.map(w => new RegExp(w, "i")); // individual words

      // Find authors that match firstName OR lastName OR fullName
      const matchingAuthors = await User.find({
        $or: [
          { firstName: { $in: wordRegexes } },
          { lastName: { $in: wordRegexes } },
          { $expr: { $regexMatch: { input: { $concat: ["$firstName", " ", "$lastName"] }, regex: regex } } }
        ]
      }).select("_id");

      const authorIds = matchingAuthors.map(u => u._id);

      query = query.find({
        $or: [
          { title: regex },
          { abstract: regex },
          { author: { $in: authorIds } }
        ]
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
router.post(
  "/",
  protect,
  upload.single("coverImage"),
  allowRoles(3, 4),
  async (req, res) => {
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
        organizationType, // <<< ADDED
      } = req.body;

      let coverImage = "";
      if (req.file) {
        const imgData = fs.readFileSync(req.file.path);
        coverImage = `data:${req.file.mimetype};base64,${imgData.toString(
          "base64"
        )}`;
        fs.unlinkSync(req.file.path);
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
        abstract,
        genre,
        organizationType, // <<< ADDED
      });

      await play.save();
      await play.populate("author", "firstName lastName");

      res.status(201).json({ message: "Play created successfully", play });
    } catch (err) {
      console.error("Error saving play:", err);
      res.status(500).json({ message: err.message });
    }
  }
);

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
router.put("/:id", protect, upload.single("coverImage"), async (req, res) => {
  try {
    const { id } = req.params;
    const play = await Play.findById(id);
    if (!play) return res.status(404).json({ message: "Play not found" });

    // Authorization: only author or admin
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
      organizationType, // <<< ADDED
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
    if (organizationType) play.organizationType = organizationType; // <<< ADDED

    if (req.file) {
      const imgData = fs.readFileSync(req.file.path);
      play.coverImage = `data:${req.file.mimetype};base64,${imgData.toString(
        "base64"
      )}`;
      fs.unlinkSync(req.file.path);
    }

    await play.save();
    res.json({ message: "Play updated successfully", play });
  } catch (err) {
    console.error("Error updating play:", err);
    res.status(500).json({ message: err.message });
  }
});

export default router;
