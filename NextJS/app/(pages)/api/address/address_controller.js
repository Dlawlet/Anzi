import Address from "../../../../models/addressModel.js";
import { NextResponse } from "next/server";


export const getAddresses = async (req, res
    ) => {
    let addresses;

    try {
        addresses = await Address.find();
    }   catch (error) {
        console.log(error);
        return NextResponse.json({ error: 'Internal Server Error1' }, { status: 500 })
    }

    if (!addresses) {
        //console.log("Internal Server Error");
        return NextResponse.json({ error: 'Internal Server Error2' }, { status: 500 })
    }

    if (addresses.length === 0) {
        //console.log("No addresises found");
        return NextResponse.json({ message: 'No addressis found' }, { status: 404 })
        
    }
    //console.log("Addresses found");
    return NextResponse.json(addresses, { status: 200 });
};

export const getAddFromId = async (req, res) => {
    const _id = req.nextUrl.searchParams.get('id');
    let address;
    try {
        address = await Address.findById(_id);
    } catch (error) {
        //console.log(error);
        return NextResponse.json({ error: error }, { status: 500 })
    }

    if (!address) {
        //console.log("No Adddress found with that id");
        return NextResponse.json({ error: 'No Address found with that id' }, { status: 404 })
    }

    return NextResponse.json(address, { status: 200 });
};

export const getAddFromCoord = async (req, res, coordo) => {
    Address.createIndexes({ coordinates: "2dsphere" });
    let address;
    var array_coord = JSON.parse("[" + coordo + "]");
    try {
        address = await Address.aggregate([
            {
              $geoNear: {
                 near: { type: "Point", coordinates: array_coord },
                 distanceField: "dist.calculated",
                 maxDistance: 7,
                 includeLocs: "dist.location",
                 spherical: true
              }
            }
         ])
    } catch (error) {
        //console.log(error);
        return NextResponse.json({ error: error }, { status: 510 })
    }
    //console.log(address)
    if (address.length === 0 ) {
        //console.log("No Adddress found with that id");
        return NextResponse.json({ error: 'No Address found with that id' }, { status: 404 })
    }
    ////console.log('address found') 
    return NextResponse.json(address, { status: 200 });
};

export const getAddFromName = async (req, res, name) => {
    // partial search on field name 
    let address;
    try {
        Address.createIndexes({name: "text"})
        address = await Address.find({name: {$regex: name, $options: 'i'}}); // case insensitive search 
        //console.log(address)
    } catch (error) {
        //console.log(error);
        return NextResponse.json({ error: error }, { status: 500 })
    }

    if (address.length === 0 ) {
        //console.log("No Adddress found with that id");
        return NextResponse.json({ error: 'No Address found with that id' }, { status: 404 })
    }
    ////console.log('address found')
    return NextResponse.json(address, { status: 200 });


};

export const addAddress = async (req, res) => {
    const body = await req.json();
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
    ////console.log(body);

    let address;

    try {
        address = new Address({
            type, coordinates, name, description, number, street, city, state, country, block, code 
        });
        address = await address.save();

        //console.log("Address added");
    } catch (error) {
        //console.log(error);
        return NextResponse.json({ error: error }, { status: 500 })
    }

    if (!address) {
        //console.log("Internal Server Error");
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
    
    return NextResponse.json(address, { status: 201});
};

export const updateAddress = async (req, res) => {
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

export const deleteAddress = async (req, res) => {
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

