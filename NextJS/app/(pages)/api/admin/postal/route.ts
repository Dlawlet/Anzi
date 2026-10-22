import { NextRequest } from 'next/server';
import { connectToDatabase } from '../../../../../utils/connectMongo.js';
import { listPostalCodes, setPostalCode } from '../admin_controller.js';

export async function GET(req: NextRequest) {
  await connectToDatabase();
  return listPostalCodes(req);
}

export async function POST(req: NextRequest) {
  await connectToDatabase();
  return setPostalCode(req);
}
