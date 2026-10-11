import { addrequest } from './request_controller.js';
import {connectToDatabase} from '../../../../utils/connectMongo.js';

export async function POST(req: Request) {
    await connectToDatabase();
    return addrequest(req);
}
