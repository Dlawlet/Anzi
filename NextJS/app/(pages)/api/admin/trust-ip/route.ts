import { NextRequest } from 'next/server';
import { connectToDatabase } from '../../../../../utils/connectMongo.js';
import { setTrustedIp } from '../admin_controller.js';

export async function POST(req: NextRequest) {
  await connectToDatabase();
  return setTrustedIp(req);
}
