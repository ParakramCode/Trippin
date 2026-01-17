export interface Author {
  name: string;
  avatar: string;
  bio?: string;
}

export interface Journey {
  id: string;
  title: string;
  location: string;
  duration: string;
  imageUrl: string;
  author?: Author;
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
  author?: Author;
}

export interface Stop {
  id: string;
  name: string;
  coordinates: [number, number]; // [longitude, latitude]
  imageUrl: string;
  images?: string[]; // Array of images for the gallery/postcard view
  description?: string;
  author?: Author;
  note?: string; // User-added note for this stop
}
