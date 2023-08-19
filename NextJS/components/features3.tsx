export default function Features() {
  return (
    <section>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="py-6 md:py-10">
          {/* 1st item */}
          <div className="relative flex flex-col items-center" data-aos="fade-up" data-aos-anchor="[data-aos-id-blocks]">
            <div className="flex flex-wrap -mx-3 mb-2">
            <svg className="w-16 h-16 mb-4 ml-4" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
                <rect className="fill-current text-brown-600" width="64" height="64" rx="32" />
                <g transform="translate(21 21)" strokeLinecap="square" strokeWidth="2" fill="none" fillRule="evenodd">
                  <ellipse className="stroke-current text-brown-300" cx="11" cy="11" rx="5.5" ry="11" />
                  <path className="stroke-current text-brown-100" d="M11 0v22M0 11h22" />
                  <circle className="stroke-current text-brown-100" cx="11" cy="11" r="11" />
                </g>
              </svg>
              <svg className="w-16 h-16 mb-2 ml-4" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
                <rect className="fill-current text-brown-600" width="64" height="64" rx="32" />
                <g transform="translate(21 21)" strokeLinecap="square" strokeWidth="2" fill="none" fillRule="evenodd">
                  <ellipse className="stroke-current text-brown-300" cx="11" cy="11" rx="5.5" ry="11" />
                  <path className="stroke-current text-brown-100" d="M11 0v22M0 11h22" />
                  <circle className="stroke-current text-brown-100" cx="11" cy="11" r="11" />
                </g>
              </svg>
            </div>
            <h3 className="h3 mb-2">Add Your Address to the Map</h3>
            <p className="text-lg text-gray-400 text-center mb-4">
            Welcome to the Address Addition Page! Here, you hold the power to contribute to our map by adding your address for free. It&apos;s an effortless process that allows you to put your location on the digital map. Just follow these simple steps:
            </p>
              <h4 className="h4 mb-2 mt-5"> 
                Step 1: Fill out the form below.
              </h4>
            <p className="text-lg text-gray-400 text-left mb-2">
              Start by providing the necessary details about your address. We ask for your country, city, street information, and contact details. Don&apos;t worry if you&apos;re missing some information – we&apos;ll find it for you!
            </p>
              <h4 className="h4 mb-2 mt-5">
                Step 2: Place a pin on the map. 
              </h4>
            <p className="text-lg text-gray-400 text-left mb-2">
              If you have a precise location in mind, you can mark it on our map. This ensures accuracy in adding your address. If you don&apos;t know the exact location, don&apos;t worry! We&apos;ll find it for you, but in that case, we need you to provide us with as much information as possible in step 1.
            </p>
              <h4 className="h4 mb-2 mt-5 "> BONUS Feature: Name Your Street</h4>
            <p className="text-lg text-gray-400 text-center mb-2">
              Is your street lacking a name? No problem! You have the chance to suggest a name for your street. Choose wisely, as it could become the official name!
            </p>
            <span className="text-lg text-gray-400 text-left mb-4 ">
            <h4 className="h4 mb-2 mt-10">
              Why It Matters? </h4>
            By adding your address, you&apos;re contributing to a more comprehensive and inclusive map. Your location becomes a part of our digital community, making navigation and Object delivering easier for everyone.
            <h4 className="h4 mb-2">
              Ready to get started?</h4>
            Fill out the form, place your marker, and be a part of the map revolution. Thank you for making a difference!
            </span>
          </div>
          

          </div>

        </div>
    </section>
  )
}
