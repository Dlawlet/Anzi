import { NextRequest } from 'next/server';
import { connectToDatabase } from '../../../../../utils/connectMongo.js';
import { deletePlace, getPlaceByCode, updatePlace } from '../places_controller.js';

type Context = { params: Promise<{ code: string }> };

export async function GET(req: NextRequest, { params }: Context) {
  await connectToDatabase();
  return getPlaceByCode(req, (await params).code);
}

export async function PATCH(req: NextRequest, { params }: Context) {
  await connectToDatabase();
  return updatePlace(req, (await params).code);
}

export async function DELETE(req: NextRequest, { params }: Context) {
  await connectToDatabase();
  return deletePlace(req, (await params).code);
}
