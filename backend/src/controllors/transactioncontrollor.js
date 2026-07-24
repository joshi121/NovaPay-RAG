import transactionModel from "../models/transactionmodel.js";
import ledgerModel from "../models/ledgermodel.js";
import accountModel from "../models/accountmodels.js";
import User from "../models/UserModel.js";
import { emailQueue } from "../queues/emailQueue.js";
import mongoose from "mongoose";
import redisClient from "../config/redis.js";

/**
 * - Create a new transaction
 * THE 10-STEP TRANSFER FLOW:
 * 1. Validate request
 * 2. Validate idempotency key
 * 3. Check account status
 * 4. Derive sender balance from ledger
 * 5. Create transaction (PENDING)
 * 6. Create DEBIT ledger entry
 * 7. Create CREDIT ledger entry
 * 8. Mark transaction COMPLETED
 * 9. Commit MongoDB session
 * 10. Send email notification
 */

async function createTransaction(req, res) {
    console.log("\n====== [START] USER TRANSACTION REQUEST ======");
    console.log("-> Body payload:", req.body);
    console.log("-> Authenticated user:", req.user?._id, req.user?.email);

    /**
     * 1. Validate request
     */
    let { fromAccount, toAccount, amount, idempotencyKey } = req.body

    if (!fromAccount || !toAccount || !amount || !idempotencyKey) {
        console.log("❌ FAILED AT STEP 1: Missing required fields");
        return res.status(400).json({
            message: "FromAccount, toAccount, amount and idempotencyKey are required"
        })
    }

    const fromUserAccount = await accountModel.findOne({ _id: fromAccount }).populate("user");
    if (!fromUserAccount) {
        console.log("❌ FAILED AT STEP 1: Invalid sender account ID");
        return res.status(400).json({ message: "Invalid sender account ID" });
    }

    // Resolve Email input for toAccount with intelligent currency matching
    if (toAccount.includes("@")) {
        console.log(`-> Resolving recipient email: ${toAccount}`);
        const recipientUser = await User.findOne({ email: toAccount.toLowerCase().trim() });
        if (!recipientUser) {
            console.log("❌ FAILED AT STEP 1: Recipient email user not found");
            return res.status(400).json({
                message: `No registered user found with email: ${toAccount}`
            });
        }
        
        // Try to match recipient account with the SAME CURRENCY as sender first
        let recipientAccount = await accountModel.findOne({ 
            user: recipientUser._id, 
            currency: fromUserAccount.currency,
            status: "ACTIVE" 
        });

        // Fallback to any active account if no same-currency account exists
        if (!recipientAccount) {
            recipientAccount = await accountModel.findOne({ 
                user: recipientUser._id, 
                status: "ACTIVE" 
            });
        }

        if (!recipientAccount) {
            console.log("❌ FAILED AT STEP 1: Recipient has no active accounts");
            return res.status(400).json({
                message: `The user ${toAccount} does not have any active accounts to receive money.`
            });
        }

        console.log(`-> Resolved email ${toAccount} to Account ID: ${recipientAccount._id} (Currency: ${recipientAccount.currency})`);
        toAccount = recipientAccount._id.toString();
    }

    const toUserAccount = await accountModel.findOne({ _id: toAccount }).populate("user");

    console.log("-> Sender Account found:", fromUserAccount ? fromUserAccount._id : "NOT FOUND");
    console.log("-> Receiver Account found:", toUserAccount ? toUserAccount._id : "NOT FOUND");

    if (!fromUserAccount || !toUserAccount) {
        console.log("❌ FAILED AT STEP 1: Invalid sender or receiver account ID");
        return res.status(400).json({
            message: `Invalid account ID. Sender: ${fromUserAccount ? 'Valid' : 'NOT FOUND'}, Receiver: ${toUserAccount ? 'Valid' : 'NOT FOUND'}`
        })
    }

    // BLOCK TRANSACTIONS TO SYSTEM ADMIN ACCOUNTS
    if (toUserAccount.user && toUserAccount.user.systemUser) {
        console.log("❌ FAILED AT STEP 1: Attempted transfer to System Admin Account");
        return res.status(400).json({
            message: "Forbidden: Normal users cannot send money to System Admin accounts"
        })
    }

    /**
     * 2. Validate idempotency key
     */
    const isTransactionAlreadyExists = await transactionModel.findOne({ idempotencyKey })
    if (isTransactionAlreadyExists) {
        console.log("⚠️ IDEMPOTENCY KEY DUPLICATE FOUND:", isTransactionAlreadyExists.status);
        if (isTransactionAlreadyExists.status === "COMPLETED") {
            return res.status(200).json({
                message: "Transaction already processed",
                transaction: isTransactionAlreadyExists
            })
        }
        if (isTransactionAlreadyExists.status === "PENDING") {
            return res.status(200).json({ message: "Transaction is still processing" })
        }
        if (isTransactionAlreadyExists.status === "FAILED") {
            return res.status(500).json({ message: "Transaction processing failed, please retry" })
        }
    }

    /**
     * 3. Check account status
     */
    if (fromUserAccount.status !== "ACTIVE" || toUserAccount.status !== "ACTIVE") {
        console.log("❌ FAILED AT STEP 3: Non-active account status");
        return res.status(400).json({
            message: "Both fromAccount and toAccount must be ACTIVE to process transaction"
        })
    }

    /**
     * 4. Derive sender balance from ledger
     */
    const balance = await fromUserAccount.getBalance()
    console.log(`-> Derived Sender Balance: ${balance}, Amount Requested: ${amount}`);

    if (balance < amount) {
        console.log("❌ FAILED AT STEP 4: Insufficient balance");
        return res.status(400).json({
            message: `Insufficient balance. Current balance is ${balance}. Requested amount is ${amount}`
        })
    }

    // MULTI-CURRENCY CONVERSION MATH (1 USD = 83 INR)
    const EXCHANGE_RATE_USD_TO_INR = 83.0;
    let creditAmount = Number(amount);
    const fromCurr = (fromUserAccount.currency || "INR").toUpperCase();
    const toCurr = (toUserAccount.currency || "INR").toUpperCase();

    if (fromCurr !== toCurr) {
        if (fromCurr === "USD" && toCurr === "INR") {
            creditAmount = Number((amount * EXCHANGE_RATE_USD_TO_INR).toFixed(2));
            console.log(`💱 [CURRENCY CONVERSION] $${amount} USD -> ₹${creditAmount} INR (Rate: ${EXCHANGE_RATE_USD_TO_INR})`);
        } else if (fromCurr === "INR" && toCurr === "USD") {
            creditAmount = Number((amount / EXCHANGE_RATE_USD_TO_INR).toFixed(2));
            console.log(`💱 [CURRENCY CONVERSION] ₹${amount} INR -> $${creditAmount} USD (Rate: ${(1 / EXCHANGE_RATE_USD_TO_INR).toFixed(4)})`);
        }
    }

    let transaction;
    const session = await mongoose.startSession()
    try {
        session.startTransaction()

        transaction = new transactionModel({
            fromAccount,
            toAccount,
            amount,
            idempotencyKey,
            status: "PENDING"
        })
        await transaction.save({ session })

        const debitLedgerEntry = new ledgerModel({
            account: fromAccount,
            amount: amount,
            transaction: transaction._id,
            type: "DEBIT"
        })
        await debitLedgerEntry.save({ session })

        const creditLedgerEntry = new ledgerModel({
            account: toAccount,
            amount: creditAmount, // Uses converted currency amount!
            transaction: transaction._id,
            type: "CREDIT"
        })
        await creditLedgerEntry.save({ session })

        transaction.status = "COMPLETED";
        await transaction.save({ session });

        await session.commitTransaction()
        session.endSession()
        console.log(" SUCCESS! Transaction committed to database!");

        // Evict Redis balance cache for both accounts to force next read from DB
        try {
            console.log(`[REDIS EVICT] Evicting balance cache for accounts: ${fromAccount}, ${toAccount}`);
            await redisClient.del(`balance:${fromAccount}`);
            await redisClient.del(`balance:${toAccount}`);
        } catch (redisErr) {
            console.error("⚠️ Redis cache eviction failed:", redisErr);
        }
    } catch (error) {
        await session.abortTransaction()
        session.endSession()
        console.error("❌ CRITICAL ERROR IN DB SESSION:", error)

        // Push failure email job to BullMQ queue asynchronously
        try {
            console.log(`[QUEUE] Queueing FAILURE email job for user: ${req.user.email}`);
            await emailQueue.add('sendEmail', {
                type: 'FAILURE',
                email: req.user.email,
                name: req.user.name,
                amount,
                toAccount
            });
        } catch (queueErr) {
            console.error("⚠️ Queue email job failed:", queueErr.message);
        }
        return res.status(400).json({
            message: "Transaction DB error: " + error.message,
        })
    }

    // Push success email job to BullMQ queue asynchronously
    try {
        console.log(`[QUEUE] Queueing SUCCESS email job for user: ${req.user.email}`);
        await emailQueue.add('sendEmail', {
            type: 'SUCCESS',
            email: req.user.email,
            name: req.user.name,
            amount,
            toAccount
        });
    } catch (queueErr) {
        console.error("⚠️ Queue email job failed:", queueErr.message);
    }

    return res.status(201).json({
        message: "Transaction completed successfully",
        transaction: transaction
    })
}


