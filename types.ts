
export type EclipseCategory = '일식' | '월식';
export type EclipseType = '개기';

export interface EclipseEvent {
  id: string;
  originalDateStr: string;
  year: number;
  month: number;
  day: number;
  timeStr: string;
  kind: EclipseType;
  category: EclipseCategory;
  jdn: number; // Julian Day Number
}

export interface SymmetryPair {
  left: EclipseEvent;
  right: EclipseEvent;
  distanceLeft: number;
  distanceRight: number;
  averageDistance: number;
  diff: number;
}

export interface HexagonalPattern {
  center: EclipseEvent;
  pairs: SymmetryPair[];
  score: number; // For ranking patterns that are "most symmetric"
}

export interface FilterSettings {
  startDate: number; // JDN
  endDate: number; // JDN
  tolerance: number; // days (default 1)
  targetDistances: number[]; // [1211, 856, 694, 517]
}
