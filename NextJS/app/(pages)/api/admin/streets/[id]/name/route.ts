import { NextRequest } from 'next/server';
import { connectToDatabase } from '../../../../../../../utils/connectMongo.js';
import { setStreetName } from '../../../admin_controller.js';

type Context = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Context) {
  await connectToDatabase();
  return setStreetName(req, (await params).id);
}
