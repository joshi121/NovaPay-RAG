import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./src/models/UserModel.js";
import accountModel from "./src/models/accountmodels.js";
import ledgerModel from "./src/models/ledgermodel.js";
import transactionModel from "./src/models/transactionmodel.js";

dotenv.config();

const fundAdminOneCrore = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB...");

        const adminEmail = "anitajoshi68484@gmail.com";
        const adminUser = await User.findOne({ email: adminEmail });

        if (!adminUser) {
            console.error("Admin user not found!");
            process.exit(1);
        }

        let adminAccount = await accountModel.findOne({ user: adminUser._id });

        if (!adminAccount) {
            adminAccount = await accountModel.create({
                user: adminUser._id,
                currency: "INR",
                status: "ACTIVE"
            });
        }

        // Create initial funding transaction
        const systemTxn = await transactionModel.create({
            fromAccount: adminAccount._id,
            toAccount: adminAccount._id,
            amount: 10000000, // 1 Crore (10,000,000)
            idempotencyKey: "init_admin_1cr_" + Date.now(),
            status: "COMPLETED"
        });

        // Add CREDIT ledger entry for 1 Crore
        await ledgerModel.create({
            account: adminAccount._id,
            amount: 10000000,
            transaction: systemTxn._id,
            type: "CREDIT"
        });

        const newBalance = await adminAccount.getBalance();

        console.log("\n=======================================================");
        console.log(" SUCCESS! Admin Account funded with ₹1,00,00,000 (1 Crore)!");
        console.log("-------------------------------------------------------");
        console.log(" Admin Email:      ", adminUser.email);
        console.log(" Admin Account ID: ", adminAccount._id.toString());
        console.log(" Total Balance:     ₹" + newBalance.toLocaleString());
        console.log("=======================================================\n");

        process.exit(0);
    } catch (err) {
        console.error("Error funding admin account:", err);
        process.exit(1);
    }
};

fundAdminOneCrore();
