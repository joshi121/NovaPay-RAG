import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import User from "./src/models/UserModel.js";
import accountModel from "./src/models/accountmodels.js";

dotenv.config();

const createAdminAndAccount = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB...");

        const adminEmail = "anitajoshi68484@gmail.com";
        
        // Cleanup old admin user
        const existing = await User.findOne({ email: adminEmail });
        if (existing) {
            await User.deleteOne({ _id: existing._id });
            await accountModel.deleteMany({ user: existing._id });
        }

        const hashedPassword = await bcrypt.hash("AdminPass123!", 10);

        // 1. Create System User with systemUser: true
        const adminUser = await User.create({
            name: "System Admin Authority",
            email: adminEmail,
            password: hashedPassword,
            systemUser: true
        });

        // 2. Create System Account for initial deposits
        const systemAccount = await accountModel.create({
            user: adminUser._id,
            currency: "INR",
            status: "ACTIVE"
        });

        console.log("\n SUCCESS! System Admin & Account Recreated!");
        console.log("==============================================");
        console.log(" Admin Email:     ", adminUser.email);
        console.log(" Admin Password:  ", "AdminPass123!");
        console.log(" Admin User ID:   ", adminUser._id.toString());
        console.log(" System Account ID:", systemAccount._id.toString());
        console.log(" systemUser Flag: ", adminUser.systemUser);
        console.log("==============================================");

        process.exit(0);
    } catch (err) {
        console.error("Error creating admin:", err);
        process.exit(1);
    }
};

createAdminAndAccount();
