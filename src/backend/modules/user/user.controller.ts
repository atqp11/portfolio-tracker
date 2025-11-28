import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { UserService } from '@backend/modules/user/service/user.service';
import { NotFoundError } from '@backend/common/middleware/error-handler.middleware';

// Schema for GET request query parameters
const getProfileQuerySchema = z
  .object({
    id: z.string().uuid().optional(),
  })
  .refine(data => data.id, {
    message: 'Profile ID must be provided.',
  });

class UserController {
  async get(request: NextRequest, { query }: { query: z.infer<typeof getProfileQuerySchema> }) {
    if (query.id) {
      const profile = await userService.getProfileById(query.id);
      return NextResponse.json({ success: true, data: profile });
    }
    throw new NotFoundError('Invalid query parameters for getting profiles.');
  }
}

const userService = new UserService();

export const userController = new UserController();