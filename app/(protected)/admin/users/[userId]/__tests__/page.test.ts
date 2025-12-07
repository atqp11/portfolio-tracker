import Page from '../page';

describe('Admin user details page (basic sanity)', () => {
  it('exports a page function', () => {
    expect(typeof Page).toBe('function');
  });
});
