import Address from "../../../../models/addressModel";
import { NextResponse } from "next/server";

export const addaddress = async (req) => {
    let body;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const {
        country,
        city,
        streetNumber,
        streetName,
        number,
        coordinates,
        description,
        addrStatus,
    } = body ?? {};

    let addressquery;
    try {
        addressquery = await Address.create({
            country,
            city,
            streetNumber,
            streetName,
            number,
            coordinates,
            description,
            addrStatus,
        });
    } catch (error) {
        if (error?.name === 'ValidationError') {
            return NextResponse.json({ error: 'Invalid address data' }, { status: 400 });
        }
        console.error(error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }

    return NextResponse.json(addressquery, { status: 201 });
};
