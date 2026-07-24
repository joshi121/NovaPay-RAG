import mongoose from "mongoose"

const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const UserSchema= new mongoose.Schema({
    name:{
        type:"String",
        required :[true , "all input fields are required"],
        
    },
    email:{
        type:"string",
        required:[true , "all input fields are required"],
        unique : [true , "email already exists"],
        trim: true,
        lowercase: true, 
        match: [emailRegex, 'Please provide a valid email address']
    },
    password: {
        type: String,
        required:[true , "all input fields are required"],
        select: false
    },
    systemUser: {
        type: Boolean,
        default: false,
        immutable: true,
        select: false
    }
} , {
    timestamps :true
});

const User = mongoose.model("User" ,UserSchema);
export default User;