async function createInitialFundsTransaction(req, res) {
    console.log("\n====== [START] SYSTEM INITIAL FUNDS DEPOSIT REQUEST ======");
    console.log("-> Body payload:", req.body);
    console.log("-> Authenticated Admin user:", req.user?._id, req.user?.email);

    const { toAccount, amount, idempotencyKey } = req.body

    if (!toAccount || !amount || !idempotencyKey) {
        console.log("❌ FAILED AT INIT STEP 1: Missing required fields");
        return res.status(400).json({
            message: "toAccount, amount and idempotencyKey are required"
        })
    }

    const toUserAccount = await accountModel.findOne({ _id: toAccount })
    console.log("-> Target Account found:", toUserAccount ? toUserAccount._id : "NOT FOUND");

    if (!toUserAccount) {
        console.log("❌ FAILED AT INIT STEP 1: Target account ID invalid/not found in DB");
        return res.status(400).json({
            message: "Invalid target toAccount ID"
        })
    }

    const fromUserAccount = await accountModel.findOne({ user: req.user._id })
    console.log("-> Admin Host Account found:", fromUserAccount ? fromUserAccount._id : "NOT FOUND");
    
    if (!fromUserAccount) {
        console.log("❌ FAILED AT INIT STEP 1: Admin System user account not found in DB");
        return res.status(400).json({
            message: "System user account not found for current admin"
        })
    }

    if (fromUserAccount._id.toString() === toAccount.toString()) {
        console.log("❌ FAILED AT INIT STEP 1: Self-debit wash trading blunder");
        return res.status(400).json({
            message: "Transaction blunder: fromAccount and toAccount cannot be the same"
        })
    }

    const session = await mongoose.startSession()
    try {
        session.startTransaction()

        // MINIMAL FIX 3: Clean syntax without arrays, aligned with the first function
        const transaction = new transactionModel({
            fromAccount: fromUserAccount._id,
            toAccount,
            amount,
            idempotencyKey,
            status: "PENDING"
        })
        await transaction.save({ session })

        const debitLedgerEntry = new ledgerModel({
            account: fromUserAccount._id,
            amount: amount,
            transaction: transaction._id,
            type: "DEBIT"
        })
        await debitLedgerEntry.save({ session })

        //  MINIMAL FIX 4: Corrected to use strictly 'toAccount' to prevent balance loop bug
        const creditLedgerEntry = new ledgerModel({
            account: toAccount,
            amount: amount,
            transaction: transaction._id,
            type: "CREDIT"
        })
        await creditLedgerEntry.save({ session })

        await transactionModel.findOneAndUpdate(
            { _id: transaction._id },
            { status: "COMPLETED" },
            { session }
        )

        transaction.status = "COMPLETED" // Keep the local state sync for response representation

        await session.commitTransaction()
        session.endSession()

        // Evict Redis balance cache for the credited target account
        try {
            console.log(`[REDIS EVICT] Evicting balance cache for target account: ${toAccount}`);
            await redisClient.del(`balance:${toAccount}`);
            await redisClient.del(`balance:${fromUserAccount._id}`);
        } catch (redisErr) {
            console.error("⚠️ Redis cache eviction failed:", redisErr);
        }

        return res.status(201).json({
            message: "Initial funds transaction completed successfully",
            transaction: transaction
        })

    } catch (error) {
        await session.abortTransaction()
        session.endSession()
        console.error("Critical Error in createInitialFundsTransaction:", error)
        return res.status(500).json({
            message: "Internal server error during initial processing",
            error: error.message
        })
    }
}

