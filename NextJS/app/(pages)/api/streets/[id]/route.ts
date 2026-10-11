import { NextRequest } from 'next/server';
import { connectToDatabase } from '../../../../../utils/connectMongo.js';
import { getStreet } from '../streets_controller.js';

type Context = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Context) {
  await connectToDatabase();
  return getStreet(req, (await params).id);
}
