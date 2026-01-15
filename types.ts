
export interface Journey {
  id: string;
  title: string;
  location: string;
  duration: string;
  imageUrl: string;
  stops?: Stop[];
  moments?: Moment[];
  clonedAt?: number;
  clonedFrom?: string;
}

export interface Moment {
  id: string;
  coordinates: [number, number];
  imageUrl: string;
  caption: string;
}

export interface Stop {
  id: string;
  name: string;
  coordinates: [number, number]; // [longitude, latitude]
  imageUrl: string;
  description?: string;
}
