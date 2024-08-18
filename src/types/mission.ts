import { Booster } from './booster';
import { Image } from './image';
import { MissionStatus } from './missionStatus';
import { Payload } from './payload';
import { Rocket } from './rocket';

export interface Mission {
  name: string;
  apiMissionID: string;
  date: string;
  status: MissionStatus;
  description?: string;
  specifications?: string;
  windowStart?: string;
  windowEnd?: string;
  probability?: number;
  livestream?: string;
  changeLogs?: string[];
  patch?: Image;
  rocket: Rocket;
  _id: string;
  boosters: Booster[];
  payload: Payload[];
  archived: boolean;
  environment: 'development' | 'production';
  dateUpdateMethod: 'auto' | 'manual';
  //only for relations
  _ref: string;
}
