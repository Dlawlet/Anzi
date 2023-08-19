export default function Features() {
  return (
    <section>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="py-12 md:py-20">

          {/* Items */}
          <div className="max-w-sm mx-auto grid gap-8 md:grid-cols-1 lg:grid-cols-3 lg:gap-16 items-start md:max-w-2xl lg:max-w-none" data-aos-id-blocks>

            {/* 1st item */}
            <div className="relative flex flex-col items-center" data-aos="fade-up" data-aos-anchor="[data-aos-id-blocks]">
            <svg className="w-16 h-16 mb-4" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
                <rect className="fill-current text-brown-600" width="64" height="64" rx="32" />
                <g transform="translate(21 21)" strokeLinecap="square" strokeWidth="2" fill="none" fillRule="evenodd">
                  <ellipse className="stroke-current text-brown-300" cx="11" cy="11" rx="5.5" ry="11" />
                  <path className="stroke-current text-brown-100" d="M11 0v22M0 11h22" />
                  <circle className="stroke-current text-brown-100" cx="11" cy="11" r="11" />
                </g>
              </svg>
              <h4 className="h4 mb-2">Request Form</h4>
              <p className="text-lg text-gray-400 text-center">
                Fill out the form below to request an address. 
                <br/>
                If you are the first person to request an address on your street, you will be given the opportunity to name your street.  
                <br/> 
                Fantastic, isn&apos;t it? 

              </p>
            </div>
          

          </div>

        </div>
      </div>
    </section>
  )
}