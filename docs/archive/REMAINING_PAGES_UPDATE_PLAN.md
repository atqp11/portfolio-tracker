# Remaining Pages Update Plan

## Summary
The fundamentals page has been successfully updated. The following pages still need portfolio selector integration:

## 1. Risk Analytics Page (`app/(dashboard)/risk/page.tsx`)

### Changes Required:
- Replace hardcoded `portfolioType` state with dynamic `selectedPortfolioId`
- Use `usePortfolios()` and `usePortfolioById()` instead of `usePortfolio(portfolioType)`
- Add PortfolioSelector component
- Add Portfolio CRUD handlers
- Add PortfolioModal for creating/editing portfolios

### Key Updates:
```tsx
// OLD
const [portfolioType, setPortfolioType] = useState<'energy' | 'copper'>('energy');
const { portfolio } = usePortfolio(portfolioType);

// NEW
const { portfolios } = usePortfolios();
const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(null);
const { portfolio } = usePortfolioById(selectedPortfolioId);
```

## 2. Thesis Page (`app/(dashboard)/thesis/page.tsx`)

### Changes Required:
- Replace hardcoded `active` state with dynamic `selectedPortfolioId`
- Use `usePortfolios()` and `usePortfolioById()` instead of `usePortfolio(active)`
- Add PortfolioSelector component
- Add Portfolio CRUD handlers
- Remove emoji icons from buttons (⚡ Energy, 🔶 Copper)
- Add PortfolioModal

### Key Updates:
```tsx
// OLD
const [active, setActive] = useState<'energy' | 'copper'>('energy');
const config = configs.find(c => c.id === active)!;

// NEW
const { portfolios } = usePortfolios();
const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(null);
const { portfolio } = usePortfolioById(selectedPortfolioId);
// Remove dependency on hardcoded configs
```

### Notes:
- The thesis page currently generates default theses based on hardcoded config
- This logic needs to be updated to work with dynamic portfolio data
- Default theses should use portfolio.targetValue and portfolio.borrowedAmount

## 3. Checklist Page (`app/(dashboard)/checklist/page.tsx`)

### Changes Required:
- Replace hardcoded `active` state with dynamic `selectedPortfolioId`
- Use `usePortfolios()` and `usePortfolioById()` instead of `usePortfolio(active)`
- Add PortfolioSelector component
- Add Portfolio CRUD handlers
- Update checklist generation to use portfolio data instead of hardcoded config
- Add PortfolioModal

### Key Updates:
```tsx
// OLD
const [active, setActive] = useState<'energy' | 'copper'>('energy');
const config = configs.find(c => c.id === active)!;

// NEW
const { portfolios } = usePortfolios();
const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(null);
const { portfolio } = usePortfolioById(selectedPortfolioId);
```

### Notes:
- Checklist generation references hardcoded stop-loss values
- Need to use portfolio.targetValue instead of hardcoded values
- Storage keys should use portfolioId instead of portfolio type

## Pattern to Follow

All pages should follow this pattern (as implemented in fundamentals):

```tsx
export default function PageName() {
  // Portfolio state
  const { portfolios, loading: portfoliosLoading, refetch: refetchPortfolios } = usePortfolios();
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(null);
  const { portfolio, refetch: refetchPortfolio } = usePortfolioById(selectedPortfolioId);
  const { stocks } = useStocks(selectedPortfolioId || undefined);

  // Portfolio modal state
  const [isPortfolioModalOpen, setIsPortfolioModalOpen] = useState(false);
  const [editingPortfolio, setEditingPortfolio] = useState<Portfolio | null>(null);

  // Auto-select first portfolio
  useEffect(() => {
    if (!portfoliosLoading && portfolios.length > 0 && !selectedPortfolioId) {
      setSelectedPortfolioId(portfolios[0].id);
    }
  }, [portfolios, portfoliosLoading, selectedPortfolioId]);

  // Portfolio CRUD handlers
  const handleCreatePortfolio = async (portfolioData: Partial<Portfolio>) => { /*...*/ };
  const handleUpdatePortfolio = async (id: string, updates: Partial<Portfolio>) => { /*...*/ };
  const handleDeletePortfolio = async (portfolio: Portfolio) => { /*...*/ };

  // Empty state check
  if (portfolios.length === 0) {
    return <EmptyStateWithCreateButton />;
  }

  return (
    <div className="space-y-6">
      <PortfolioSelector
        portfolios={portfolios}
        selectedPortfolioId={selectedPortfolioId}
        onSelect={setSelectedPortfolioId}
        onCreateNew={() => { setEditingPortfolio(null); setIsPortfolioModalOpen(true); }}
        onEdit={(p) => { setEditingPortfolio(p); setIsPortfolioModalOpen(true); }}
        onDelete={handleDeletePortfolio}
      />

      {/* Page-specific content */}

      <PortfolioModal
        isOpen={isPortfolioModalOpen}
        portfolio={editingPortfolio}
        onClose={() => { setIsPortfolioModalOpen(false); setEditingPortfolio(null); }}
        onCreate={handleCreatePortfolio}
        onUpdate={handleUpdatePortfolio}
      />
    </div>
  );
}
```

## Implementation Priority

1. ✅ **Fundamentals** - COMPLETED
2. **Risk Analytics** - Straightforward, similar to fundamentals
3. **Thesis** - Requires updates to thesis generation logic
4. **Checklist** - Requires updates to checklist generation logic

## Testing Checklist

After updating each page:
- [ ] Page loads without errors
- [ ] Portfolio selector displays all portfolios
- [ ] Switching portfolios updates the content
- [ ] Create portfolio works
- [ ] Edit portfolio works
- [ ] Delete portfolio works
- [ ] Empty state displays when no portfolios exist
- [ ] Empty state displays when portfolio has no stocks (where applicable)

## Next Steps

Would you like me to:
1. **Auto-update all remaining pages** - I'll update risk, thesis, and checklist pages with the pattern above
2. **Update one at a time** - I'll update them one by one so you can review each
3. **Provide code snippets** - I'll give you the specific code changes for each file

Let me know your preference and I'll proceed!
