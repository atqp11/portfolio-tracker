// free-tier-test.js - Test free tier endpoints
const https = require('https');

const API_KEY = 'bMwMCUPDUKnTpuHYyJcxSD_dTUu3RvFN';

function testEndpoint(endpoint, description) {
  console.log(`Testing ${description}...`);
  
  https.get(endpoint, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const result = JSON.parse(data);
        
        if (res.statusCode === 200) {
          console.log(`✅ ${description}: WORKS`);
          if (result.results) {
            console.log(`   Sample data: ${JSON.stringify(result.results[0] || {}).substr(0, 100)}...`);
          }
        } else {
          console.log(`❌ ${description}: Status ${res.statusCode} - ${result.message || result.error}`);
        }
      } catch (e) {
        console.log(`❌ ${description}: Parse error`);
      }
    });
  }).on('error', (err) => {
    console.log(`❌ ${description}: Network error`);
  });
}

// Test various free tier endpoints
testEndpoint(`https://api.polygon.io/v2/aggs/ticker/AAPL/prev?adjusted=true&apikey=${API_KEY}`, 'Previous day stock data');
testEndpoint(`https://api.polygon.io/v1/open-close/AAPL/2023-01-09?adjusted=true&apikey=${API_KEY}`, 'Historical daily data');
testEndpoint(`https://api.polygon.io/v3/reference/tickers?market=stocks&active=true&limit=10&apikey=${API_KEY}`, 'Stock tickers list');