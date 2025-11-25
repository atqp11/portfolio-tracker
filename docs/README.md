# Documentation Index

**Portfolio Tracker - Complete Documentation**

---

## 📖 Main Documentation

### **[ARCHITECTURE.md](./ARCHITECTURE.md)** ⭐
**Complete system design and architecture documentation**

Covers:
- System overview and components
- SSR vs Admin client (RLS explained)
- Tier system and limits
- Usage tracking and quota enforcement
- Database schema and security
- Request flow and caching strategy
- API reference
- Testing and monitoring

**Start here for understanding the system!**

---

## 🗂️ Feature Documentation

### **[FEATURE_ROADMAP.md](./FEATURE_ROADMAP.md)**
Product roadmap and feature planning

---

## 📦 Archived Documentation

Old documentation moved to `docs/archive/`:
- TIER_SYSTEM_CONSOLIDATION.md - Historical tier system migration notes
- USAGE_TRACKING_SYSTEM.md - Old usage tracking documentation
- USAGE_TRACKING_IMPLEMENTATION.md - Historical implementation docs
- USER_TIER_LIMITS.md - Legacy tier limits documentation
- QUOTA_INTEGRATION_COMPLETE.md - Implementation completion log (now integrated into ARCHITECTURE.md)

---

## 🎯 Quick Reference

**Tiers**: Free ($0), Basic ($9.99), Premium ($19.99)

**Actions & Quotas**:
- \`chatQuery\` - Daily (10/100/unlimited)
- \`portfolioAnalysis\` - Daily (1/10/unlimited)
- \`secFiling\` - Monthly (3/unlimited/unlimited)

**Clients**:
- SSR Client: User-facing, RLS protected
- Admin Client: System operations, bypass RLS

**Endpoints**:
- \`/api/ai/chat\` - Chat (daily, 12hr cache)
- \`/api/risk-metrics\` - Analysis (daily, 6hr cache)
- \`/api/sec-edgar\` - Filings (monthly, no cache)

---

For complete details, see **[ARCHITECTURE.md](./ARCHITECTURE.md)**
