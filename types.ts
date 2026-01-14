
export interface Journey {
  id: string;
  title: string;
  location: string;
  duration: string;
  imageUrl: string;
  stops?: Stop[];
}

export interface Stop {
  id: string;
  name: string;
  coordinates: [number, number]; // [longitude, latitude]
  imageUrl: string;
  description?: string;
}
