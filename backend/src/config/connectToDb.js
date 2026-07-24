import mongoose from "mongoose"

export const ConnectToDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI); // 3. Added "await" and fixed "Process" to lowercase
        console.log(" MongoDB Connected Successfully");
    } catch (error) {
        console.error(" MongoDB Connection Failed:", error.message);
        process.exit(1); // Stop the app if the database connection fails
    }
    
}