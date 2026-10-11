import Request from "../../../../models/requestModel";
import { NextResponse } from "next/server";

export const addrequest = async (req) => {
    let body;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const {
        name,
        city,
        email,
        phone,
        street,
        addrStatus,
    } = body ?? {};

    let requestquery;
    try {
        requestquery = await Request.create({
            name,
            city,
            email,
            phone,
            street,
            addrStatus,
        });
    } catch (error) {
        if (error?.name === 'ValidationError') {
            return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
        }
        console.error(error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }

    return NextResponse.json(requestquery, { status: 201 });
};
