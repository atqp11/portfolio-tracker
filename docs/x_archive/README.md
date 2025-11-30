# Documentation Archive

This folder contains **outdated or superseded documentation** for historical reference only.

**DO NOT use these documents for active development.**

---

## Archived Documents

### AI Strategy & Design

**`AI_CACHING.md`** (Archived: Nov 19, 2025)
- Described old client-side localStorage caching strategy
- **Superseded by:** `AI_MODEL_STRATEGY.md` (Redis-based caching with lazy indexing)

**`stock-research-agent-design.md` + `.pdf`** (Archived: Nov 19, 2025)
- Initial AI agent design document from Nov 17, 2025
- **Superseded by:** `retail_stock_ai_pipeline_system_design_recommendations.md` + `AI_MODEL_STRATEGY.md`

### Refactoring & Analysis

**`REFACTORING_PLAN_ORIGINAL.md`** (Archived: Nov 19, 2025)
- Original refactoring plan
- **Status:** Analysis completed in `REFACTORING_STATUS_ANALYSIS.md`

**`REFACTORING_STATUS_ANALYSIS.md`** (Archived: Nov 19, 2025)
- Refactoring status analysis
- **Note:** Refactoring completed or moved to active roadmap

**`DOCUMENTATION_CLEANUP_RECOMMENDATIONS.md`** (Archived: Nov 19, 2025)
- Recommendations for documentation cleanup
- **Status:** Cleanup completed Nov 19, 2025

**`TESTING_FUNDAMENTALS.md`** (Archived: Nov 19, 2025)
- Basic testing guidelines
- **Note:** Testing strategy now integrated into `CLAUDE.md`

---

## Active Documentation (DO NOT ARCHIVE)

**For current development, refer to:**
- `docs/AI_MODEL_STRATEGY.md` - Production-ready AI strategy
- `docs/retail_stock_ai_pipeline_system_design_recommendations.md` - System design source of truth
- `docs/ACTIVE_TODOS.md` - Current sprint tasks
- `docs/FEATURE_ROADMAP.md` - Long-term roadmap
- `docs/SERVICE_LAYER_ARCHITECTURE.md` - Active refactoring
- `docs/CLAUDE.md` - Development guidelines
- `docs/prd/` - Product requirements (historical reference, keep)

---

## Archive Policy

**Archive when:**
- ✅ Document is superseded by newer version
- ✅ Implementation is complete and documented elsewhere
- ✅ Content is outdated due to architecture changes

**Keep in archive for:**
- Historical reference
- Understanding past decisions
- Audit trail

**Delete from archive when:**
- Document is >2 years old AND no longer referenced
- Content is completely irrelevant to current system

---

*Last updated: November 19, 2025*
