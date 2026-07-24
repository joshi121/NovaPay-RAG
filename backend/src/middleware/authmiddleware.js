import User from "../models/UserModel.js";
import jwt from "jsonwebtoken"
import tokenBlackListModel  from "../models/blacklistmodel.js"

export const isAunthenticated  = async (req, res , next)=>{
    const token = req.cookies?.token || req.headers.authorization?.split(" ")[1]; 
    if(!token){
        return res.status(401).json({
            message: "unauthorised user"
        });
    }
    const isBlacklisted = await tokenBlackListModel.findOne({ token })

    if (isBlacklisted) {
        return res.status(401).json({
            message: "Unauthorized access, token is invalid"
        })
    }

    try{
        const decoded = jwt.verify(token , process.env.JWT_SECRET_KEY);
        const user  = await User.findById(decoded.userId).select("-password")
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        req.user = user

        next();
    }
    catch(error){
        console.log(error);
        return res.status(201).json({
            message:"internal server error"
        });
    }
}

export const authSystemUserMiddleware=  async (req, res, next)=> {
    console.log("\n--- [START] System User Auth Middleware ---");
    const token = req.cookies.token || req.headers.authorization?.split(" ")[ 1 ];
    console.log("-> Extracted Token:", token ? `${token.substring(0, 15)}...` : "UNDEFINED / MISSING")

    if (!token) {
        return res.status(401).json({
            message: "Unauthorized access, token is missing"
        })
    }
    console.log("blacklist hone gya");
    const isBlacklisted = await tokenBlackListModel.findOne({ token })
    console.log("blacklist ho gya");
    if (isBlacklisted) {
        console.log(" FAILURE: Token is blacklisted (User already logged out).");
        return res.status(401).json({
            message: "Unauthorized access, token is invalid"
        })
    }
    console.log("age move kr rhe hai try ko");
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY)
        console.log("decoded done ")
        const user = await User.findById(decoded.userId).select("+systemUser")
        console.log("mil gya ");
        if (!user.systemUser) {
            return res.status(403).json({
                message: "Forbidden access, not a system user"
            })
        }

        req.user = user

        return next()
    }
    catch (err) {
        return res.status(401).json({
            message: "Unauthorized access, token is invalid"
        })
    }

}

