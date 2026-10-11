import { NextRequest } from 'next/server';
import { connectToDatabase } from '../../../../utils/connectMongo.js';
import { listNearbyStreets } from './streets_controller.js';

export async function GET(req: NextRequest) {
  await connectToDatabase();
  return listNearbyStreets(req);
}
