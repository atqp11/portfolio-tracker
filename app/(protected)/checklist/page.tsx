import { requireUser } from '@lib/auth/session';
import { fetchChecklistForPortfolio } from './actions';
import ChecklistClient from './ChecklistClient';

/**
 * Checklist Page - Server Component
 *
 * Follows RSC pattern from 0_AI_Coding_Agent_Guide.md:
 * - Server Component for data fetching
 * - Auth via requireUser()
 * - Data fetched via server actions (which call services)
 * - Interactivity delegated to Client Component
 * - No business logic in page
 * - No direct service/repository imports
 */
export default async function ChecklistPage() {
  // 1. Auth check (RSC pattern - section 6)
  await requireUser();

  // 2. Fetch data via server actions (which call service layer with DTO handling)
  const [energyChecklist, copperChecklist] = await Promise.all([
    fetchChecklistForPortfolio('energy'),
    fetchChecklistForPortfolio('copper'),
  ]);

  // 3. Pass DTOs to Client Component for interactivity
  return (
    <ChecklistClient
      initialPortfolio="energy"
      energyChecklist={energyChecklist}
      copperChecklist={copperChecklist}
    />
  );
}
