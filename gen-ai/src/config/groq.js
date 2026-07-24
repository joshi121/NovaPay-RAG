import Groq from 'groq-sdk';
import dotenv from 'dotenv';

dotenv.config();

// Ensure API key is trimmed to avoid Windows carriage return errors
const apiKey = (process.env.GROQ_API_KEY || '').trim();

if (!apiKey) {
  console.warn('⚠️ WARNING: GROQ_API_KEY environment variable is not defined in .env');
}

const groq = new Groq({
  apiKey
});

export default groq;
