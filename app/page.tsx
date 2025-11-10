'use client';

import { useState, useEffect } from 'react';
import { configs } from '@/lib/config';
import { calculatePosition } from '@/lib/calculator';
import { addDividend, reinvestDRIP } from '@/lib/drip';
import { checkAlerts } from '@/lib/alerts';
import { fetchEnergyCommodities, fetchCopperCommodity } from '@/lib/api';
import { generateEnergySnapshot, generateCopperSnapshot } from '@/lib/api/snapshot';
import { fetchEnergyNews, fetchCopperNews } from '@/lib/api/news';
import AlertBanner from '@/components/AlertBanner';
import CommodityCard from '@/components/CommodityCard';

export default function Home() {
  const [active, setActive] = useState<'energy' | 'copper'>('energy');
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [market, setMarket] = useState<any>({});
  const [alerts, setAlerts] = useState<any>(null);

  const config = configs.find(c => c.id === active)!;

  const fetchPrices = async (symbols: string[]) => {
    const res = await fetch(`https://api.polygon.io/v2/last/nbbo/${symbols.join(',')}?apiKey=${process.env.NEXT_PUBLIC_POLYGON_API_KEY}`);
    const data = await res.json();
    const map: Record<string, number> = {};
    data.results?.forEach((r: any) => {
      const sym = r.T.includes('.') ? r.T : `${r.T}.TO`;
      map[sym] = r.p ?? r.a ?? r.b;
    });
    return map;
  };

  useEffect(() => {
    Notification.requestPermission();
  }, []);

  useEffect(() => {
    const load = async () => {
      const prices = await fetchPrices(config.stocks.map(s => s.symbol));
      const built = config.stocks.map(stock => {
        const price = prices[stock.symbol] || 0;
        return { ...stock, ...calculatePosition(stock, price, config), price };
      });

      for (const s of built) {
        const div = Math.random() * 0.1;
        if (div > 0) {
          await addDividend(s.symbol, div * s.shares);
          s.shares += await reinvestDRIP(s.symbol, s.price);
        }
      }

      const total = built.reduce((a, b) => a + b.actualValue, 0);
      const alerts = await checkAlerts(total, config);

      let comms, snap, news;
      if (active === 'energy') {
        comms = await fetchEnergyCommodities();
        snap = await generateEnergySnapshot();
        news = await fetchEnergyNews();
      } else {
        comms = { copper: await fetchCopperCommodity() };
        snap = await generateCopperSnapshot();
        news = await fetchCopperNews();
      }

      setPortfolio(built);
      setMarket({ commodities: comms, snapshot: snap, news });
      setAlerts(alerts);
    };

    load();
    const id = setInterval(load, 10000);
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
          {Object.entries(market.commodities || {}).map(([key, comm]: any) => (
            <CommodityCard key={key} name={comm.name || key} price={comm.price} ts={comm.timestamp} />
          ))}
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