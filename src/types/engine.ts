import { Image } from './image';

export interface Engine {
  _id: string;
  name: string;
  image?: Image;
  description: string;
  specifications: string[];
}
