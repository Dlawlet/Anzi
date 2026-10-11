import { addtoMailing } from "./mailing_controller.js";
import { NextRequest } from 'next/server';
import {connectToDatabase} from '../../../../utils/connectMongo.js';


export  async function GET(req: NextRequest) {
  await connectToDatabase();
}

export async function POST(req: Request) {
    await connectToDatabase();
    const responses = await addtoMailing(req);
    return responses;
}



export async function PUT(req: Request) {
} 

export async function DELETE(req: Request) {
}


