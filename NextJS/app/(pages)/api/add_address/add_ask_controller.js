import Address from "../../../../models/addressModel";
import { NextResponse } from "next/server";


export const addaddress = async (req, res) => {
    const body = await req.json();
    const { 
        country,
        city,
        streetNumber,
        streetName,
        number,
        coordinates,
        description,
        addrStatus,
    } = body
    // to handle invalid input data we have the following code
    //console.log(body);

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
        //console.log(error);
        return NextResponse.json({ error: error }, { status: 500 })
    }

    if (!addressquery) {
        //console.log("Internal Server Error");
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }

    return NextResponse.json(addressquery, { status: 200 });
};

export const updateaddress = async (req, res) => {
    const body = await req.json();
    const _id = req.nextUrl.searchParams.get('id');
    const { 
        type,
        coordinates,
        name,
        description,
        number,
        street,
        city,
        state,
        country,
        block,
        code,
    } = body
    // to handle invalid input data we have the following code
    //console.log(body);

    let address;

    try {
        address = await Address.findByIdAndUpdate(_id);
        address.type = type || address.type;
        address.coordinates = coordinates || address.coordinates;
        address.name = name || address.name;
        address.description = description || address.description;
        address.number = number || address.number;
        address.street = street || address.street;
        address.city = city || address.city;
        address.state = state || address.state;
        address.country = country || address.country;
        address.block = block || address.block;
        address.code = code || address.code;

        address = await address.save();

        //console.log("Address updated");
    } catch (error) {
        //console.log(error);
        return NextResponse.json({ error: error }, { status: 500 })
    }

    if (!address) {
        //console.log("Internal Server Error");
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }

    return NextResponse.json(address, { status: 200 });
};

export const deleteaddress = async (req, res) => {
    const _id = req.nextUrl.searchParams.get('id');
    let address;
    try {
        address = await Address.findByIdAndDelete(_id);
    } catch (error) {
        //console.log(error);
        return NextResponse.json({ error: error }, { status: 500 })
    }

    if (!address) {
        //console.log("Internal Server Error");
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Address deleted successfully" '}, { status: 200 });    
}; 

