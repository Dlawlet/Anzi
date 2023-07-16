export const metadata = {
    title: 'Map - Anzi!',
    description: 'Anzi is a project that aims to provide a simple and easy to use solution for the problem of finding addresses African countries.',
  }

import { NextPage, NextPageContext } from 'next';
import Mapp from '@/components/map'

interface MapPageProps {
    req: NextPageContext['req'];
    res: NextPageContext['res'];
  }

  const Map: NextPage<MapPageProps> = ({ req, res }) => {
    return (
      <div>
        <Mapp req={req} res={res} />
      </div>
    );
  };
  
  export default Map;

  
