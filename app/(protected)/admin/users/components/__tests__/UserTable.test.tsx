import UserTable from '../UserTable';

describe('UserTable (lightweight checks)', () => {
  it('exports a function component', () => {
    expect(typeof UserTable).toBe('function');
  });

  it('accepts user objects with snake_case usage fields without throwing', () => {
    const users: any = [
      {
        id: 'u1',
        email: 'a@example.com',
        name: 'User A',
        tier: 'free',
        is_admin: true,
        usage: {
          daily: { chat_queries: 5, portfolio_analysis: 1 },
          monthly: { sec_filings: 2 },
        },
      },
    ];

    expect(() => UserTable({ users })).not.toThrow();
  });
});
