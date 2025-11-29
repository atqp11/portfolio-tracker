// lib/api/snapshot/copper.ts
import { fetchCopperCommodity } from '../commodities/copper';
import { fetchCopperNews } from '../news/copper';

export const generateCopperSnapshot = async (): Promise<string> => {
  const [comm, news] = await Promise.all([fetchCopperCommodity(), fetchCopperNews()]);

  const price = comm ? `**Copper**: $${comm.price.toFixed(3)} | ${comm.timestamp}` : `**Copper**: N/A`;

  const headlines = news.length > 0
    ? news.slice(0, 3).map(n => `• ${n.title}`).join('\n')
    : '• No headlines';

  return `
**Copper Snapshot – ${new Date().toLocaleDateString()}**

${price}

**Drivers**: China demand, tariffs, EV boom, inventories
**Headlines**:
${headlines}
  `.trim();
};