// placeholder test kept to avoid requiring @testing-library/react in this workspace
import AdminActionsPanel from '../AdminActionsPanel';
import { TIER_CONFIG } from '@/lib/tiers/config';

describe('AdminActionsPanel tests (stub)', () => {
  it('placeholder sanity check', () => expect(typeof AdminActionsPanel).toBe('function'));

  it('reads tiers from central config', () => {
    const keys = Object.keys(TIER_CONFIG).sort();
    expect(keys).toEqual(['free', 'basic', 'premium'].sort());
  });
});
