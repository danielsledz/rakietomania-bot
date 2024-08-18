import { MissionStatus } from 'src/types/missionStatus';

export const Statuses = [
  {
    externalAPIStatus: 'In Flight',
    myAPIStatus: MissionStatus.InFlight,
  },
  {
    externalAPIStatus: 'TBC',
    myAPIStatus: MissionStatus.ToBeConfirmed,
  },
  {
    externalAPIStatus: 'Go',
    myAPIStatus: MissionStatus.Confirmed,
  },
  {
    externalAPIStatus: 'Success',
    myAPIStatus: MissionStatus.Success,
  },
  {
    externalAPIStatus: 'Failure',
    myAPIStatus: MissionStatus.Failed,
  },
  {
    externalAPIStatus: 'Hold',
    myAPIStatus: MissionStatus.Hold,
  },
  {
    externalAPIStatus: 'Partial Failure',
    myAPIStatus: MissionStatus.PartialFailed,
  },
  {
    externalAPIStatus: 'Partial Success',
    myAPIStatus: MissionStatus.PartialSuccess,
  },
  {
    externalAPIStatus: 'TBD',
    myAPIStatus: MissionStatus.ToBeDetermined,
  },
];
