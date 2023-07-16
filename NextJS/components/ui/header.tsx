import Link from 'next/link'
import MobileMenu from './mobile-menu'
import Image from 'next/image'
import logo from '@/public/images/anzi_V3prime.png'

export default function Header() {
  return (
    <header className="absolute w-full z-30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-20">
          {/* Site branding */}
          <div className="shrink-0 mr-4">
            {/* Logo */}
            <Link href="/" className="block" aria-label="Cruip">
              <Image src={logo} width={50}  alt="logo" />
            </Link>
          </div>

          {/* Desktop navigation */}
          <nav className="hidden md:flex md:grow">
            {/* Desktop sign in links */}
            <ul className="flex grow justify-end flex-wrap items-center">
              
              <li>
                <Link href="/map"
                  className="font-medium text-brown-600 hover:text-gray-200 px-4 py-3 flex items-center transition duration-150 ease-in-out"
                >
                  Map
                </Link>
              </li>
              {/*<li>
                <Link
                  href="/signin"
                  className="font-medium text-brown-600 hover:text-gray-200 px-4 py-3 flex items-center transition duration-150 ease-in-out"
                >
                  Sign in
                </Link>
              </li>
               <li>
                <Link href="/signup" className="btn-sm text-white bg-brown-600 hover:bg-brown-700 ml-3">
                  Sign up
                </Link>
              </li> */}
              <li>
                <Link href="/request_address" 
                className="btn-sm text-white bg-brown-600 hover:bg-brown-700 ml-3">
                  Request An Address
                </Link>
              </li>
            </ul>
          </nav>

          <MobileMenu />

        </div>
      </div>
    </header>
  )
}
