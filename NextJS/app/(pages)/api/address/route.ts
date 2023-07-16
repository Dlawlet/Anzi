import { addAddress, deleteAddress, getAddFromId, getAddresses, updateAddress, getAddFromCoord, getAddFromName} from './address_controller.js';
import { NextRequest, NextResponse } from 'next/server';
import {connectToDatabase} from '../../../../utils/connectMongo.js';


export  async function GET(req: NextRequest, res: NextResponse) {
  await connectToDatabase();
  let responses;
  const id = req.nextUrl.searchParams.get('id');
  const coordo = req.nextUrl.searchParams.get('coordinates');
  const search = req.nextUrl.searchParams.get('search');

  if (id) {
    responses = await getAddFromId(req, res);
    

  } else if (coordo) {
    responses = await getAddFromCoord(req, res, coordo);

  } else if (search) {
    responses = await getAddFromName(req, res, search);
  
  }

  else { 
    responses = await getAddresses(req, res);
  }
  return responses;
}

export async function POST(req: Request, res: Response) {
  await connectToDatabase();
  const responses = await addAddress(req, res);
  return responses;
}



export async function PUT(req: Request, res: Response) {
  const responses = await updateAddress(req, res);
  return responses;
} 

export async function DELETE(req: Request, res: Response) {
  const responses = await deleteAddress(req, res);
  return responses;
}


