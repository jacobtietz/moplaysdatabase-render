import Play from "../models/Play.js";
import jwt from "jsonwebtoken";
import User from "../models/User.js"; // make sure User model is imported

// ------------------ GET Play by ID (public) ------------------
export const getPlayById = async (req, res) => {
  try {
    const { id } = req.params;
    const play = await Play.findById(id).populate("author", "_id firstName lastName");

    if (!play) return res.status(404).json({ message: "Play not found" });

    res.json({
      ...play.toObject(),
      authorId: play.author?._id,
      author: play.author ? `${play.author.firstName} ${play.author.lastName}` : "Anonymous",
    });
  } catch (err) {
    console.error("Error fetching play:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ------------------ GET All Plays with Search & Filters ------------------
export const getPlays = async (req, res) => {
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

    if (search) {
      // Case-insensitive search on title, abstract, or author's first/last name
      const regex = new RegExp(search, "i");

      // Get author IDs matching the search first or last name
      const matchingAuthors = await User.find({
        $or: [{ firstName: regex }, { lastName: regex }],
      }).select("_id");

      const authorIds = matchingAuthors.map((u) => u._id);

      query = query.find({
        $or: [
          { title: regex },
          { abstract: regex },
          { author: { $in: authorIds } },
        ],
      });
    }

    const totalResults = await query.clone().countDocuments();
    const totalPages = Math.ceil(totalResults / limit);
    const plays = await query
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const formattedPlays = plays.map((play) => ({
      ...play.toObject(),
      authorId: play.author?._id,
      author: play.author ? `${play.author.firstName} ${play.author.lastName}` : "Anonymous",
    }));

    res.json({
      plays: formattedPlays,
      totalResults,
      totalPages,
      page: parseInt(page),
    });
  } catch (err) {
    console.error("Error fetching plays:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ------------------ Generate Temporary Edit Token ------------------
export const generateEditToken = async (req, res) => {
  try {
    const { playId } = req.params;
    const play = await Play.findById(playId);

    if (!play) return res.status(404).json({ message: "Play not found" });

    // Only author or admin can get edit token
    if (req.user._id.toString() !== play.author.toString() && req.user.account !== 4) {
      return res.status(403).json({ message: "Not authorized to edit this play" });
    }

    const token = jwt.sign(
      { userId: req.user._id, account: req.user.account, playId },
      process.env.JWT_SECRET,
      { expiresIn: "15m" } // short-lived token
    );

    res.json({ editToken: token });
  } catch (err) {
    console.error("Error generating edit token:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ------------------ Update Play (requires temporary token) ------------------
export const updatePlay = async (req, res) => {
  try {
    const { playId } = req.params;
    const { title, genre, duration, males, females, acts, funding, abstract } = req.body;

    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "Missing token" });

    const token = authHeader.split(" ")[1];
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    if (decoded.playId !== playId) {
      return res.status(403).json({ message: "Token does not match this play" });
    }

    const play = await Play.findById(playId);
    if (!play) return res.status(404).json({ message: "Play not found" });

    // Check if the editor is the author or admin
    if (decoded.userId !== play.author.toString() && decoded.account !== 4) {
      return res.status(403).json({ message: "Not authorized to edit this play" });
    }

    // Update fields
    if (title) play.title = title;
    if (genre) play.genre = genre;
    if (duration) play.duration = duration;
    if (males !== undefined) play.males = males;
    if (females !== undefined) play.females = females;
    if (acts) play.acts = acts;
    if (funding) play.funding = funding;
    if (abstract) play.abstract = abstract;

    await play.save();
    res.json({ message: "Play updated successfully", play });
  } catch (err) {
    console.error("Error updating play:", err);
    res.status(500).json({ message: "Server error" });
  }
};
