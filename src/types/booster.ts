import { Image } from './image';

export interface Booster {
  _id: string;
  name: string;
  facts?: string[];
  image?: Image;
  status: string;
  currentLocation?: string;
}
