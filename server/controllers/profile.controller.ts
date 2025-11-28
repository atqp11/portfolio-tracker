import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ProfileService as profileService} from '@/server/services/profile.service';
import { NotFoundError } from '@/server/middleware/error-handler.middleware';

// Schema for GET request query parameters
const getProfileQuerySchema = z
  .object({
    id: z.string().uuid().optional(),
  })
  .refine(data => data.id, {
    message: 'Profile ID must be provided.',
  });

class ProfileController {
  async get(request: NextRequest, { query }: { query: z.infer<typeof getProfileQuerySchema> }) {
    if (query.id) {
      const profile = await profileService.getProfileById(query.id);
      return NextResponse.json({ success: true, data: profile });
    }
    throw new NotFoundError('Invalid query parameters for getting profiles.');
  }
}

export const profileController = new ProfileController();