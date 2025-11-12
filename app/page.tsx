'use client';

import { useState, useEffect } from 'react';
import { configs } from '@/lib/config';
import { calculatePosition } from '@/lib/calculator';
import { addDividend, reinvestDRIP } from '@/lib/drip';
import { checkAlerts } from '@/lib/alerts';
import { fetchEnergyCommodities, fetchCopperCommodity } from '@/lib/api';
import { generateEnergySnapshot, generateCopperSnapshot } from '@/lib/api/snapshot';
import { fetchEnergyNews, fetchCopperNews } from '@/lib/api/news';
import { saveToCache, loadFromCache, classifyApiError, formatCacheAge, getCacheAge, ApiError } from '@/lib/cache';
import AlertBanner from '@/components/AlertBanner';
import CommodityCard from '@/components/CommodityCard';
import PortfolioHeader from '@/components/PortfolioHeader';
import AssetCard from '@/components/AssetCard';

export default function Home() {
  const [active, setActive] = useState<'energy' | 'copper'>('energy');
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [market, setMarket] = useState<any>({});
  const [alerts, setAlerts] = useState<any>(null);
  const [sortKey, setSortKey] = useState<string>('symbol');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [apiError, setApiError] = useState<ApiError | null>(null);
  const [lastCacheUpdate, setLastCacheUpdate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [previousDayPrices, setPreviousDayPrices] = useState<Record<string, number>>({});

  const config = configs.find(c => c.id === active)!;

  const fetchLivePortfolioData = async () => {
    setIsLoading(true);
    const cacheKey = `portfolio_${active}`;
    
    try {
      const symbols = config.stocks.map(s => s.symbol);

      // Get previous prices from current portfolio or cache
      const previousPrices = portfolio.reduce((acc, stock) => {
        if (stock.price && !isNaN(stock.price)) {
          acc[stock.symbol] = stock.price;
        }
        return acc;
      }, {} as Record<string, number>);

      const prices = await fetchPrices(symbols, previousPrices);

      const livePortfolio = config.stocks.map(stock => {
        const price = prices[stock.symbol] || NaN;
        const position = calculatePosition(stock, price, config);
        const previousPrice = previousDayPrices[stock.symbol] || price;
        return {
          symbol: stock.symbol,
          name: stock.name,
          shares: position.shares,
          price: position.price,
          previousPrice: previousPrice,
          actualValue: position.actualValue,
          cashUsed: position.cashUsed,
          marginUsed: position.marginUsed,
        };
      });

      // Save to cache only if we got valid data
      const hasValidPrices = livePortfolio.some(p => p.price && !isNaN(p.price));
      if (hasValidPrices) {
        saveToCache(cacheKey, livePortfolio);
        setLastCacheUpdate(formatCacheAge(0));
        setApiError(null); // Clear error on success
        
        // Update previous day prices for day change tracking (only on first load of the day)
        if (Object.keys(previousDayPrices).length === 0) {
          const newPreviousPrices: Record<string, number> = {};
          livePortfolio.forEach(p => {
            if (p.price && !isNaN(p.price)) {
              newPreviousPrices[p.symbol] = p.price;
            }
          });
          setPreviousDayPrices(newPreviousPrices);
        }
      }

      setPortfolio(livePortfolio);
    } catch (error) {
      console.error('Failed to fetch live portfolio data:', error);
      const errorInfo = classifyApiError(error);
      setApiError(errorInfo);

      // Try to load from cache
      const cachedPortfolio = loadFromCache<any[]>(cacheKey);
      if (cachedPortfolio && cachedPortfolio.length > 0) {
        console.log('Using cached portfolio data');
        setPortfolio(cachedPortfolio);
        const cacheAge = getCacheAge(cacheKey);
        setLastCacheUpdate(formatCacheAge(cacheAge));
      } else {
        // No cache available, create portfolio with N/A values
        console.log('No cache available, showing portfolio with N/A values');
        const emptyPortfolio = config.stocks.map(stock => {
          const position = calculatePosition(stock, NaN, config);
          return {
            symbol: stock.symbol,
            name: stock.name,
            shares: position.shares,
            price: NaN,
            previousPrice: NaN,
            actualValue: 0,
            cashUsed: position.cashUsed,
            marginUsed: position.marginUsed,
          };
        });
        setPortfolio(emptyPortfolio);
        setLastCacheUpdate(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLiveMarketData = async () => {
    const cacheKey = `market_${active}`;
    
    try {
      const commodities = active === 'energy'
        ? await fetchEnergyCommodities()
        : await fetchCopperCommodity();

      const snapshot = active === 'energy'
        ? await generateEnergySnapshot()
        : await generateCopperSnapshot();

      const news = active === 'energy'
        ? await fetchEnergyNews()
        : await fetchCopperNews();

      const marketData = { commodities, snapshot, news };
      
      // Save to cache
      saveToCache(cacheKey, marketData);
      setMarket(marketData);
    } catch (error) {
      console.error('Failed to fetch live market data:', error);
      
      // Try to load from cache
      const cachedMarket = loadFromCache<any>(cacheKey);
      if (cachedMarket) {
        console.log('Using cached market data');
        setMarket(cachedMarket);
      } else {
        // No cache available, set empty/default values
        console.log('No cache available for market data');
        setMarket({
          commodities: {},
          snapshot: 'Market data unavailable',
          news: [],
        });
      }
    }
  };

  const fetchPrices = async (symbols: string[], previousPrices: Record<string, number> = {}) => {
    try {
      // Remove .TO suffix for Alpha Vantage (it doesn't use that format)
      const alphaSymbols = symbols.map(s => s.replace('.TO', ''));
      const response = await fetch(`/api/quote?symbols=${alphaSymbols.join(',')}`);
      
      const data = await response.json();
      
      // Check if the response contains an error
      if (!response.ok || data.error) {
        const errorInfo = classifyApiError({
          message: data.error || data.message || 'API request failed',
          status: response.status,
          data: data,
        });
        
        // Set error state so it can be displayed
        setApiError(errorInfo);
        
        // Return previous prices if we have them, otherwise NaN
        const fallbackMap: Record<string, number> = {};
        symbols.forEach(symbol => {
          fallbackMap[symbol] = previousPrices[symbol] || NaN;
        });
        return fallbackMap;
      }

      const alphaQuotes = data;
      const map: Record<string, number> = {};
      
      symbols.forEach((originalSymbol, index) => {
        const alphaSymbol = alphaSymbols[index];
        const price = alphaQuotes[alphaSymbol];
        if (price && price > 0) {
          map[originalSymbol] = price;
        } else {
          // Keep previous price if new price is invalid
          map[originalSymbol] = previousPrices[originalSymbol] || NaN;
        }
      });

      return map;
    } catch (error) {
      console.warn('Alpha Vantage API failed:', error);
      const errorInfo = classifyApiError(error);
      setApiError(errorInfo);

      // Return previous prices as fallback
      const finalMap: Record<string, number> = {};
      symbols.forEach(symbol => {
        finalMap[symbol] = previousPrices[symbol] || NaN;
      });

      return finalMap;
    }
  };

  // Load cached data immediately on mount or tab change
  useEffect(() => {
    const portfolioCacheKey = `portfolio_${active}`;
    const marketCacheKey = `market_${active}`;
    
    // Load cached portfolio immediately if available
    const cachedPortfolio = loadFromCache<any[]>(portfolioCacheKey);
    if (cachedPortfolio && cachedPortfolio.length > 0) {
      console.log('Loading cached portfolio immediately');
      setPortfolio(cachedPortfolio);
      const cacheAge = getCacheAge(portfolioCacheKey);
      setLastCacheUpdate(formatCacheAge(cacheAge));
    } else {
      // No cache, show empty portfolio with N/A values
      const emptyPortfolio = config.stocks.map(stock => {
        const position = calculatePosition(stock, NaN, config);
        return {
          symbol: stock.symbol,
          name: stock.name,
          shares: position.shares,
          price: NaN,
          previousPrice: NaN,
          actualValue: 0,
          cashUsed: position.cashUsed,
          marginUsed: position.marginUsed,
        };
      });
      setPortfolio(emptyPortfolio);
    }
    
    // Load cached market data immediately if available
    const cachedMarket = loadFromCache<any>(marketCacheKey);
    if (cachedMarket) {
      console.log('Loading cached market data immediately');
      setMarket(cachedMarket);
    }
    
    // Then fetch fresh data in background
    fetchLivePortfolioData();
    fetchLiveMarketData();
  }, [active]);

  // Request notification permission on initial mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      Notification.requestPermission().catch(err => {
        console.log('Notification permission request failed:', err);
      });
    }
  }, []);

  const totalValue = portfolio.reduce((a, b) => a + b.actualValue, 0);

  const calculatePL = (actualValue: number, costBasis: number) => {
    const pl = actualValue - costBasis;
    const plPercentage = (pl / costBasis) * 100;
    return { pl, plPercentage };
  };

  const sortedPortfolio = [...portfolio].sort((a, b) => {
    const valueA = a[sortKey];
    const valueB = b[sortKey];

    if (typeof valueA === 'string' && typeof valueB === 'string') {
      return sortOrder === 'asc' ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA);
    }

    return sortOrder === 'asc' ? valueA - valueB : valueB - valueA;
  });

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const renderSortIcon = (key: string) => {
    if (sortKey === key) {
      return sortOrder === 'asc' ? '▲' : '▼';
    }
    return null;
  };

  const calculateDailyChange = (current: number, previous: number) => {
    const change = ((current - previous) / previous) * 100;
    return change;
  };

  const getChangeColor = (change: number) => {
    if (change > 0.0001) return 'text-green-600';
    if (change < -0.0001) return 'text-red-600';
    return 'text-black';
  };

  // Calculate total cost basis from config
  const totalCostBasis = config.stocks.reduce((sum, stock) => sum + stock.cashAllocation, 0);
  const totalPL = totalValue - totalCostBasis;
  const totalPLPercentage = totalCostBasis > 0 ? (totalPL / totalCostBasis) * 100 : 0;

  // Calculate day change based on previous prices
  const totalPreviousValue = portfolio.reduce((sum, stock) => {
    const prevPrice = stock.previousPrice || stock.price;
    if (!prevPrice || isNaN(prevPrice)) return sum;
    return sum + (stock.shares * prevPrice);
  }, 0);
  const dayChange = totalValue - totalPreviousValue;
  const dayChangePercent = totalPreviousValue > 0 ? (dayChange / totalPreviousValue) * 100 : 0;

  return (
    <main className="min-h-screen bg-[#0A0C0E] p-4 sm:p-6">
      <AlertBanner alerts={alerts} />

      <div className="max-w-5xl mx-auto">
        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {configs.map(c => (
            <button
              key={c.id}
              onClick={() => {
                setActive(c.id as any);
              }}
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

        {/* Refresh Button */}
        <div className="mb-6 flex items-center gap-4 flex-wrap">
          <button
            onClick={() => {
              fetchLivePortfolioData();
              fetchLiveMarketData();
            }}
            disabled={isLoading}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Updating...' : 'Refresh Data'}
          </button>
          {isLoading && (
            <span className="text-sm text-blue-600 font-medium animate-pulse">
              Fetching latest prices...
            </span>
          )}
          {!isLoading && lastCacheUpdate && (
            <span className="text-sm text-gray-600">
              Last updated: {lastCacheUpdate}
            </span>
          )}
          {!isLoading && !lastCacheUpdate && !apiError && (
            <span className="text-sm text-orange-600">
              No cached data available
            </span>
          )}
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
          <div className="text-xs sm:text-sm whitespace-pre-wrap font-sans leading-relaxed">
            {market.snapshot && market.snapshot.split('\n').map((line: string, index: number) => {
              // Handle bold text (**text**)
              if (line.includes('**')) {
                const parts = line.split('**');
                return (
                  <div key={index}>
                    {parts.map((part, i) => 
                      i % 2 === 1 ? <strong key={i}>{part}</strong> : <span key={i}>{part}</span>
                    )}
                  </div>
                );
              }
              // Regular line
              return <div key={index}>{line || '\u00A0'}</div>;
            })}
          </div>
        </div>

        {/* Portfolio Header */}
        <PortfolioHeader
          accountValue={totalValue}
          dayChange={dayChange}
          dayChangePercent={dayChangePercent}
          unrealizedGainLoss={totalPL}
          unrealizedGainLossPercent={totalPLPercentage}
        />

        {/* Holdings - Asset Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {portfolio.map(p => {
            const isUnavailable = !p.price || isNaN(p.price);
            
            // Find the stock config to get cost basis
            const stockConfig = config.stocks.find(s => s.symbol === p.symbol);
            const costBasis = stockConfig ? stockConfig.cashAllocation : 0;
            
            // Calculate values
            const currentPrice = isUnavailable ? 0 : p.price;
            const previousPrice = p.previousPrice || currentPrice;
            const priceChange = currentPrice - previousPrice;
            const marketValue = p.actualValue;
            const dayChangeValue = isUnavailable ? 0 : marketValue - (p.shares * previousPrice);
            const dayChangePercent = isUnavailable || previousPrice === 0 ? 0 : (dayChangeValue / (p.shares * previousPrice)) * 100;
            const gainLoss = isUnavailable ? 0 : marketValue - costBasis;
            const gainLossPercent = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0;

            return (
              <AssetCard
                key={p.symbol}
                symbol={p.symbol}
                name={p.name}
                type="Stock"
                shares={p.shares}
                price={currentPrice}
                priceChange={priceChange}
                marketValue={marketValue}
                dayChange={dayChangeValue}
                dayChangePercent={dayChangePercent}
                gainLoss={gainLoss}
                gainLossPercent={gainLossPercent}
              />
            );
          })}
        </div>

        {/* Summary */}
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow text-center sm:text-left">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-lg sm:text-xl font-bold">
                Portfolio Value: {totalValue > 0 ? `$${totalValue.toFixed(0)}` : 'N/A'}
              </p>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                Cost Basis: ${config.stocks.reduce((sum, stock) => sum + stock.cashAllocation, 0).toFixed(0)}
              </p>
              {totalValue > 0 && (
                <p className={`text-xs sm:text-sm mt-1 ${getChangeColor(totalPL)}`}>
                  Unrealized P&L: {totalPL >= 0 ? '+' : ''}${totalPL.toFixed(2)}
                  <span className={`ml-1 ${getChangeColor(totalPLPercentage)}`}>
                    ({totalPLPercentage >= 0 ? '+' : ''}{totalPLPercentage.toFixed(2)}%)
                  </span>
                </p>
              )}
            </div>
            <div>
              <p className="text-xs sm:text-sm text-gray-600">
                Stop-Loss: ${config.stopLossValue} | Take Profit: ${config.takeProfitValue}
              </p>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                Cash: ${config.initialCash} | Margin: ${config.initialMargin}
              </p>
              {apiError && (
                <p className="text-xs text-orange-600 mt-1">
                  ⚠️ Some prices unavailable due to {apiError.type.replace('_', ' ')}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* News */}
        <div className="mt-6 space-y-3 text-sm">
          {market.news?.map((n: any, index: number) => (
            <div key={`news-${index}`} className="border-b pb-3 last:border-0">
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

        {/* Error Message Footer */}
        {apiError && (
          <div className={`mt-6 p-4 rounded-lg border-l-4 ${
            apiError.type === 'rate_limit' ? 'bg-yellow-50 border-yellow-500' :
            apiError.type === 'auth' ? 'bg-red-50 border-red-500' :
            apiError.type === 'network' ? 'bg-blue-50 border-blue-500' :
            apiError.type === 'server' ? 'bg-orange-50 border-orange-500' :
            'bg-gray-50 border-gray-500'
          }`}>
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className={`h-5 w-5 ${
                  apiError.type === 'rate_limit' ? 'text-yellow-600' :
                  apiError.type === 'auth' ? 'text-red-600' :
                  apiError.type === 'network' ? 'text-blue-600' :
                  apiError.type === 'server' ? 'text-orange-600' :
                  'text-gray-600'
                }`} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className={`text-sm font-medium ${
                  apiError.type === 'rate_limit' ? 'text-yellow-800' :
                  apiError.type === 'auth' ? 'text-red-800' :
                  apiError.type === 'network' ? 'text-blue-800' :
                  apiError.type === 'server' ? 'text-orange-800' :
                  'text-gray-800'
                }`}>
                  {apiError.type === 'rate_limit' ? 'API Rate Limit Reached' :
                   apiError.type === 'auth' ? 'Authentication Error' :
                   apiError.type === 'network' ? 'Network Error' :
                   apiError.type === 'server' ? 'Server Error' :
                   'Error'}
                </h3>
                <p className={`mt-1 text-sm ${
                  apiError.type === 'rate_limit' ? 'text-yellow-700' :
                  apiError.type === 'auth' ? 'text-red-700' :
                  apiError.type === 'network' ? 'text-blue-700' :
                  apiError.type === 'server' ? 'text-orange-700' :
                  'text-gray-700'
                }`}>
                  {apiError.message}
                  {lastCacheUpdate && (
                    <span className="block mt-1">
                      Displaying cached data from {lastCacheUpdate}.
                    </span>
                  )}
                  {!lastCacheUpdate && (
                    <span className="block mt-1">
                      No cached data available. Stock prices and values are shown as N/A.
                    </span>
                  )}
                </p>
                {apiError.type === 'rate_limit' && (
                  <p className="mt-2 text-xs">
                    <a 
                      href="https://www.alphavantage.co/premium/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="font-medium underline"
                    >
                      Upgrade your API plan
                    </a>
                    {' '}to remove daily rate limits, or try again tomorrow.
                  </p>
                )}
                {apiError.type === 'auth' && (
                  <p className="mt-2 text-xs">
                    Please verify your API key in the environment configuration.
                  </p>
                )}
              </div>
              <button
                onClick={() => setApiError(null)}
                className="ml-3 flex-shrink-0"
              >
                <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}