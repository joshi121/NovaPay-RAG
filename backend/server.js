
import "dotenv/config";
import dotenv from "dotenv";
import app from "./src/app.js";
import { ConnectToDB } from "./src/config/connectToDb.js";


ConnectToDB();


const PORT =  3000; 

app.listen(PORT, () => {
    console.log(` Server is running on PORT ${PORT}`);
});