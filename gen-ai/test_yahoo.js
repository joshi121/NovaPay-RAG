import YahooFinance from 'yahoo-finance2';
const yahooFinance = new YahooFinance();

async function test() {
  try {
    console.log("Fetching quote for AAPL...");
    const quote = await yahooFinance.quote('AAPL');
    console.log("Success! regularMarketPrice:", quote.regularMarketPrice);
  } catch (err) {
    console.error("Failed to fetch quote:", err.message);
  }
}

test();
