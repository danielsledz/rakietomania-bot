import { Image } from './image';

export interface Agency {
  _id: string;
  name: string;
  description?: string;
  administrator?: string;
  foundingYear?: string;
  country?: string;
  image: Image;
}
