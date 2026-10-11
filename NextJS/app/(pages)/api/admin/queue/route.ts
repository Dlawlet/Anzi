import { NextRequest } from 'next/server';
import { connectToDatabase } from '../../../../../utils/connectMongo.js';
import { getQueue } from '../admin_controller.js';

export async function GET(req: NextRequest) {
  await connectToDatabase();
  return getQueue(req);
}
