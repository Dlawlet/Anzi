import Mailing from "../../../../models/mailingModel";
import { NextResponse } from "next/server";


export const addtoMailing = async (req, res) => {
    const body = await req.json();
    const { 
        email,
    } = body
    // to handle invalid input data we have the following code
    //console.log(body);

    let mailtoAdd;
    try {
        console.log("email: ", email);
        mailtoAdd = await Mailing.create({
            email,
        });
    } catch (error) {
        //console.log(error);
        return NextResponse.json({ error: error }, { status: 500 })
    }

    if (!mailtoAdd) {
        //console.log("Internal Server Error");
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
    return NextResponse.json(mailtoAdd, { status: 200 });
};

export const deletefromMailing = async (req, res) => {
    const em = req.nextUrl.searchParams.get('email');
    let mail;
    try {
        mail = await Mailing.findOneAndDelete({ email: em });
    } catch (error) {
        //console.log(error);
        return NextResponse.json({ error: error }, { status: 500 })
    }

    if (!mail) {
        //console.log("Internal Server Error");
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Address deleted successfully" '}, { status: 200 });    
}; 

