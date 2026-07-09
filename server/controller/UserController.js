import cloudinary from "../lib/cloudinary.js";
import { generateToken } from "../lib/utils.js";
import User from "../models/User.js";
import bcrypt from "bcryptjs";

// Regular expression to validate standard email formats
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Signup a new user
export const signup = async (req, res) => {
  try {
    const { fullName, email, password, bio } = req.body;

    // Type validation to prevent NoSQL object query injections
    if (
      typeof fullName !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      typeof bio !== "string"
    ) {
      return res.status(400).json({ success: false, message: "Invalid payload parameters types." });
    }

    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanBio = bio.trim();

    if (!cleanName || !cleanEmail || !password || !cleanBio) {
      return res.status(400).json({ success: false, message: "All fields are required." });
    }

    if (!EMAIL_REGEX.test(cleanEmail)) {
      return res.status(400).json({ success: false, message: "Invalid email address format." });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters long." });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "Account already exists." });
    }

    // Create and save new user
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const newUser = new User({
      fullName: cleanName,
      email: cleanEmail,
      password: hashedPassword,
      bio: cleanBio,
    });

    // Save record to database
    await newUser.save();

    const token = generateToken(newUser._id);

    return res.status(201).json({
      success: true,
      userData: {
        _id: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
        bio: newUser.bio,
        profilePic: newUser.profilePic,
        createdAt: newUser.createdAt,
      },
      token,
      message: "Account created successfully.",
    });
  } catch (error) {
    console.error("Error in signup:", error);
    return res.status(500).json({ success: false, message: "Server error: " + error.message });
  }
};

// Login user
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({ success: false, message: "Invalid payload parameters types." });
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required." });
    }

    const userData = await User.findOne({ email: cleanEmail });
    if (!userData) {
      return res.status(401).json({ success: false, message: "Invalid credentials." });
    }

    const isPasswordCorrect = await bcrypt.compare(password, userData.password);
    if (!isPasswordCorrect) {
      return res.status(401).json({ success: false, message: "Invalid credentials." });
    }

    const token = generateToken(userData._id);

    return res.status(200).json({
      success: true,
      userData: {
        _id: userData._id,
        fullName: userData.fullName,
        email: userData.email,
        bio: userData.bio,
        profilePic: userData.profilePic,
        createdAt: userData.createdAt,
      },
      token,
      message: "Login successful.",
    });
  } catch (error) {
    console.error("Error in login:", error);
    return res.status(500).json({ success: false, message: "Server error: " + error.message });
  }
};

// Get auth status
export const checkAuth = (req, res) => {
  return res.status(200).json({ success: true, user: req.user });
};

// Update profile fields
export const updateProfile = async (req, res) => {
  try {
    const { profilePic, bio, fullName } = req.body;
    const userId = req.user._id;

    if (
      (profilePic && typeof profilePic !== "string") ||
      (bio && typeof bio !== "string") ||
      (fullName && typeof fullName !== "string")
    ) {
      return res.status(400).json({ success: false, message: "Invalid updates format." });
    }

    const updates = {};
    if (fullName && fullName.trim()) updates.fullName = fullName.trim();
    if (bio && bio.trim()) updates.bio = bio.trim();

    if (profilePic) {
      const upload = await cloudinary.uploader.upload(profilePic);
      updates.profilePic = upload.secure_url;
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updates, { new: true }).select("-password");
    if (!updatedUser) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    return res.status(200).json({
      success: true,
      user: updatedUser,
      updatedUser,
      message: "Profile updated successfully.",
    });
  } catch (error) {
    console.error("Error in updateProfile:", error);
    return res.status(500).json({ success: false, message: "Server error: " + error.message });
  }
};