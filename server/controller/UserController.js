import cloudinary from "../lib/cloudinary.js";
import { generateToken } from "../lib/utils.js";
import User from "../models/User.js"
import bcrypt from "bcryptjs"

// Signuup a new user 
export const signup = async (req, res) => {     
    try {
        const { fullName, email, password ,bio} = req.body; 
        // Basic validation
        if (!fullName || !email || !password || !bio) {
            return res.status(400).json({ message: "All fields are required" });
        }   
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "Account already exists" });
        } 
        // Create new user
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const newUser = new User({ fullName, email, password: hashedPassword,bio
        }); 

        const token = generateToken(newUser._id);
        
        res.json({success : true,userData : newUser,token,message:"Account created successfully"})

    } catch (error) {
        console.error("Error in signup:", error);
        res.status(500).json({ message: "Server error" });
    } 
};

export const login = async (req,res)=>{
    try{
        const {email,password} = req.body;
        const userData = await User.findOne({email});
        if(!userData){
            return res.json({success:false,message:"Invalid credentials"});
        }
        const isPasswordCorrect = await bcrypt.compare(password,userData.password);
        if(!isPasswordCorrect){
            return res.json({success:false,message:"Invalid credentials"});
        }
        const token = generateToken(userData._id)
        res.json({success:true,userData,token,message:"Login successfully"})
    }catch(error){
        console.log(error.message);
        res.json({success:false,message:error.message})
    }
}

export const checkAuth = (req,res)=>{
  res.json({success:true,user:req.user});
}

export const updateProfile = async (req,res)=>{
    try {
        const {profilePic,bio,fullName} = req.body;

        const userId = req.user._id;
        let updatedUser;

        if(!profilePic){
            updatedUser = await User.findByIdAndUpdate(userId,{bio,fullName},{new:true})
        }else{
            const upload = await cloudinary.uploader.upload(profilePic);
            updatedUser = await User.findByIdAndUpdate(userId,{profilePic:upload.secure_url,bio,fullName},{new:true})
        }
        res.json({success:true,user:updatedUser,updatedUser,message:"Profile updated successfully"});
    } catch (error) {
        console.log(error.message);
        res.json({success:false,message:error.message})        
    }
}