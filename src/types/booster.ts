import { Image } from './image';
import { Mission } from './mission';

export interface Booster {
  _id: string;
  name: string;
  facts?: string[];
  image?: Image;
  status: string;
  currentLocation?: string;
  missions: Mission[];
  _ref: string;
}
