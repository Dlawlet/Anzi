import { NextRequest } from 'next/server';
import { connectToDatabase } from '../../../../utils/connectMongo.js';
import { lookupAddresses } from './lookup_controller.js';

export async function GET(req: NextRequest) {
  await connectToDatabase();
  return lookupAddresses(req);
}
