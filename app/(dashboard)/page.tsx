'use client';

import { useState, useEffect } from 'react';
import { configs } from '@/lib/config';
import { calculatePosition } from '@/lib/calculator';
import { addDividend, reinvestDRIP } from '@/lib/drip';
import { checkAlerts } from '@/lib/alerts';
import { fetchEnergyCommodities, fetchCopperCommodity } from '@/lib/api/commodities';
import { generateEnergySnapshot, generateCopperSnapshot } from '@/lib/api/snapshot';
import { fetchEnergyNews, fetchCopperNews } from '@/lib/api/news';
import { saveToCache, loadFromCache, classifyApiError, formatCacheAge, getCacheAge, ApiError } from '@/lib/cache';
import { USE_MOCK_DATA, MOCK_PRICES, MOCK_PRICE_CHANGES } from '@/lib/mockData';
import { usePortfolio, useStocks, usePortfolioMetrics } from '@/lib/hooks/useDatabase';
import RiskMetricsPanel from '@/components/RiskMetricsPanel';
import AlertBanner from '@/components/AlertBanner';
import CommodityCard from '@/components/CommodityCard';
import PortfolioHeader from '@/components/PortfolioHeader';
import AssetCard from '@/components/AssetCard';
import StrategyAccordion from '@/components/StrategyAccordion';
import StonksAI from '@/components/StonksAI/StonksAI';

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
  const [isAiSidebarOpen, setIsAiSidebarOpen] = useState(false);
  const [isAiInternalSidebarCollapsed, setIsAiInternalSidebarCollapsed] = useState(false);

  // Load portfolio and stocks from database
  const { portfolio: dbPortfolio, loading: portfolioLoading } = usePortfolio(active);
  const { stocks: dbStocks, loading: stocksLoading } = useStocks(dbPortfolio?.id);
  const metrics = usePortfolioMetrics(dbStocks, dbPortfolio?.borrowedAmount || 0);

  const config = configs.find(c => c.id === active)!;

  // Risk Metrics State
  const [riskMetrics, setRiskMetrics] = useState(null);
  const [riskLoading, setRiskLoading] = useState(false);
  const [riskError, setRiskError] = useState<string | null>(null);

  // Compute returns for risk metrics
  function getPortfolioReturns(stocks: Array<{ currentPrice?: number; avgPrice: number; shares: number; previousPrice?: number }>): number[] {
    if (!stocks || stocks.length === 0) return [];
    const currentValue = stocks.reduce((sum: number, s) => sum + (s.currentPrice ?? s.avgPrice) * s.shares, 0);
    const previousValue = stocks.reduce((sum: number, s) => sum + (s.previousPrice ?? s.avgPrice) * s.shares, 0);
    if (previousValue > 0) {
      return [(currentValue - previousValue) / previousValue];
    }
    return [];
  }
  function getMarketReturns(): number[] {
    // Use commodity price change as market proxy (demo)
    if (active === 'energy' && market.commodities && market.commodities.oil && market.commodities.oil.price && market.commodities.oil.previousPrice) {
      const curr = market.commodities.oil.price;
      const prev = market.commodities.oil.previousPrice;
      if (prev > 0) return [(curr - prev) / prev];
    }
    if (active === 'copper' && market.commodities && market.commodities.price && market.commodities.previousPrice) {
      const curr = market.commodities.price;
      const prev = market.commodities.previousPrice;
      if (prev > 0) return [(curr - prev) / prev];
    }
    return [0.01];
  }
  const riskFreeRate = 0.045;

  async function fetchRiskMetrics() {
    setRiskLoading(true);
    setRiskError(null);
    try {
      const safeStocks = dbStocks.map(stock => ({
        ...stock,
        currentPrice: stock.currentPrice === null ? undefined : stock.currentPrice,
        previousPrice: stock.previousPrice === null ? undefined : stock.previousPrice,
      }));
      const portfolioReturns = getPortfolioReturns(safeStocks);
      const marketReturns = getMarketReturns();
      if (portfolioReturns.length === 0 || marketReturns.length === 0) throw new Error('Insufficient data for risk metrics');
      const res = await fetch('/api/risk-metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portfolioReturns, marketReturns, riskFreeRate }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setRiskMetrics(data);
    } catch (err) {
      setRiskError(err instanceof Error ? err.message : String(err));
      setRiskMetrics(null);
    } finally {
      setRiskLoading(false);
    }
  }

  useEffect(() => {
    // Fetch risk metrics when stocks or market data change
    if (dbStocks.length > 0 && market.commodities) {
      fetchRiskMetrics();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbStocks, market.commodities, active]);

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
    // Use mock data if enabled
    if (USE_MOCK_DATA) {
      console.log('Using mock data for testing');
      const map: Record<string, number> = {};
      symbols.forEach(symbol => {
        map[symbol] = MOCK_PRICES[symbol as keyof typeof MOCK_PRICES] || 100;
      });
      setApiError(null);
      return map;
    }

    try {
      // Remove .TO suffix for Alpha Vantage (it doesn't use that format)
      const alphaSymbols = symbols.map(s => s.replace('.TO', ''));
      const response = await fetch(`/api/quote?symbols=${alphaSymbols.join(',')}`);
      
      const data = await response.json();
      
      // Check if the response contains an error or rate limit
      if (!response.ok || data.error) {
        // If rate limited, don't make further API calls
        if (data.rateLimited) {
          console.log('Rate limit detected - using cached/previous prices');
        }
        
        const errorInfo = classifyApiError({
          message: data.error || data.message || 'API request failed',
          status: response.status,
          data: data,
        });
        
        // Set error state so it can be displayed
        setApiError(errorInfo);
        
        // Return previous prices if we have them, otherwise use cached prices
        const fallbackMap: Record<string, number> = {};
        symbols.forEach(symbol => {
          fallbackMap[symbol] = previousPrices[symbol] || NaN;
        });
        
        console.log('Using fallback prices:', fallbackMap);
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
      console.warn('API failed:', error);
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

  // Load database stocks into portfolio format
  useEffect(() => {
    if (!stocksLoading && dbStocks.length > 0) {
      console.log('Loading portfolio from database');
      const portfolioFromDb = dbStocks.map(stock => ({
        symbol: stock.symbol,
        name: stock.name,
        shares: stock.shares,
        price: stock.currentPrice || stock.avgPrice,
        previousPrice: stock.currentPrice || stock.avgPrice,
        actualValue: stock.actualValue || 0,
        cashUsed: 0, // Will be updated with live prices
        marginUsed: 0, // Will be updated with live prices
        avgPrice: stock.avgPrice, // Add cost basis
      }));
      setPortfolio(portfolioFromDb);
    }
  }, [dbStocks, stocksLoading]);

  // Load cached data immediately on mount or tab change
  useEffect(() => {
    const marketCacheKey = `market_${active}`;
    
    // Load cached market data immediately if available
    const cachedMarket = loadFromCache<any>(marketCacheKey);
    if (cachedMarket) {
      console.log('Loading cached market data immediately');
      setMarket(cachedMarket);
    }
    
    // Fetch fresh data in background
    if (dbStocks.length > 0) {
      fetchLivePortfolioData();
    }
    fetchLiveMarketData();
  }, [active, dbStocks]);

  // Request notification permission on initial mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      Notification.requestPermission().catch(err => {
        console.log('Notification permission request failed:', err);
      });
    }
  }, []);

  const totalValue = dbStocks.reduce((a, b) => a + (b.actualValue || 0), 0);

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

  // Calculate total cost basis from database
  const totalCostBasis = dbStocks.reduce((sum, s) => {
    return sum + (s.avgPrice * s.shares);
  }, 0) || (dbPortfolio?.initialValue ?? config.initialValue);
  
  const totalPL = totalValue - totalCostBasis;
  const totalPLPercentage = totalCostBasis > 0 ? (totalPL / totalCostBasis) * 100 : 0;

  // Calculate day change based on previous prices
  const totalPreviousValue = dbStocks.reduce((sum, stock) => {
    const prevPrice = stock.previousPrice ?? stock.currentPrice ?? 0;
    if (!prevPrice || isNaN(prevPrice)) return sum;
    return sum + (stock.shares * prevPrice);
  }, 0);
  const dayChange = totalValue - totalPreviousValue;
  const dayChangePercent = totalPreviousValue > 0 ? (dayChange / totalPreviousValue) * 100 : 0;

  // Use database metrics when stocks are loaded, otherwise fallback to calculated values
  const displayAccountValue = (dbStocks.length > 0 && metrics.currentValue > 0) ? metrics.currentValue : totalValue;
  const displayCostBasis = (dbStocks.length > 0 && metrics.costBasis > 0) ? metrics.costBasis : totalCostBasis;
  const displayUnrealizedPL = (dbStocks.length > 0) ? metrics.unrealizedPL : totalPL;
  const displayUnrealizedPLPercent = (dbStocks.length > 0) ? metrics.unrealizedPLPercent : totalPLPercentage;

  // Get current portfolio tickers for AI Co-Pilot
  const currentPortfolioTickers = dbStocks.map(stock => stock.symbol);

  return (
    <div className="space-y-6">
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
                  : 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* Refresh Button & AI Co-Pilot Toggle */}
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
          <button
            onClick={() => setIsAiSidebarOpen(!isAiSidebarOpen)}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
              isAiSidebarOpen
                ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg'
                : 'bg-gradient-to-r from-purple-700 to-purple-800 dark:bg-gray-800 text-white dark:text-gray-100 hover:from-purple-500 hover:to-purple-600 dark:hover:bg-purple-600 dark:hover:text-white hover:shadow-purple-400/50 backdrop-blur-sm shadow-lg hover:shadow-xl hover:scale-105'
            }`}
            title="Toggle AI Co-Pilot"
          >
            <span className="text-xl">✨</span>
            <span>AI Co-Pilot</span>
          </button>
          {isLoading && (
            <span className="text-sm text-blue-400 font-medium animate-pulse">
              Fetching latest prices...
            </span>
          )}
          {!isLoading && lastCacheUpdate && (
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Last updated: {lastCacheUpdate}
            </span>
          )}
          {!isLoading && !lastCacheUpdate && !apiError && (
            <span className="text-sm text-orange-400">
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
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-4 sm:p-6 rounded-lg mb-6">
          <div className="text-xs sm:text-sm whitespace-pre-wrap font-sans leading-relaxed text-gray-900 dark:text-gray-100">
            {market.snapshot && market.snapshot.split('\n').map((line: string, index: number) => {
              // Handle bold text (**text**)
              if (line.includes('**')) {
                const parts = line.split('**');
                return (
                  <div key={index}>
                    {parts.map((part, i) =>
                      i % 2 === 1 ? <strong key={i} className="text-gray-900 dark:text-gray-100">{part}</strong> : <span key={i}>{part}</span>
                    )}
                  </div>
                );
              }
              // Regular line
              return <div key={index}>{line || '\u00A0'}</div>;
            })}
          </div>
        </div>

        {/* Main Content Layout - Side by Side on Desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Section - Portfolio Data (2/3 width on desktop) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Portfolio Header */}
            <PortfolioHeader
              accountValue={displayAccountValue}
              dayChange={dayChange}
              dayChangePercent={dayChangePercent}
              unrealizedGainLoss={displayUnrealizedPL}
              unrealizedGainLossPercent={displayUnrealizedPLPercent}
            />

            {/* Holdings - Asset Cards */}
            <div className="space-y-4">
          {dbStocks.map(stock => {
            const isUnavailable = stock.currentPrice === null || isNaN(stock.currentPrice);

            // Calculate cost basis from database
            const costBasis = stock.shares * stock.avgPrice;

            // Calculate values
            const currentPrice = isUnavailable ? null : stock.currentPrice;
            const previousPrice = isUnavailable ? null : (stock.previousPrice ?? stock.currentPrice);
            const priceChange = (currentPrice !== null && previousPrice !== null) ? currentPrice - previousPrice : null;
            const marketValue = isUnavailable ? null : stock.actualValue ?? null;
            const dayChangeValue = (isUnavailable || previousPrice === null || marketValue === null) ? null : marketValue - (stock.shares * previousPrice);
            const dayChangePercent = (isUnavailable || previousPrice === null || previousPrice === 0) ? null : (dayChangeValue! / (stock.shares * previousPrice)) * 100;
            const gainLoss = (isUnavailable || marketValue === null) ? null : marketValue - costBasis;
            const gainLossPercent = (isUnavailable || costBasis <= 0 || gainLoss === null) ? null : (gainLoss / costBasis) * 100;

            return (
              <AssetCard
                key={stock.symbol}
                symbol={stock.symbol}
                name={stock.name}
                type="Stock"
                shares={stock.shares}
                price={currentPrice ?? NaN}
                priceChange={priceChange ?? NaN}
                marketValue={marketValue ?? NaN}
                dayChange={dayChangeValue ?? NaN}
                dayChangePercent={dayChangePercent ?? NaN}
                gainLoss={gainLoss ?? NaN}
                gainLossPercent={gainLossPercent ?? NaN}
              />
            );
          })}
        </div>

        {/* Summary & Risk Metrics */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-4 sm:p-6 rounded-lg text-center sm:text-left">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-lg sm:text-xl font-bold">
                <span className="text-gray-900 dark:text-gray-100">Portfolio Value:</span> <span className={displayUnrealizedPL > 0.0001 ? 'text-green-600 dark:text-green-400' : displayUnrealizedPL < -0.0001 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}>{displayAccountValue > 0 ? `$${displayAccountValue.toFixed(0)}` : 'N/A'}</span>
              </p>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                Cost Basis: ${displayCostBasis.toFixed(0)}
              </p>
              {displayAccountValue > 0 && (
                <p className={`text-xs sm:text-sm mt-1 font-medium ${displayUnrealizedPL > 0.0001 ? 'text-green-600 dark:text-green-400' : displayUnrealizedPL < -0.0001 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`}>
                  Unrealized P&L: {displayUnrealizedPL >= 0 ? '+' : ''}${displayUnrealizedPL.toFixed(2)}
                  <span className={`ml-1 ${displayUnrealizedPLPercent > 0.0001 ? 'text-green-600 dark:text-green-400' : displayUnrealizedPLPercent < -0.0001 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`}>
                    ({displayUnrealizedPLPercent >= 0 ? '+' : ''}{displayUnrealizedPLPercent.toFixed(2)}%)
                  </span>
                </p>
              )}
            </div>
            <div>
              <p className="text-xs sm:text-sm text-gray-900 dark:text-gray-100 font-semibold">
                Stop-Loss: ${config.stopLossValue} | Take Profit: ${config.takeProfitValue}
              </p>
              <p className="text-xs sm:text-sm text-gray-900 dark:text-gray-100 font-semibold mt-1">
                Cash: ${config.initialCash} | Margin: ${config.initialMargin}
              </p>
              {apiError && (
                <p className="text-xs text-orange-400 mt-1">
                  ⚠️ Some prices unavailable due to {apiError.type.replace('_', ' ')}
                </p>
              )}
            </div>
          </div>
          {/* Risk Metrics Panel */}
          <div className="mt-6">
            <RiskMetricsPanel metrics={riskMetrics} loading={riskLoading} error={riskError} />
          </div>
        </div>
          </div>

          {/* Right Column: Strategy & Monitoring Guide */}
          <div className="lg:col-span-1">
            <StrategyAccordion 
              portfolioType={active as 'energy' | 'copper'}
              currentValue={displayAccountValue}
              targetDeleverValue={config.takeProfitValue}
              targetProfitValue={config.takeProfitValue}
              wtiPrice={active === 'energy' && market.commodities && 'oil' in market.commodities ? (market.commodities as any).oil?.price : undefined}
              ngPrice={active === 'energy' && market.commodities && 'gas' in market.commodities ? (market.commodities as any).gas?.price : undefined}
              copperPrice={active === 'copper' && market.commodities ? (market.commodities as any).price : undefined}
              marginPercent={(config.initialMargin / config.initialValue) * 100}
            />
          </div>
        </div>

        {/* News Section - Full Width Below Grid */}
        <div className="mt-6 space-y-3 text-sm">
          {market.news?.map((n: any, index: number) => (
            <div key={`news-${index}`} className="border-b border-gray-200 dark:border-gray-700 pb-3 last:border-0">
              <a
                href={n.url}
                target="_blank"
                rel="noopener"
                className="font-medium text-blue-600 dark:text-blue-400 hover:underline block mb-1"
              >
                {n.title}
              </a>
              <p className="text-xs text-gray-600 dark:text-gray-400">{n.source} · {n.date}</p>
            </div>
          ))}
        </div>

        {/* Error Message Footer */}
        {apiError && (
          <div className={`mt-6 p-4 rounded-lg border border-l-4 ${
            apiError.type === 'rate_limit' ? 'bg-yellow-900/20 border-yellow-500' :
            apiError.type === 'auth' ? 'bg-red-900/20 border-red-500' :
            apiError.type === 'network' ? 'bg-blue-900/20 border-blue-500' :
            apiError.type === 'server' ? 'bg-orange-900/20 border-orange-500' :
            'bg-gray-900/20 border-gray-500'
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
                  apiError.type === 'rate_limit' ? 'text-yellow-600 dark:text-yellow-400' :
                  apiError.type === 'auth' ? 'text-red-600 dark:text-red-400' :
                  apiError.type === 'network' ? 'text-blue-600 dark:text-blue-400' :
                  apiError.type === 'server' ? 'text-orange-600 dark:text-orange-400' :
                  'text-gray-600 dark:text-gray-400'
                }`}>
                  {apiError.type === 'rate_limit' ? 'API Rate Limit Reached' :
                   apiError.type === 'auth' ? 'Authentication Error' :
                   apiError.type === 'network' ? 'Network Error' :
                   apiError.type === 'server' ? 'Server Error' :
                   'Error'}
                </h3>
                <p className={`mt-1 text-sm ${
                  apiError.type === 'rate_limit' ? 'text-yellow-700 dark:text-yellow-300' :
                  apiError.type === 'auth' ? 'text-red-700 dark:text-red-300' :
                  apiError.type === 'network' ? 'text-blue-700 dark:text-blue-300' :
                  apiError.type === 'server' ? 'text-orange-700 dark:text-orange-300' :
                  'text-gray-700 dark:text-gray-300'
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
                <svg className="h-5 w-5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* AI Co-Pilot Sidebar */}
      {isAiSidebarOpen && (
        <>
          {/* Backdrop overlay */}
          <div 
            className="fixed inset-0 bg-black/60 z-40 transition-opacity animate-fadeIn"
            onClick={() => setIsAiSidebarOpen(false)}
          />
          {/* Sidebar */}
          <div className="fixed top-0 right-0 h-full w-full sm:w-[90%] md:w-[600px] lg:w-[700px] xl:w-[800px] bg-white dark:bg-gray-950 z-50 shadow-2xl transform transition-transform duration-300 ease-in-out overflow-hidden animate-slideInRight">
            {/* Close button */}
            <button
              onClick={() => setIsAiSidebarOpen(false)}
              className="absolute top-4 right-4 z-[60] p-2 bg-gray-200 dark:bg-gray-800 hover:bg-red-600 rounded-lg transition border border-gray-300 dark:border-gray-700"
              title="Close AI Co-Pilot"
            >
              <svg className="w-6 h-6 text-gray-900 dark:text-gray-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {/* Portfolio Context Badge */}
            {!isAiInternalSidebarCollapsed && (
              <div className="absolute top-4 left-4 z-[60] px-3 py-1.5 bg-purple-600 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-opacity duration-300">
                <span>📊</span>
                <span>{config.name} Portfolio</span>
              </div>
            )}
            {/* StonksAI Component */}
            <div className="h-full w-full">
              <StonksAI 
                tickers={currentPortfolioTickers} 
                onSidebarToggle={setIsAiInternalSidebarCollapsed}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}