import { NextRequest } from 'next/server';
import { connectToDatabase } from '../../../../../../../utils/connectMongo.js';
import { suggestStreetLine } from '../../../admin_controller.js';

type Context = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Context) {
  await connectToDatabase();
  return suggestStreetLine(req, (await params).id);
}
