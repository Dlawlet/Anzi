import { addaddress } from './add_ask_controller.js';
import {connectToDatabase} from '../../../../utils/connectMongo.js';

export async function POST(req: Request) {
    await connectToDatabase();
    return addaddress(req);
}
