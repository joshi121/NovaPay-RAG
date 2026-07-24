import groq from '../config/groq.js';

/**
 * Call Groq chat completions API with conversational memory optimizations.
 * @param {Array} messages - Chat logs history array from frontend
 */
export const getChatCompletion = async (messages) => {
  try {
    console.log(`[GROQ SERVICE] Incoming chat messages count: ${messages.length}`);
    // Format history for Groq chat completion API (limiting to last 6 messages to save input tokens)
    const formattedMessages = messages.slice(-6).map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    }));

    const lastMessage = messages[messages.length - 1]?.content || '';
    const lastMsgLower = lastMessage.toLowerCase();

    // Check if it is a system-triggered button action or contains data context
    const isSystemAction = lastMsgLower.includes('[action:') || lastMsgLower.includes('current total balance') || lastMsgLower.includes('transactions:');

    let systemPrompt = 'You are a friendly, intelligent AI wealth advisor. You can help explain bank statements, suggest stocks, or chat about general topics. Keep responses warm, natural, and concise (1-2 sentences). Do not mention balances or transactions unless the user asks.';

    if (isSystemAction) {
      systemPrompt = 'You are a precise financial analyst. Factual analysis only. Respond in maximum 2 sentences or bullets. Direct, factual, and strictly no fluff.';
    }

    // Inject concise system context
    formattedMessages.unshift({
      role: 'system',
      content: systemPrompt
    });

    console.log(`[GROQ SERVICE] Sending payload to Groq. Message count sent: ${formattedMessages.length}`);
    console.log(`[GROQ SERVICE] Prompt payload:\n`, JSON.stringify(formattedMessages, null, 2));

    const completion = await groq.chat.completions.create({
      messages: formattedMessages,
      model: 'llama-3.3-70b-versatile',
      temperature: 0.5,
      max_tokens: 150
    });

    const resultText = completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
    console.log(`[GROQ SERVICE] Groq API Response status: SUCCESS`);
    console.log(`[GROQ SERVICE] Response text:\n`, resultText);
    return resultText;
  } catch (error) {
    console.error('[GROQ SERVICE] ❌ Groq service completions error:', error.message);
    throw error;
  }
};
