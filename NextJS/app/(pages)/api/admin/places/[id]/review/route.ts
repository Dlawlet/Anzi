import { NextRequest } from 'next/server';
import { connectToDatabase } from '../../../../../../../utils/connectMongo.js';
import { reviewPlace } from '../../../admin_controller.js';

type Context = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Context) {
  await connectToDatabase();
  return reviewPlace(req, (await params).id);
}
