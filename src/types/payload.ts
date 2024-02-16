import { Image } from './image';

export interface Payload {
  _id: string;
  name: string;
  description?: string;
  specification?: string;
  image?: Image;
  role: 'main_payload' | 'additional_payload';
}
