import mongoose from "mongoose";

const PlaySchema = new mongoose.Schema({
  title: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  publicationDate: { type: Date },
  submissionDate: { type: Date, default: Date.now },
  acts: { type: Number },
  duration: { type: Number }, 
  total: { type: Number },
  males: { type: Number },
  females: { type: Number },
  funding: { type: String },
  coverImage: { type: String },
  abstract: { type: String },
  genre: { type: String },
}, { timestamps: true });

const Play = mongoose.model("Play", PlaySchema);
export default Play;
