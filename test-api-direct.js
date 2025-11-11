// Test if Alpha Vantage API is working
console.log('Testing Alpha Vantage API...');

const API_KEY = 'QW6Z673B1TR2Z47D';  // Your Alpha Vantage key

async function testAPI() {
  try {
    const response = await fetch(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=IBM&apikey=${API_KEY}`
    );
    
    const data = await response.json();
    console.log('✅ Alpha Vantage API Response:', data);
    
    if (data['Global Quote']) {
      const price = parseFloat(data['Global Quote']['05. price']);
      console.log('✅ IBM Stock Price:', price);
      console.log('✅ API IS WORKING!');
    } else if (data.Note) {
      console.log('⚠️ API Rate Limit Hit:', data.Note);
    } else {
      console.log('❌ Unexpected response:', data);
    }
    
  } catch (error) {
    console.log('❌ API Error:', error.message);
  }
}

testAPI();