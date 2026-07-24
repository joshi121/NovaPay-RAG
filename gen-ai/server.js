import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import aiRoutes from './src/routes/aiRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Global Middlewares
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost'],
  credentials: true
}));
app.use(express.json());

// Routes Setup
app.use('/api/ai', aiRoutes);

app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 AI Microservice is running on Port ${PORT}`);
  console.log(`📁 Industry Standard Folder Architecture Active`);
  console.log(`======================================================`);
});
