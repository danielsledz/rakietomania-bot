import { Image } from './image';

export interface Stage {
  _id: string;
  name: string;
  image?: Image;
  description: string;
  specifications: string[];
}