async function getStatementController(req, res) {
    try {
        const { timeframe, view } = req.query;
        console.log(`\n====== [STATEMENT REQUEST] User: ${req.user?._id} (${req.user?.email}) | Timeframe: ${timeframe} | View: ${view} ======`);

        let accountQuery = {};

        if (req.user.systemUser && view === 'system') {
            accountQuery = {}; // All ledger entries across system for admin audit
        } else {
            const userAccounts = await accountModel.find({ user: req.user._id });
            const accountIds = userAccounts.map(a => a._id);
            accountQuery = { account: { $in: accountIds } };
        }

        let dateQuery = {};
        const now = new Date();

        if (timeframe === 'day') {
            const startDate = new Date();
            startDate.setHours(0, 0, 0, 0);
            dateQuery = { createdAt: { $gte: startDate } };
        } else if (timeframe === 'week') {
            const startDate = new Date();
            startDate.setDate(now.getDate() - 7);
            dateQuery = { createdAt: { $gte: startDate } };
        } else if (timeframe === 'month') {
            const startDate = new Date();
            startDate.setMonth(now.getMonth() - 1);
            dateQuery = { createdAt: { $gte: startDate } };
        }

        // Search ledger entries with safe population
        const ledgerEntries = await ledgerModel.find({
            ...accountQuery,
            ...dateQuery
        })
        .populate({
            path: 'account',
            model: 'Account',
            populate: {
                path: 'user',
                model: 'User',
                select: '_id name email systemUser'
            }
        })
        .populate({
            path: 'transaction',
            model: 'transaction',
            populate: [
                {
                    path: 'fromAccount',
                    model: 'Account',
                    populate: { path: 'user', model: 'User', select: '_id name email systemUser' }
                },
                {
                    path: 'toAccount',
                    model: 'Account',
                    populate: { path: 'user', model: 'User', select: '_id name email systemUser' }
                }
            ]
        })
        .sort({ createdAt: -1 });

        console.log(`-> Statement Query Success! Found ${ledgerEntries.length} entries.`);

        return res.status(200).json({
            count: ledgerEntries.length,
            timeframe: timeframe || 'all',
            statement: ledgerEntries
        });
    } catch (error) {
        console.error("❌ ERROR FETCHING STATEMENT:", error.stack || error);
        return res.status(500).json({ message: "Internal server error fetching statement", error: error.message });
    }
}

export default {
    createTransaction,
    createInitialFundsTransaction,
    getStatementController
}