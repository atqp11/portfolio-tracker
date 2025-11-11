// test-api.js - Simple API key test
const API_KEY = 'bMwMCUPDUKnTpuHYyJcxSD_dTUu3RvFN'; // Your actual Polygon.io API key

async function testPolygonAPI() {
  try {
    console.log('Testing Polygon.io API...');
    
    const response = await fetch(`https://api.polygon.io/v2/last/nbbo/AAPL?apiKey=${API_KEY}`);
    const data = await response.json();
    
    if (response.ok && data.results) {
      console.log('✅ API key works! Sample data:');
      console.log('Stock:', data.results[0].T);
      console.log('Price:', data.results[0].p);
      console.log('Timestamp:', new Date(data.results[0].t).toLocaleString());
    } else {
      console.log('❌ API Error:');
      console.log('Status:', response.status);
      console.log('Message:', data.message || data.error);
    }
  } catch (error) {
    console.log('❌ Network Error:', error.message);
  }
}

testPolygonAPI();