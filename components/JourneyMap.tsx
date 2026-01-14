
import React, { forwardRef, useMemo } from 'react';
import Map, { Source, Layer, Marker, MapRef } from 'react-map-gl/mapbox';
import { Stop } from '../types';
import type { FeatureCollection, LineString } from 'geojson';

interface JourneyMapProps {
    stops: Stop[];
    mapboxToken: string;
}

const JourneyMap = forwardRef<MapRef, JourneyMapProps>(({ stops, mapboxToken }, ref) => {
    const [routeGeoJSON, setRouteGeoJSON] = React.useState<FeatureCollection<LineString> | null>(null);
    const [isLoadingRoute, setIsLoadingRoute] = React.useState(false);

    React.useEffect(() => {
        const fetchDirections = async () => {
            if (stops.length < 2) return;
            setIsLoadingRoute(true);

            // Construct coordinates string "lng,lat;lng,lat..."
            const coordinates = stops.map(s => s.coordinates.join(',')).join(';');
            const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates}?geometries=geojson&access_token=${mapboxToken}`;

            try {
                const response = await fetch(url);
                const data = await response.json();

                if (data.routes && data.routes[0]) {
                    const route = data.routes[0].geometry;
                    setRouteGeoJSON({
                        type: 'FeatureCollection',
                        features: [{
                            type: 'Feature',
                            properties: {},
                            geometry: route
                        }]
                    });
                }
            } catch (error) {
                console.error("Error fetching directions:", error);
            } finally {
                setIsLoadingRoute(false);
            }
        };

        fetchDirections();
    }, [stops, mapboxToken]);

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
            {routeGeoJSON && (
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
                            'line-width': 4,
                            'line-blur': 0.5,
                            'line-opacity': 0.8,
                            'line-dasharray': [0, 1.5]
                        }}
                    />
                </Source>
            )}

            {stops.map((stop) => (
                <Marker
                    key={stop.id}
                    longitude={stop.coordinates[0]}
                    latitude={stop.coordinates[1]}
                    anchor="bottom"
                >
                    <div className={`w-4 h-4 bg-black rounded-full border-2 border-white shadow-md hover:scale-125 transition-transform cursor-pointer ${isLoadingRoute ? 'animate-pulse' : ''}`} />
                </Marker>
            ))}
        </Map>
    );
});

JourneyMap.displayName = 'JourneyMap';

export default JourneyMap;
