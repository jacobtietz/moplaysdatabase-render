// backend/models/User.js
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// -------------------- Profile Subschema --------------------
const ProfileSchema = new mongoose.Schema(
  {
    profilePicture: { type: String, default: "" },
    description: { type: String, default: "" },
    biography: { type: String, default: "" },
    companyName: { type: String, default: "" },
    street: { type: String, default: "" },
    stateCity: { type: String, default: "" },
    country: { type: String, default: "" },
    website: { type: String, default: "" },
  },
  { _id: false }
);

// -------------------- Main User Schema --------------------
const UserSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    password: { type: String, required: true },

    // Account types:
    // 0 = Educator, 1 = Playwright, 2 = Unlocked Educator, 3 = Unlocked Playwright, 4 = Admin
    account: { type: Number, required: true },

    // Whether others can contact them
    contact: { type: Number, default: 0 }, // 0 = No, 1 = Yes
    schoolName: { type: String, default: "" },

    // Optional playwright profile info
    profile: { type: ProfileSchema, default: {} },

    // For password reset flows
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
  },
  { timestamps: true }
);

// -------------------- Password Hashing --------------------
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// -------------------- Password Comparison --------------------
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// -------------------- Model Export --------------------
const User = mongoose.model("User", UserSchema);
export default User;
