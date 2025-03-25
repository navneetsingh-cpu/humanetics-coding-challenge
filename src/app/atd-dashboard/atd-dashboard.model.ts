export interface Sensor {
  x: number;
  y: number;
  tooltip: string;
}

export interface LineCoordinates {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export enum STATUS {
  OK = 'G',
  BROKEN = 'R',
  UNSTABLE = 'Y',
  UNAVAILABLE = 'NA'
}
