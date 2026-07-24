import { handleAiChat } from './src/controllers/aiController.js';
import dotenv from 'dotenv';

dotenv.config();

const mockReq = {
  body: {
    messages: [{ role: 'user', content: 'hi' }],
    hasClickedStocks: false,
    hasClickedButton: false,
    marketCap: 'all'
  }
};

const mockRes = {
  status: function(code) {
    this.statusCode = code;
    return this;
  },
  json: function(data) {
    this.jsonData = data;
    console.log("Response JSON:", JSON.stringify(data, null, 2));
    return this;
  }
};

async function test() {
  console.log("Testing AI Chat Controller...");
  await handleAiChat(mockReq, mockRes);
}

test();
