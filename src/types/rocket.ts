import { Agency } from './agency';
import { Engine } from './engine';
import { Image } from './image';
import { Stage } from './stage';

export interface Rocket {
  _id: string;
  name: string;
  description: string;
  generalInformations?: string;
  carrying_capacity?: { name: string; value: string }[];
  successfull_launches: string;
  failed_launches: string;
  partial_failed_launches: string;
  partial_successfull_launches: string;
  image: Image;
  gallery?: {
    image: Image;
  }[];
  agency: Agency;
  stages: Stage[];
  engines: Engine[];
}
