# Documentation Directory

**Portfolio Tracker - AI-Powered Investment Research Platform**

---

## 📚 Active Documentation

### Core Strategy & Architecture

**🎯 [`AI_MODEL_STRATEGY.md`](./AI_MODEL_STRATEGY.md)** ⭐ **Production-Ready**
- Cloud-based AI model strategy (Groq GPT-OSS 20B, Gemini Flash)
- Two-pipeline architecture (batch processing + RAG for chat)
- Lazy indexing strategy for cost optimization
- Budget: $35-78/month
- **Last updated:** Nov 19, 2025

**🏗️ [`retail_stock_ai_pipeline_system_design_recommendations.md`](./retail_stock_ai_pipeline_system_design_recommendations.md)** ⭐ **Source of Truth**
- Comprehensive system design for 1,000 users, 500 stocks
- SEC filing ingestion, news/social sentiment, RAG pipeline
- Model recommendations with cost breakdown
- Caching strategy (Redis, S3, FAISS)
- **Last updated:** Nov 19, 2025

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
| **AI strategy overview** | `AI_MODEL_STRATEGY.md` |
| **System design details** | `retail_stock_ai_pipeline_system_design_recommendations.md` |
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

**Phase 1: Current Implementation (Week 1-2)**
- `AI_MODEL_STRATEGY.md` - Model selection and routing
- `SERVICE_LAYER_ARCHITECTURE.md` - Code refactoring
- `ACTIVE_TODOS.md` - Sprint tasks

**Phase 2: SEC Filing Pipeline (Week 2-3)**
- `retail_stock_ai_pipeline_system_design_recommendations.md` - EDGAR integration
- `AI_MODEL_STRATEGY.md` - Embeddings & vector store section

**Phase 3: News & Social (Week 3-4)**
- `retail_stock_ai_pipeline_system_design_recommendations.md` - Batch processing
- `AI_MODEL_STRATEGY.md` - Caching strategy

**Phase 4: RAG Chat (Week 4-5)**
- `AI_MODEL_STRATEGY.md` - Investor chat implementation
- `AI_COPILOT_INTEGRATION.md` - UI integration

**Phase 5: Monitoring (Week 5-6)**
- `AI_MODEL_STRATEGY.md` - Telemetry and cost tracking
- `ACTIVE_TODOS.md` - Cost dashboard task

---

*For questions or documentation improvements, see `CLAUDE.md` for contribution guidelines.*

*Last updated: November 19, 2025*
