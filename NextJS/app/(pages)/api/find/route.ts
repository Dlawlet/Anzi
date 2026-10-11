import { NextRequest } from 'next/server';
import { connectToDatabase } from '../../../../utils/connectMongo.js';
import { findAddress } from './find_controller.js';

export async function GET(req: NextRequest) {
  await connectToDatabase();
  return findAddress(req);
}
