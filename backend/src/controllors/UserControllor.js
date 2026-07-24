//register controller and Login controllor 
import User from "../models/UserModel.js"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import {sendRegistrationEmail} from "../services/email.service.js"
import tokenBlackListModel from "../models/blacklistmodel.js"

export const Register = async (req ,res)=>{
    try {
        const {name , email , password} = req.body;
        const isUser = await User.findOne({email});
        if(isUser){
            return res.status(500).json({
                message:"user already registered"
            });
        }
        const Hashedpassword =await  bcrypt.hash(password ,10);
        const newUser =await User.create({
            name,
            email,
            password:Hashedpassword
        })

        const token = jwt.sign({userId:newUser._id} , process.env.JWT_SECRET_KEY, {expiresIn : '1d'});

        res.cookie("token", token ,
            {
                httpOnly:true,
                maxAge: 24 * 60 * 60 * 1000
            }
        );

        try {
            await sendRegistrationEmail(newUser.email, newUser.name);
        } catch (emailErr) {
            console.error("Email sending failed silently:", emailErr);
            // Email fail hone par response crash nahi hona chahiye, isliye isko alag catch me dala
        }

        res.status(201).json({
            message:"account created successfully",    
            id : newUser._id,
            name : newUser.name,
            email: newUser.email
            
        });

        
    
    }catch(error){
        console.error("Registration Error:", error);
        return res.status(401).json({
            message:"internal Server Error"
        })
    }
}

export const Login = async (req , res)=>{
    try {
        const {email , password} = req.body;
        const isUser = await User.findOne({email}).select("+password");;
        if(!isUser){
            return res.status(401).json({
                message:"invalid email or password"
            });
        }
        const userExists =await  bcrypt.compare(password , isUser.password);

        if(!userExists){
            return res.status(401).json({
                message:"invalid email or password"
            });
        }

        const token = jwt.sign({userId:isUser._id} , process.env.JWT_SECRET_KEY, {expiresIn : '1d'});

        res.cookie("token", token ,
            {
                httpOnly:true,
                maxAge: 24 * 60 * 60 * 1000
            }
        );

        res.status(200).json({
            message:"logged in successfully",    
            id : isUser._id,
            name : isUser.name,
            email: isUser.email,
            systemUser: isUser.systemUser || false
        });
    
    }catch(error){
        console.error("Registration Error:", error);
        return res.status(500).json({
            message:"internal Server Error"
        })
    }

}

export const Logout =  async (req, res)=> {
    const token = req.cookies?.token || req.headers.authorization?.split(" ")[ 1 ]

    if (!token) {
        return res.status(200).json({
            message: "User logged out successfully"
        })
    }



    await tokenBlackListModel.create({
        token: token
    })

    res.clearCookie("token")

    res.status(200).json({
        message: "User logged out successfully"
    })

}

import chatModel from "../models/chatmodel.js";

export const getChatHistory = async (req, res) => {
    try {
        const userId = req.user._id;
        let chat = await chatModel.findOne({ user: userId });
        if (!chat) {
            chat = await chatModel.create({ user: userId, messages: [] });
        }
        return res.status(200).json({ messages: chat.messages });
    } catch (error) {
        console.error("Error fetching chat history:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const saveChatMessage = async (req, res) => {
    try {
        const userId = req.user._id;
        const { role, content } = req.body;
        if (!role || !content) {
            return res.status(400).json({ message: "role and content are required" });
        }

        let chat = await chatModel.findOne({ user: userId });
        if (!chat) {
            chat = new chatModel({ user: userId, messages: [] });
        }

        chat.messages.push({ role, content });
        await chat.save();

        return res.status(201).json({ message: "Message saved successfully", chatMessage: chat.messages[chat.messages.length - 1] });
    } catch (error) {
        console.error("Error saving chat message:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
