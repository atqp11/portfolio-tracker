import { NextRequest } from 'next/server';
import { riskController } from '@backend/modules/risk/risk.controller';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  return riskController.calculate(req);
}
