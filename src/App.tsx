import { Map } from "./components/Map";

import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { hmsPlugin } from './types/HMSDayjs';
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.extend(hmsPlugin);

export const App = () =>{
 
      return (
          <div>
            <Map />
          </div>
      );
  };
