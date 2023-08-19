 export const metadata = {
    title: 'Map - Anzi!',
    description: 'Anzi is a project that aims to provide a simple and easy to use solution for the problem of finding addresses in some countries.',
  }

import MapComponent from "@/components/map"
  
  export default function Map() {
  
      return (
          <>
              <MapComponent widtho={"100%"} heighto={"100vh"} py={"py-20"} page = {"map"}/>
          </>
      )
  }
  
    
  