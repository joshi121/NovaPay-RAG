import { getChatCompletion } from '../services/groqService.js';
import { fetchStockData } from '../services/yahooFinanceService.js';

/**
 * Handle AI conversational chat, bank statements explanation, and live stock quantitative predictions.
 */
export const handleAiChat = async (req, res) => {
  try {
    const { messages, hasClickedButton, hasClickedStocks, marketCap, userBalance, ledgerEntries } = req.body;
    console.log(`\n[CONTROLLER] Received POST /api/ai/chat`);
    console.log(`[CONTROLLER] Params: hasClickedButton=${hasClickedButton}, hasClickedStocks=${hasClickedStocks}, marketCap=${marketCap}, userBalance=${userBalance}`);

    if (!messages || !Array.isArray(messages)) {
      console.warn(`[CONTROLLER] ⚠️ Bad Request: messages is missing or not an array`);
      return res.status(400).json({ message: 'messages must be an array' });
    }

    const lastMessage = messages[messages.length - 1]?.content || '';
    const lastMsgLower = lastMessage.toLowerCase();
    console.log(`[CONTROLLER] Last Message: "${lastMessage}"`);

    // 1. Direct Chat Financial Query check (bypasses LLM to protect statements security and save tokens)
    const keywords = ['statement', 'balance', 'transaction', 'money', 'history', 'outflow', 'spend', 'expense', 'debit', 'credit', 'ledger'];
    const isFinancialQuery = keywords.some(word => lastMsgLower.includes(word));

    if (!hasClickedButton && !hasClickedStocks && isFinancialQuery) {
      console.log(`[CONTROLLER] Direct financial query detected. Bypassing LLM and returning guardrail notice.`);
      return res.status(200).json({
        reply: 'To analyze your statements securely, please click the [Explain My Statement] button below.'
      });
    }

    // Calculate average spending from ledger entries
    let avgSpend = 0;
    if (ledgerEntries && Array.isArray(ledgerEntries)) {
      const debits = ledgerEntries.filter(entry => entry.type === 'DEBIT');
      const totalDebitAmount = debits.reduce((sum, entry) => sum + entry.amount, 0);
      avgSpend = debits.length > 0 ? (totalDebitAmount / debits.length).toFixed(2) : 0;
    }

    // 2. Predefined Stock Analysis RAG
    if (hasClickedStocks) {
      console.log(`[CONTROLLER] Executing Stock Analysis RAG for tier: "${marketCap || 'all'}"`);
      const stocksList = await fetchStockData(marketCap || 'all');

      // Format tickers context (concise metrics to save input tokens)
      const stockContextLines = stocksList.map(stock => 
        `- ${stock.symbol}: Price: $${stock.price} (${stock.changePercent.toFixed(2)}%) | Volume Ratio: ${stock.volumeRatio} | P/E: ${stock.peRatio}`
      );

      const capLabel = (marketCap || 'all').toUpperCase();
      const stockContextPrompt = `Task: Personalized Stock Investment & Multi-Account Portfolio Advice.
User Financial Profile (Holistic Overview across All Accounts):
- Total Combined Bank Balance: ₹${userBalance || 0}
- Average Transaction Outflow: ₹${avgSpend}

Compare these ${capLabel} cap tickers and recommend the single strongest stock based on Volume Ratio and price gains. If no ticker has a Volume Ratio > 1.5, identify the best relative performer. Reconcile this with the user's total combined portfolio: if their total balance across all accounts is low compared to the stock price, suggest cheaper stock recommendations or fractional allocation, and advise caution to protect their overall liquidity. Keep the advice concise, actionable, and holistic.
Current Ticker Quotes:\n${stockContextLines.join('\n')}`;

      // Append stock data prompt as the final query message
      const aiPayload = [
        ...messages.slice(0, -1),
        { role: 'user', content: stockContextPrompt }
      ];

      console.log(`[CONTROLLER] Stock prompt context successfully compiled. Requesting Groq completion.`);
      const reply = await getChatCompletion(aiPayload);
      console.log(`[CONTROLLER] Returning Stock RAG response to client.`);
      return res.status(200).json({ reply });
    }

    // 3. Conversational AI Chat / Statement Explainer
    console.log(`[CONTROLLER] Executing default chat/explainer query.`);
    const reply = await getChatCompletion(messages);
    console.log(`[CONTROLLER] Returning chat response to client.`);
    return res.status(200).json({ reply });

  } catch (error) {
    console.error('[CONTROLLER] ❌ AI Controller Error:', error.stack || error.message);
    return res.status(500).json({ 
      message: 'Error processing your chat request', 
      error: error.message 
    });
  }
};
