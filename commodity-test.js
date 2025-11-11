// commodity-test.js - Test commodity data that should work with free tier
const https = require('https');

const API_KEY = 'bMwMCUPDUKnTpuHYyJcxSD_dTUu3RvFN';

function testCommodity(symbol, name) {
  const url = `https://api.polygon.io/v2/last/nbbo/${symbol}?apiKey=${API_KEY}`;
  
  console.log(`Testing ${name} (${symbol})...`);
  
  https.get(url, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const result = JSON.parse(data);
        
        if (res.statusCode === 200 && result.results) {
          console.log(`✅ ${name}: $${result.results[0].p}`);
        } else {
          console.log(`❌ ${name}: Status ${res.statusCode} - ${result.message || result.error}`);
        }
      } catch (e) {
        console.log(`❌ ${name}: Parse error`);
      }
    });
  }).on('error', (err) => {
    console.log(`❌ ${name}: Network error`);
  });
}

// Test the commodities your app uses
testCommodity('CL=F', 'Crude Oil');
testCommodity('NG=F', 'Natural Gas');  
testCommodity('HG=F', 'Copper');