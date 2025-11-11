// alphavantage-test.js - Test Alpha Vantage API
const https = require('https');

const API_KEY = 'demo'; // Alpha Vantage provides a demo key for testing

function testAlphaVantage(symbol) {
  const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${API_KEY}`;
  
  console.log(`Testing Alpha Vantage for ${symbol}...`);
  
  https.get(url, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const result = JSON.parse(data);
        
        if (result['Error Message']) {
          console.log(`❌ ${symbol}: ${result['Error Message']}`);
        } else if (result['Note']) {
          console.log(`⚠️ ${symbol}: ${result['Note']} (Rate limit)`);
        } else if (result['Global Quote']) {
          const quote = result['Global Quote'];
          console.log(`✅ ${symbol}: $${quote['05. price']} (${quote['10. change percent']})`);
        } else {
          console.log(`❌ ${symbol}: Unexpected response structure`);
        }
      } catch (e) {
        console.log(`❌ ${symbol}: Parse error`);
      }
    });
  }).on('error', (err) => {
    console.log(`❌ ${symbol}: Network error`);
  });
}

console.log('Testing Alpha Vantage API with demo key...');
console.log('Note: You will need to get your own API key from https://www.alphavantage.co/support/#api-key');
console.log('');

// Test a few symbols
testAlphaVantage('IBM'); // Demo key works for IBM
setTimeout(() => testAlphaVantage('AAPL'), 1000);
setTimeout(() => testAlphaVantage('MSFT'), 2000);