# Documentation Directory

**Portfolio Tracker - AI-Powered Investment Research Platform**

---

## 🚀 AI System Documentation - Start Here

### 👉 For MVP Implementation (0-5K users)

**⭐ [`mvp_ai_system_design.md`](./mvp_ai_system_design.md)** ← **START HERE**
- Complete implementation guide ready to ship in 7-14 days
- Single model approach (Llama-3.3-70B via OpenRouter)
- 4-layer caching strategy (Query → Fact sheets → Filing summaries → Edge)
- "Finch" AI persona with emotional state detection
- Budget: ~$107/month (1K users)
- **Status:** ✅ Production-ready
- **Last updated:** Nov 23, 2025

### 📚 For Phase 2+ (10K+ users, advanced features)

**📖 [`retail_stock_ai_pipeline_system_design_recommendations.md`](./retail_stock_ai_pipeline_system_design_recommendations.md)** ← **REFERENCE**
- Comprehensive RAG architecture with vector DB + embeddings
- Multi-model routing strategy for cost optimization
- Query classification and routing logic
- Company fact sheet management and versioning
- Enhanced security & compliance guidelines
- **Status:** 📚 Reference for future scaling
- **Last updated:** Nov 23, 2025

### 🗑️ Deprecated

**~~[`AI_MODEL_STRATEGY.md`](./AI_MODEL_STRATEGY.md)~~** - **DEPRECATED**
- Content consolidated into mvp_ai_system_design.md and retail doc
- **Status:** ⚠️ Will be deleted - do not use for new development
- Unique content (Finch persona, security) extracted and merged

**🧠 [`CLAUDE.md`](./CLAUDE.md)** ⭐ **Development Guidelines**
- Guidance for Claude Code AI assistant
- Project structure, architecture patterns, best practices
- Next.js 14 patterns (client-first by design)
- Testing, security, performance guidelines
- **Last updated:** Nov 19, 2025

### Planning & Roadmap

**📋 [`ACTIVE_TODOS.md`](./ACTIVE_TODOS.md)**
- Current sprint tasks and priorities
- Multi-Model AI Router (HIGH PRIORITY)
- Cost Tracking Dashboard (HIGH PRIORITY)
- Overall project completion: ~60-70%

**🗺️ [`FEATURE_ROADMAP.md`](./FEATURE_ROADMAP.md)**
- Long-term SaaS platform vision
- Authentication, tiered pricing, advanced features
- 20+ week roadmap to production
- Phase-by-phase implementation plan

**🔧 [`SERVICE_LAYER_ARCHITECTURE.md`](./SERVICE_LAYER_ARCHITECTURE.md)**
- Active refactoring to Spring-style layered architecture
- DAO → Service → Controller → Client layers
- Migration status and implementation details

### Technical Reference

**🔌 [`API_PROVIDERS.md`](./API_PROVIDERS.md)**
- Alpha Vantage, FMP, Yahoo Finance, Finnhub
- API rate limits, costs, capabilities
- Provider switching logic

**✨ [`AI_COPILOT_INTEGRATION.md`](./AI_COPILOT_INTEGRATION.md)**
- StonksAI sidebar implementation
- Context-aware portfolio analysis
- UI/UX design details

---

## 📁 Subdirectories

### [`prd/`](./prd/)
Product Requirements Documents (historical reference)
- `Portfolio_Platform_PRD_v1.0.md` - Initial product vision and requirements
- **Note:** Keep for historical context and product evolution tracking

### [`archive/`](./archive/)
Outdated or superseded documentation
- See `archive/README.md` for details
- **Do NOT use for active development**

---

## 📖 Documentation Quick Reference

| Need | Document |
|------|----------|
| **🚀 Build MVP AI system** | `mvp_ai_system_design.md` ← **START HERE** |
| **📚 Phase 2 architecture** | `retail_stock_ai_pipeline_system_design_recommendations.md` |
| **Current tasks** | `ACTIVE_TODOS.md` |
| **Long-term roadmap** | `FEATURE_ROADMAP.md` |
| **Development guidelines** | `CLAUDE.md` |
| **Architecture refactoring** | `SERVICE_LAYER_ARCHITECTURE.md` |
| **API integration** | `API_PROVIDERS.md` |
| **UI components** | `AI_COPILOT_INTEGRATION.md` |

---

## 🔄 Documentation Maintenance

**Before creating new docs:**
1. Check if existing document covers the topic
2. Update existing docs rather than duplicating
3. Archive superseded versions to `archive/`

**When updating docs:**
1. Add "Last updated" date at the top
2. Note major changes in commit message
3. Update this README if adding/removing docs

**When archiving docs:**
1. Move to `archive/` folder
2. Update `archive/README.md` with reason
3. Remove from this README

---

## 📦 Key Documents by Phase

**Phase 1: MVP Implementation (Week 1-2) ← YOU ARE HERE**
- `mvp_ai_system_design.md` - Complete implementation guide
- `SERVICE_LAYER_ARCHITECTURE.md` - Code refactoring
- `ACTIVE_TODOS.md` - Sprint tasks

**Phase 2: Advanced Features (Only when MRR > $20K or 5K+ users)**
- `retail_stock_ai_pipeline_system_design_recommendations.md` - Vector DB + RAG
- `mvp_ai_system_design.md` - Migration triggers and thresholds

**Decision Point: When to Move to Phase 2?**
Check these triggers:
- ✅ MRR > $20K/month (can afford optimization time)
- ✅ Inference costs > $500/month (meaningful savings available)
- ✅ "Deep filing" queries > 5% of traffic (currently <2%)
- ✅ 5K+ active users (scale concerns)

---

*For questions or documentation improvements, see `CLAUDE.md` for contribution guidelines.*

*Last updated: November 23, 2025*
