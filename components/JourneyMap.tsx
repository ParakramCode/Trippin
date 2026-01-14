
import React, { forwardRef, useMemo } from 'react';
import Map, { Source, Layer, Marker, MapRef } from 'react-map-gl/mapbox';
import { Stop } from '../types';
import type { FeatureCollection, LineString } from 'geojson';

interface JourneyMapProps {
    stops: Stop[];
    mapboxToken: string;
}

const JourneyMap = forwardRef<MapRef, JourneyMapProps>(({ stops, mapboxToken }, ref) => {
    const routeGeoJSON: FeatureCollection<LineString> = useMemo(() => {
        return {
            type: 'FeatureCollection',
            features: [
                {
                    type: 'Feature',
                    properties: {},
                    geometry: {
                        type: 'LineString',
                        coordinates: stops.map((stop) => stop.coordinates),
                    },
                },
            ],
        };
    }, [stops]);

    return (
        <Map
            ref={ref}
            initialViewState={{
                longitude: -122.4,
                latitude: 37.8,
                zoom: 14,
            }}
            style={{ width: '100%', height: '100%' }}
            mapStyle="mapbox://styles/mapbox/streets-v9"
            mapboxAccessToken={mapboxToken}
        >
            <Source id="route-source" type="geojson" data={routeGeoJSON}>
                <Layer
                    id="route-line"
                    type="line"
                    layout={{
                        'line-join': 'round',
                        'line-cap': 'round',
                    }}
                    paint={{
                        'line-color': '#000000',
                        'line-width': 2,
                        'line-dasharray': [2, 2],
                        'line-opacity': 0.7
                    }}
                />
            </Source>

            {stops.map((stop) => (
                <Marker
                    key={stop.id}
                    longitude={stop.coordinates[0]}
                    latitude={stop.coordinates[1]}
                    anchor="bottom"
                >
                    <div className="w-4 h-4 bg-black rounded-full border-2 border-white shadow-md hover:scale-125 transition-transform cursor-pointer" />
                </Marker>
            ))}
        </Map>
    );
});

JourneyMap.displayName = 'JourneyMap';

export default JourneyMap;
