import { Map } from "./components/Map";

import dayjs from 'dayjs';
import { hmsPlugin } from './types/HMSDayjs';
dayjs.extend(hmsPlugin);

export const App = () =>{
 
      return (
          <div>
            <Map />
          </div>
      );
  };
