import { addAddress, getAddFromId, getAddresses, getAddFromCoord, getAddFromName } from './address_controller.js';
import { NextRequest } from 'next/server';
import {connectToDatabase} from '../../../../utils/connectMongo.js';


export  async function GET(req: NextRequest) {
  await connectToDatabase();
  let responses;
  const id = req.nextUrl.searchParams.get('id');
  const coordo = req.nextUrl.searchParams.get('coordinates');
  const search = req.nextUrl.searchParams.get('search');

  if (id) {
    responses = await getAddFromId(req);
    

  } else if (coordo) {
    responses = await getAddFromCoord(req, coordo);

  } else if (search) {
    responses = await getAddFromName(req, search);
  
  }

  else { 
    responses = await getAddresses(req);
  }
  return responses;
}

export async function POST(req: Request) {
  await connectToDatabase();
  const responses = await addAddress(req);
  return responses;
}
