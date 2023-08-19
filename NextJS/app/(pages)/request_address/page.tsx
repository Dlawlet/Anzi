"use client";
import Features from '@/components/features2'
import Footer from '@/components/ui/footer'
import Link from 'next/link'
import React from "react";

export default function RequestForm() {
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
        <div className="max-w-3xl mx-auto text-center pb-3 md:pb-5">
            <h1 className="h1">Welcome to Anzi</h1>
            <h1 className="h1">Network! </h1>
            <h1 className="h2"> Be Confident in Your Address </h1>
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
            <div className="flex flex-wrap -mx-3 mb-4">
                <div className="w-full px-3">
                <label className="block text-gray-300 text-sm font-medium mb-1" htmlFor="full-name">Full Name <span className="text-red-600">*</span></label>
                <input id="full-name" type="text" className="form-input w-full text-gray-300" placeholder=" Enter your first and last name." required />
                </div>
            </div>
            <div className="flex flex-wrap -mx-3 mb-4">
                <div className="w-full px-3">
                <label className="block text-gray-300 text-sm font-medium mb-1" htmlFor="company-name">City <span className="text-red-600">*</span></label>
                <input id="city" type="text" className="form-input w-full text-gray-300" placeholder="Specify your city and country." required />
                </div>
            </div>
            <div className="flex flex-wrap -mx-3 mb-4">
                <div className="w-full px-3">
                <label className="block text-gray-300 text-sm font-medium mb-1" >Number <span className="text-red-600">*</span></label>
                <input id="number"  className="form-input w-full text-gray-300" placeholder="Provide your phone number." required />
                </div>
            </div>
            <div className="flex flex-wrap -mx-3 mb-4">
                <div className="w-full px-3">
                <label className="block text-gray-300 text-sm font-medium mb-1" htmlFor="email">Email</label>
                <input id="email" type="email" className="form-input w-full text-gray-300" placeholder="Add your email [you@youremail.com] for communication purposes."  />
                </div>
            </div>
            <div className="flex flex-wrap -mx-3 mb-4">
                <div className="w-full px-3">
                <label className="block text-gray-300 text-sm font-medium mb-1" >Address </label>
                <input id="street"  className="form-input w-full text-gray-300" placeholder="Provide your actual Address on our Map"  />
                </div>
            </div>
            <div className="text-sm text-gray-500 text-center">
            By validating, you agree to be contacted by  Anzi about this offer as per the Anzi <Link href="#" className="underline text-gray-400 hover:text-gray-200 hover:no-underline transition duration-150 ease-in-out">Privacy Policy</Link>.
            </div>
            <div className="flex flex-wrap -mx-3 mt-6">
                <div className="w-full px-3">
                <button className="btn text-white bg-brown-600 hover:bg-brown-700 w-full"
                type="submit">
                    Request your Address Verification </button>
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
