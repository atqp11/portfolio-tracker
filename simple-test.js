// simple-test.js - Basic API test using callbacks
const https = require('https');

const API_KEY = 'bMwMCUPDUKnTpuHYyJcxSD_dTUu3RvFN';
const url = `https://api.polygon.io/v2/last/nbbo/AAPL?apiKey=${API_KEY}`;

console.log('Testing Polygon.io API...');

https.get(url, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      
      if (res.statusCode === 200 && result.results) {
        console.log('✅ API key works! Sample data:');
        console.log('Stock:', result.results[0].T);
        console.log('Price:', result.results[0].p);
        console.log('Timestamp:', new Date(result.results[0].t).toLocaleString());
      } else {
        console.log('❌ API Error:');
        console.log('Status:', res.statusCode);
        console.log('Message:', result.message || result.error);
      }
    } catch (e) {
      console.log('❌ Parse Error:', e.message);
      console.log('Response:', data);
    }
  });
}).on('error', (err) => {
  console.log('❌ Network Error:', err.message);
});