import { NextRequest } from 'next/server';
import { connectToDatabase } from '../../../../utils/connectMongo.js';
import { createPlace, listPlaces } from './places_controller.js';

export async function GET(req: NextRequest) {
  await connectToDatabase();
  return listPlaces(req);
}

export async function POST(req: NextRequest) {
  await connectToDatabase();
  return createPlace(req);
}
