import { NextRequest } from 'next/server';
import { connectToDatabase } from '../../../../utils/connectMongo.js';
import { presenceStatus } from './presence_controller.js';

export async function GET(req: NextRequest) {
  await connectToDatabase();
  return presenceStatus(req);
}
