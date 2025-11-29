// lib/api/snapshot/energy.ts
import { fetchEnergyCommodities } from '../commodities/energy';
import { fetchEnergyNews } from '../news/energy';

export const generateEnergySnapshot = async (): Promise<string> => {
  const [comms, news] = await Promise.all([fetchEnergyCommodities(), fetchEnergyNews()]);

  const oil = comms?.oil ? `**WTI**: $${comms.oil.price.toFixed(2)} | ${comms.oil.timestamp}` : `**WTI**: N/A`;
  const gas = comms?.gas ? `**NG**: $${comms.gas.price.toFixed(3)} | ${comms.gas.timestamp}` : `**NG**: N/A`;

  const headlines = news.length > 0
    ? news.slice(0, 3).map(n => `• ${n.title}`).join('\n')
    : '• No headlines';

  return `
**Energy Snapshot – ${new Date().toLocaleDateString()}**

${oil}
${gas}

**Drivers**: LNG exports, OPEC, winter demand, rig count
**Headlines**:
${headlines}
  `.trim();
};