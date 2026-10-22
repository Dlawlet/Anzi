import { NextRequest } from 'next/server';
import { connectToDatabase } from '../../../../../utils/connectMongo.js';
import { suggestStreets } from './suggest_controller.js';

export async function GET(req: NextRequest) {
  await connectToDatabase();
  return suggestStreets(req);
}
