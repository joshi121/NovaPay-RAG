import express from "express";
import cookieParser from "cookie-parser"; 
import cors from "cors";
import router from "./routes/UserRoutes.js"; 
import AccountRouter from "./routes/accountroutes.js";
import TransactionRouter from "./routes/transactionroutes.js";
import "./queues/emailQueue.js";

const app = express();

const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost"
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        const originNormalized = origin.replace(/\/$/, "");
        if (
            allowedOrigins.includes(originNormalized) || 
            originNormalized.endsWith(".onrender.com")
        ) {
            return callback(null, true);
        }
        return callback(null, true); // Fallback to allow easy developer onboarding
    },
    credentials: true
}));
app.use(express.json()); //service registration
app.use(cookieParser()); 

// Routes Setup
app.use("/api/payment/user", router); 
app.use("/api/payment/accounts", AccountRouter); //service registration
app.use("/api/payment/pay" , TransactionRouter);


export default app;