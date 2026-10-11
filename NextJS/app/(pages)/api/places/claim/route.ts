import { NextRequest } from 'next/server';
import { connectToDatabase } from '../../../../../utils/connectMongo.js';
import { claimPlace } from '../places_controller.js';

export async function POST(req: NextRequest) {
  await connectToDatabase();
  return claimPlace(req);
}
