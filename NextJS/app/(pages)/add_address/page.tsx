"use client";
import Features from '@/components/features2'
import Footer from '@/components/ui/footer'
import Link from 'next/link'
import React from "react";
import MapComponent from "@/components/map"

export default function AddForm() {
    // Handles the submit event on form submit.
    const handleSubmit = async (event:any ) => {
    // Stop the form from submitting and refreshing the page.
    event.preventDefault()
 
    // Get data from the form.
    const data = {
        name: event.target[0].value || "Anonymous",
        city: event.target[1].value || "Unknown",
        phone: event.target[2].value || "Unknown",
        email: event.target[3].value || "Unknown",
        street: event.target[4].value || "Unknown",
        date : new Date().toLocaleString(),
        addrStatus: "Received",
    }
 
    // Send the data to the server in JSON format.
    const JSONdata = JSON.stringify(data)
 
    // API endpoint where we send form data.
    const endpoint = '/api/addrequest'
 
    // Form the request for sending data to the server.
    const options = {
      // The method is POST because we are sending data.
      method: 'POST',
      // Tell the server we're sending JSON.
      headers: {
        'Content-Type': 'application/json',
      },
      // Body of the request is the JSON data we created above.
      body: JSONdata,
    }
 
    // Send the form data to our forms API on Vercel and get a response.
    const response = await fetch(endpoint, options)
    
    // If the response is not OK, throw an error.
    if (!response.ok) {
        throw new Error(response.statusText)
    }
    else {
    // Get the response data from server as JSON.
    // If server returns the name submitted, that means the form works.
    const result = await response.json()
    alert(`There we go Dear ${result.name}, your request has been received, we will contact you soon!`)}
  }

return (
    <section className="relative">
    <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="pt-32 pb-12 md:pt-40 md:pb-20">

        {/* Page header */}
        <div className="max-w-3xl mx-auto text-center pb-12 md:pb-20">
            <h1 className="h1">Welcome to Anzi</h1>
            <h1 className="h1">Network! </h1>
            <h1 className="h2"> be findable right away.</h1>
        </div>

        {/* Form */}
        <div className="">
            <form>
                <div className="flex flex-wrap -mx-3">
                    <div className="w-full px-3">
                    </div>
                </div>
            </form>
            <Features/>
            <div className="flex items-center my-6">
                <div className="border-t border-gray-700 border-dotted grow mr-3" aria-hidden="true"></div>
                <div className="border-t border-gray-700 border-dotted grow ml-3" aria-hidden="true"></div>
            </div>
            
        <form className='max-w-3xl mx-auto' onSubmit={handleSubmit}>
            <div className="flex flex-wrap -mx-3 mb-4 mt-10 md:mt-5">
                <div className="w-full px-3">
                <label className="block text-gray-300 text-sm font-medium " htmlFor="full-name">Country <span className="text-red-600">*</span></label>
                <input id="full-name" type="text" className="form-input w-full text-gray-300 " placeholder="The country where the address is located " required />
                </div>
            </div>
            <div className="flex flex-wrap -mx-3 mb-4 mt-10 md:mt-5">
                <div className="w-full px-3">
                <label className="block text-gray-300 text-sm font-medium" htmlFor="company-name">City <span className="text-red-600">*</span></label>
                <input id="city" type="text" className="form-input w-full text-gray-300 " placeholder="The city where the address is located" required />
                </div>
            </div>
            <div className="flex flex-wrap -mx-3 mb-4 mt-10 md:mt-5">
                <div className="w-full px-3">
                <label className="block text-gray-300 text-sm font-medium mb-1" >Street's number </label>
                <h4 className=" text-sm text-gray-500 h-5 font-small"> ⓘ If you don't know the name of the Street, leave the field empty. We will take good care of it. </h4>
                <input id="Street_nb"  className="form-input w-full text-gray-300 mt-10 md:mt-5" placeholder="The number of your street on map or on signalytics"  />
                </div>
            </div>
            <div className="flex flex-wrap -mx-3 mb-4 mt-10 md:mt-5">
                <div className="w-full px-3">
                <label className="block text-gray-300 text-sm font-medium mb-1" >Street's name </label>
                <h4 className=" text-sm text-gray-500 h-5 font-small mb-4 md:mb-2"> ⓘ If you don't know the name of the Street, leave the field empty. </h4>
                <h4 className=" text-sm text-gray-500 h-5 font-small"> 
                ⓘ If the Street doesn't have a name yet, you can <span className="text-brown-500">propose one</span>. Choose WISELY   </h4> 

                <input id="Street_nm"  className="form-input w-full text-gray-300 mt-10 md:mt-5" placeholder="The Name of your street on map or on signalytics"  />
                </div>
            </div>
            <div className="flex flex-wrap -mx-3 mb-4">
                <div className="w-full px-3">
                <label className="block text-gray-300 text-sm font-medium mb-1" >Contact</label>
                <h4 className=" text-sm text-gray-500 h-5 font-small mb-4 md:mb-2"> ⓘ Provide your email or your phone number if you want to be contacted as soon as the address is online </h4>
                <input id="contact" type="text" className="form-input w-full text-gray-300 mt-10 md:mt-5" placeholder="Your Email ou Phone Number "  /> 
                </div>
            </div>
            <h4 className=" text-gray-500 h-5 font-small mb-2"> ⚠ All the fields with <span className="text-red-600">*</span> are required</h4>
            <div className="flex flex-wrap -mx-3 mb-4 mt-10 md:mt-5">
                <div className="w-full px-3">
                <label className="block text-gray-300 text-sm font-medium mb-1" >Localization on Map</label>
                <h4 className=" text-sm text-gray-500 h-5 font-small "> ⓘ Place a Marker on the map </h4>
                <span >
                <MapComponent widtho={"100%"} heighto={"30vh"} py={"py-5"} />
                </span>
                </div>
            </div>
            <div className="text-sm text-gray-500 text-center mt-10 md:mt-5 ">
                By validating, you agree to be contacted by Anzi about this offer as per the Anzi <Link href="#" className="underline text-gray-400 hover:text-gray-200 hover:no-underline transition duration-150 ease-in-out">Privacy Policy</Link>.
            </div>
            <div className="flex flex-wrap -mx-3 mt-6">
                <div className="w-full px-3">
                <button className="btn text-white bg-brown-600 hover:bg-brown-700 w-full"
                type="submit">
                    Add this Address</button>
                </div>
            </div>
        </form>
            <div className="text-gray-400 text-center mt-6">
            Already having an address? find it on  <Link href="/map" className="text-brown-600 hover:text-gray-200 transition duration-150 ease-in-out">Map</Link>
            </div>
        </div>

        </div>
    </div>
    <Footer />
    </section>
)
}
