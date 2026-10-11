import { NextRequest } from 'next/server';
import { connectToDatabase } from '../../../../utils/connectMongo.js';
import { sendContact } from './contact_controller.js';

export async function POST(req: NextRequest) {
  await connectToDatabase();
  return sendContact(req);
}
