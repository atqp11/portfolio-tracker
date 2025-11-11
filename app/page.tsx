'use client';

import { useState, useEffect } from 'react';
import { configs } from '@/lib/config';
import { calculatePosition } from '@/lib/calculator';
import { addDividend, reinvestDRIP } from '@/lib/drip';
import { checkAlerts } from '@/lib/alerts';
import { fetchEnergyCommodities, fetchCopperCommodity } from '@/lib/api';
import { fetchAlphaVantageBatch } from '@/lib/api/alphavantage';
import { generateEnergySnapshot, generateCopperSnapshot } from '@/lib/api/snapshot';
import { fetchEnergyNews, fetchCopperNews } from '@/lib/api/news';
import AlertBanner from '@/components/AlertBanner';
import CommodityCard from '@/components/CommodityCard';

export default function Home() {
  console.log('Home component rendering...');
  
  const [active, setActive] = useState<'energy' | 'copper'>('energy');
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [market, setMarket] = useState<any>({});
  const [alerts, setAlerts] = useState<any>(null);

  const config = configs.find(c => c.id === active)!;
  
  console.log('Current config:', config);
  console.log('Current portfolio state:', portfolio);
  console.log('Current market state:', market);

  const fetchPrices = async (symbols: string[]) => {
    console.log('Fetching prices for symbols:', symbols);
    
    try {
      console.log('Using Alpha Vantage API for all stock prices...');
      
      // Remove .TO suffix for Alpha Vantage (it doesn't use that format)
      const alphaSymbols = symbols.map(s => s.replace('.TO', ''));
      console.log('Alpha Vantage symbols:', alphaSymbols);
      
      const alphaQuotes = await fetchAlphaVantageBatch(alphaSymbols);
      console.log('Alpha Vantage quotes:', alphaQuotes);
      
      const map: Record<string, number> = {};
      symbols.forEach((originalSymbol, index) => {
        const alphaSymbol = alphaSymbols[index];
        const price = alphaQuotes[alphaSymbol];
        if (price && price > 0) {
          map[originalSymbol] = price;
        } else {
          // Use reasonable fallback prices for demo
          map[originalSymbol] = 50 + Math.random() * 100; // Random price between $50-150
        }
      });
      
      console.log('Final price map:', map);
      return map;
    } catch (error) {
      console.warn('Alpha Vantage failed, using fallback prices:', error);
      
      // Ultimate fallback with varied realistic prices
      const finalMap: Record<string, number> = {};
      symbols.forEach(symbol => {
        finalMap[symbol] = 50 + Math.random() * 100; // Random price between $50-150
      });
      
      console.log('Fallback price map:', finalMap);
      return finalMap;
    }
  };

  useEffect(() => {
    Notification.requestPermission();
  }, []);

  useEffect(() => {
    console.log('=== USEEFFECT IS RUNNING ===');
    
    const load = async () => {
      console.log('🚀 Starting load function...');
      console.log('📊 Active config:', config.id);
      console.log('📈 Stocks to fetch:', config.stocks.map(s => s.symbol));
      
      try {
        // Test if Alpha Vantage API is working
        console.log('🔍 Testing Alpha Vantage API first...');
        const testSymbol = ['IBM']; // Simple test with one US stock
        const testResult = await fetchAlphaVantageBatch(testSymbol);
        console.log('✅ Alpha Vantage test result:', testResult);
        
        // Now fetch prices for our Canadian stocks
        console.log('💰 Fetching prices for Canadian stocks...');
        const prices = await fetchPrices(config.stocks.map(s => s.symbol));
        console.log('💰 PRICES FETCHED:', prices);
        
        // Build portfolio with real prices
        const built = config.stocks.map(stock => {
          const price = prices[stock.symbol] || (50 + Math.random() * 100);
          const calculated = calculatePosition(stock, price, config);
          console.log(`📊 ${stock.symbol}: price=$${price}, shares=${calculated.shares}, value=$${calculated.actualValue}`);
          return { ...stock, ...calculated, price };
        });

        console.log('📋 Portfolio built:', built.map(b => ({ symbol: b.symbol, price: b.price, value: b.actualValue })));

        // Fetch commodities
        console.log('🛢️ Fetching energy commodities...');
        const comms = await fetchEnergyCommodities();
        console.log('🛢️ Commodities fetched:', comms);
        
        // Fetch news
        console.log('📰 Fetching energy news...');
        const news = await fetchEnergyNews();
        console.log('📰 News fetched:', news);
        
        // Generate snapshot
        console.log('📸 Generating snapshot...');
        const snap = await generateEnergySnapshot();
        console.log('📸 Snapshot generated:', snap?.substring(0, 100) + '...');

        // Set all data
        console.log('💾 Setting portfolio and market data...');
        setPortfolio(built);
        setMarket({ commodities: comms, snapshot: snap, news });
        
        console.log('✅ DATA LOADING COMPLETE - Check above logs to see if APIs were called!');
        
      } catch (error) {
        console.error('❌ Error in load function:', error);
        // Fallback data
        console.log('🔄 Using fallback data...');
        const testPortfolio = [
          { symbol: 'CNQ.TO', name: 'Canadian Natural', shares: 50, price: 90.25, actualValue: 4512 },
          { symbol: 'SU.TO', name: 'Suncor', shares: 45, price: 110.75, actualValue: 4984 }
        ];
        setPortfolio(testPortfolio);
        
        setMarket({ 
          commodities: { 
            oil: { price: 75.50, timestamp: 'Nov 10, 2:30 PM EST (Fallback)' },
            gas: { price: 2.85, timestamp: 'Nov 10, 2:30 PM EST (Fallback)' } 
          },
          snapshot: 'Fallback energy markets data...',
          news: [{ title: 'Fallback news item', source: 'Test', date: 'Nov 10', url: '#' }]
        });
      }
    };

    load();
    const id = setInterval(load, 60000); // Every 60 seconds for testing
    return () => clearInterval(id);
  }, [active]);

  const totalValue = portfolio.reduce((a, b) => a + b.actualValue, 0);

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <AlertBanner alerts={alerts} />

      <div className="max-w-5xl mx-auto">
        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {configs.map(c => (
            <button
              key={c.id}
              onClick={() => setActive(c.id as any)}
              className={`flex-1 min-w-[120px] px-4 py-2 rounded-lg font-medium text-sm transition ${
                active === c.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-white shadow hover:shadow-md'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* Commodities */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {Object.entries(market.commodities || {}).map(([key, comm]: any) => {
            if (!comm || typeof comm !== 'object') return null;
            
            // Create proper name based on key
            const commodityNames: Record<string, string> = {
              oil: 'Crude Oil',
              gas: 'Natural Gas',
              copper: 'Copper'
            };
            
            const displayName = commodityNames[key] || key.charAt(0).toUpperCase() + key.slice(1);
            
            return (
              <CommodityCard 
                key={key} 
                name={displayName} 
                price={comm.price || 0} 
                ts={comm.timestamp || 'N/A'} 
              />
            );
          })}
        </div>

        {/* Snapshot */}
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow mb-6">
          <pre className="text-xs sm:text-sm whitespace-pre-wrap font-sans leading-relaxed">
            {market.snapshot}
          </pre>
        </div>

        {/* Holdings */}
        <div className="space-y-3 mb-6">
          {portfolio.map(p => (
            <div
              key={p.symbol}
              className="bg-white p-4 rounded-lg shadow flex flex-col sm:flex-row sm:justify-between gap-2"
            >
              <div>
                <p className="font-semibold text-base">{p.symbol}</p>
                <p className="text-xs sm:text-sm text-gray-600">
                  {p.shares} @ ${p.price.toFixed(2)}
                </p>
              </div>
              <p className="font-bold text-lg">${p.actualValue.toFixed(0)}</p>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow text-center sm:text-left">
          <p className="text-lg sm:text-xl font-bold">Total: ${totalValue.toFixed(0)}</p>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            Stop-Loss: ${config.stopLossValue} | Take Profit: ${config.takeProfitValue}
          </p>
        </div>

        {/* News */}
        <div className="mt-6 space-y-3 text-sm">
          {market.news?.map((n: any) => (
            <div key={n.url} className="border-b pb-3 last:border-0">
              <a
                href={n.url}
                target="_blank"
                rel="noopener"
                className="font-medium text-blue-600 hover:underline block mb-1"
              >
                {n.title}
              </a>
              <p className="text-xs text-gray-600">{n.source} · {n.date}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}