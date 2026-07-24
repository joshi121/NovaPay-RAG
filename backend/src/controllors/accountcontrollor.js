import accountModel from "../models/accountmodels.js";
import redisClient from "../config/redis.js";

export const registerAccount = async (req, res)=>{
    try {
        const user = req.user;
        // const existingAccount = await accountModel.findOne({ user: user._id, status: "ACTIVE" });
        // if (existingAccount) {
        //     return res.status(400).json({
        //         message: "Account already exists for this user",
        //         account: existingAccount 
        //     });
        // }
        // 1. Fixed: Added await and assigned to 'account' variable
        const account = await accountModel.create({ user: user._id  , currency: req.body.currency || "INR"});

        return res.status(201).json({
            message: "Account created successfully",
            account // Now this is defined!
        });
    } catch (error) {
        console.error("Account Creation Error:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
} 

export const getUserAccountsController = async (req, res)=> {

    const accounts = await accountModel.find({ user: req.user._id });

    res.status(200).json({
        accounts
    })
}

export const getAccountBalanceController = async(req, res)=> {
    const { accountId } = req.params;
    const cacheKey = `balance:${accountId}`;

    try {
        // 1. Check Redis cache first
        const cachedBalance = await redisClient.get(cacheKey);

        if (cachedBalance !== null) {
            console.log(`[REDIS CACHE] Cache Hit for balance of account: ${accountId} (Value: ₹${cachedBalance})`);
            return res.status(200).json({
                accountId: accountId,
                balance: parseFloat(cachedBalance)
            });
        }

        console.log(`[REDIS CACHE] Cache Miss for balance of account: ${accountId}. Fetching from MongoDB...`);

        // 2. Cache Miss: Query MongoDB
        const account = await accountModel.findOne({
            _id: accountId,
            user: req.user._id
        });

        if (!account) {
            return res.status(404).json({
                message: "Account not found"
            });
        }

        const balance = await account.getBalance();

        // 3. Store calculated balance in Redis with a 5-minute (300 seconds) Time-To-Live (TTL)
        await redisClient.setEx(cacheKey, 300, balance.toString());
        console.log(`[REDIS CACHE] Balance stored in cache: balance:${accountId} = ₹${balance}`);

        res.status(200).json({
            accountId: account._id,
            balance: balance
        });
    } catch (err) {
        console.error("Error in getAccountBalanceController (Redis Caching fallback):", err);
        
        // Fallback directly to MongoDB if Redis connection fails or errors
        try {
            const account = await accountModel.findOne({ _id: accountId, user: req.user._id });
            if (!account) return res.status(404).json({ message: "Account not found" });
            const balance = await account.getBalance();
            return res.status(200).json({ accountId, balance });
        } catch (fallbackErr) {
            return res.status(500).json({ message: "Internal Server Error" });
        }
    }
}


