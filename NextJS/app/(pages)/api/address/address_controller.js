import Address from "../../../../models/addressModel.js";
import { NextResponse } from "next/server";
import { cleanSearch, escapeRegex, isValidId, parseCoordinates } from "../../../../utils/validate.js";

const serverError = (error) => {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
};
const badRequest = (message) => NextResponse.json({ error: message }, { status: 400 });

async function readBody(req) {
    try {
        const body = await req.json();
        return body && typeof body === "object" && !Array.isArray(body) ? body : null;
    } catch {
        return null;
    }
}

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
    if (!isValidId(_id)) return badRequest('Invalid id');
    let address;
    try {
        address = await Address.findById(_id);
    } catch (error) {
        return serverError(error);
    }

    if (!address) {
        //console.log("No Adddress found with that id");
        return NextResponse.json({ error: 'No Address found with that id' }, { status: 404 })
    }

    return NextResponse.json(address, { status: 200 });
};

export const getAddFromCoord = async (req, res, coordo) => {
    const array_coord = parseCoordinates(coordo);
    if (!array_coord) return badRequest('Invalid coordinates');
    Address.createIndexes({ coordinates: "2dsphere" });
    let address;
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
        return serverError(error);
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
    const search = cleanSearch(name);
    if (!search) return badRequest('Invalid search');
    let address;
    try {
        Address.createIndexes({name: "text"})
        address = await Address.find({name: {$regex: escapeRegex(search), $options: 'i'}}).limit(20); // case insensitive, literal match
    } catch (error) {
        return serverError(error);
    }

    if (address.length === 0 ) {
        //console.log("No Adddress found with that id");
        return NextResponse.json({ error: 'No Address found with that id' }, { status: 404 })
    }
    for (var i = 0; i < address.length; i++) {
        if (address[i]["name"]=== "Unnamed") {
            address.splice(i, 1); 
            i--;
        }
    }
    return NextResponse.json(address, { status: 200 });


};

export const addAddress = async (req, res) => {
    const body = await readBody(req);
    if (!body) return badRequest('Invalid JSON body');
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
        if (error?.name === 'ValidationError') return badRequest('Invalid address data');
        return serverError(error);
    }

    return NextResponse.json(address, { status: 201});
};

export const updateAddress = async (req, res) => {
    const body = await readBody(req);
    if (!body) return badRequest('Invalid JSON body');
    const _id = req.nextUrl.searchParams.get('id');
    if (!isValidId(_id)) return badRequest('Invalid id');
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
        address = await Address.findById(_id);
        if (!address) return NextResponse.json({ error: 'No Address found with that id' }, { status: 404 });
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
        if (error?.name === 'ValidationError') return badRequest('Invalid address data');
        return serverError(error);
    }

    return NextResponse.json(address, { status: 200 });
};

export const deleteAddress = async (req, res) => {
    const _id = req.nextUrl.searchParams.get('id');
    if (!isValidId(_id)) return badRequest('Invalid id');
    let address;
    try {
        address = await Address.findByIdAndDelete(_id);
    } catch (error) {
        return serverError(error);
    }

    if (!address) {
        return NextResponse.json({ error: 'No Address found with that id' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Address deleted successfully" '}, { status: 200 });    
}; 

