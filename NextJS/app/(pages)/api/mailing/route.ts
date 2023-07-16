import { addtoMailing } from "./mailing_controller.js";
import { NextRequest, NextResponse } from 'next/server';
import {connectToDatabase} from '../../../../utils/connectMongo.js';


export  async function GET(req: NextRequest, res: NextResponse) {
  await connectToDatabase();
}

export async function POST(req: Request, res: Response) {
    await connectToDatabase();
    const responses = await addtoMailing(req, res);
    return responses;
}



export async function PUT(req: Request, res: Response) {
} 

export async function DELETE(req: Request, res: Response) {
}


