import YahooFinance from 'yahoo-finance2';
const yahooFinance = new YahooFinance({ validation: { logErrors: false } });

const TICKERS = {
  large: ['NVDA', 'AAPL', 'MSFT', 'AMZN', 'GOOGL', 'META', 'TSLA'],
  mid: ['PLTR', 'COIN', 'SMCI', 'NET', 'DDOG', 'HOOD', 'UPST'],
  small: ['SOUN', 'MARA', 'RIOT', 'NVAX', 'UPST', 'HUT', 'CIFR'],
  all: ['AAPL', 'NVDA', 'PLTR', 'COIN', 'SOUN', 'MARA', 'TSLA']
};

/**
 * Fetch real-time market quotes and calculate volume momentum indicators.
 * @param {string} marketCap - 'large' | 'mid' | 'small' | 'all'
 */
export const fetchStockData = async (marketCap) => {
  console.log(`[STOCKS SERVICE] Initiating fetch for Market Cap: "${marketCap}"`);
  const group = TICKERS[marketCap] || TICKERS.all;
  console.log(`[STOCKS SERVICE] Resolved Ticker Group:`, group);
  const results = [];

  for (const ticker of group) {
    try {
      console.log(`[STOCKS SERVICE] Querying Yahoo Finance for ticker: "${ticker}"`);
      const quote = await yahooFinance.quote(ticker);
      
      const currentVolume = quote.regularMarketVolume || 0;
      const avgVolume10d = quote.averageDailyVolume10Day || currentVolume || 1;
      const volumeRatio = currentVolume / avgVolume10d;

      console.log(`[STOCKS SERVICE] "${ticker}" details: Price=$${quote.regularMarketPrice}, Vol=${currentVolume}, 10dAvgVol=${avgVolume10d}, Ratio=${volumeRatio.toFixed(2)}`);

      results.push({
        symbol: ticker,
        price: quote.regularMarketPrice || 'N/A',
        changePercent: quote.regularMarketChangePercent || 0,
        volume: currentVolume,
        avgVolume10d: avgVolume10d,
        volumeRatio: parseFloat(volumeRatio.toFixed(2)),
        peRatio: quote.trailingPE || 'N/A'
      });
    } catch (err) {
      console.warn(`[STOCKS SERVICE] ⚠️ Failed for ticker ${ticker}:`, err.message);
      // Fill fallback placeholder if API fails for single symbol
      results.push({
        symbol: ticker,
        price: 'N/A',
        changePercent: 0,
        volume: 0,
        avgVolume10d: 1,
        volumeRatio: 1.0,
        peRatio: 'N/A'
      });
    }
  }
  console.log(`[STOCKS SERVICE] Completed fetch. Total records: ${results.length}`);
  return results;
};
