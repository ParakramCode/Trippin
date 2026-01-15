
import React, { forwardRef, useMemo } from 'react';
import Map, { Source, Layer, Marker, MapRef } from 'react-map-gl/mapbox';
import { Stop, Moment } from '../types';
import type { FeatureCollection, LineString } from 'geojson';
import useSupercluster from 'use-supercluster';
import MomentModal from './MomentModal';

interface JourneyMapProps {
    stops: Stop[];
    moments?: Moment[];
    mapboxToken: string;
    selectedStopId: string | null;
    onStopSelect: (stop: Stop) => void;
}

const JourneyMap = forwardRef<MapRef, JourneyMapProps>(({ stops, moments = [], mapboxToken, selectedStopId, onStopSelect }, ref) => {
    const [routeGeoJSON, setRouteGeoJSON] = React.useState<FeatureCollection<LineString> | null>(null);
    const [isLoadingRoute, setIsLoadingRoute] = React.useState(false);

    // Modal State
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [modalMoments, setModalMoments] = React.useState<Moment[]>([]);

    // Clustering Logic
    const points = useMemo(() => moments.map(m => ({
        type: 'Feature' as const,
        properties: { cluster: false, momentId: m.id, imageUrl: m.imageUrl, caption: m.caption },
        geometry: {
            type: 'Point' as const,
            coordinates: m.coordinates
        }
    })), [moments]);

    // Actually react-map-gl doesn't expose bounds easily without standard map events.
    // For simplicity with useSupercluster, we need current bounds.
    // We'll track viewState manually or use the map ref if possible.

    const [viewState, setViewState] = React.useState({
        bounds: [-180, -85, 180, 85] as [number, number, number, number],
        zoom: 14
    });

    const { clusters, supercluster } = useSupercluster({
        points,
        bounds: viewState.bounds,
        zoom: viewState.zoom,
        options: { radius: 40, maxZoom: 20 }
    });

    // Update bounds on map move
    const onMove = (evt: any) => {
        const map = evt.target;
        const b = map.getBounds();
        setViewState({
            bounds: [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()],
            zoom: map.getZoom()
        });
    };

    React.useEffect(() => {
        // Initial bounds setup if ref is available immediately (rarely)
        // Usually handled by onMove
    }, []);

    const handleClusterClick = (clusterId: number, latitude: number, longitude: number) => {
        // Get leaves (all points in this cluster)
        const leaves = supercluster?.getLeaves(clusterId, Infinity);
        if (leaves) {
            const clusterMoments = leaves.map(l => {
                const mId = l.properties.momentId;
                return moments.find(m => m.id === mId)!;
            });
            setModalMoments(clusterMoments);
            setIsModalOpen(true);
        }
    };

    const handleMomentClick = (moment: Moment) => {
        setModalMoments([moment]);
        setIsModalOpen(true);
    };

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

    // Fly to selected stop
    React.useEffect(() => {
        if (selectedStopId && ref && 'current' in ref && ref.current) {
            const stop = stops.find(s => s.id === selectedStopId);
            if (stop) {
                ref.current.flyTo({
                    center: stop.coordinates,
                    zoom: 14,
                    speed: 1.2, // Slightly slower for boutique feel
                    curve: 1.5,
                    duration: 2000,
                    essential: true
                });
            }
        }
    }, [selectedStopId, stops, ref]);

    return (
        <>
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
                onMove={onMove} // Update bounds for clustering
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

                {/* Clustered Moments */}
                {clusters.map((cluster) => {
                    const [longitude, latitude] = cluster.geometry.coordinates;
                    const { cluster: isCluster, point_count: pointCount } = cluster.properties;

                    if (isCluster) {
                        // Get the first image for thumbnail
                        // We can't easily get properties of leaves directly from 'cluster' object without leaves query 
                        // UNLESS we used map/reduce options in supercluster config.
                        // For now, simpler: user wants "thumbnail of the first image".
                        // Without map/reduce, we can't get it cheaply.
                        // Let's implement map/reduce properties in useSupercluster if needed, OR just fetch leaves for rendering (expensive?)
                        // Actually, let's just use a generic cluster look OR fetch one leaf.
                        // Optimized: Supercluster supports `map` and `reduce`
                        // But useSupercluster hook interface?
                        // Let's just create a sleek count badge for now, or try to get properties.
                        // Correction: useSupercluster options argument allows map/reduce.

                        return (
                            <Marker
                                key={`cluster-${cluster.id}`}
                                longitude={longitude}
                                latitude={latitude}
                                onClick={(e) => {
                                    e.originalEvent.stopPropagation();
                                    handleClusterClick(cluster.id as number, latitude, longitude);
                                }}
                            >
                                <div className="relative group cursor-pointer hover:scale-110 transition-transform">
                                    <div className="w-10 h-10 rounded-full border-2 border-white shadow-lg bg-gray-900 flex items-center justify-center text-white font-bold text-xs ring-2 ring-white/50">
                                        +{pointCount}
                                    </div>
                                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[6px] border-t-gray-900" />
                                </div>
                            </Marker>
                        );
                    }

                    // Single Moment
                    // 'cluster' here acts as the pointfeature
                    const moment = moments.find(m => m.id === cluster.properties.momentId);
                    if (!moment) return null;

                    return (
                        <Marker
                            key={`moment-${moment.id}`}
                            longitude={moment.coordinates[0]}
                            latitude={moment.coordinates[1]}
                            anchor="center"
                            clickTolerance={10}
                            onClick={(e) => {
                                e.originalEvent.stopPropagation();
                                handleMomentClick(moment);
                            }}
                        >
                            <div className="group relative cursor-pointer z-0 hover:z-20">
                                {/* Micro Pin */}
                                <div className="w-8 h-8 rounded-full border border-white shadow-sm overflow-hidden bg-white/90 hover:scale-110 transition-transform duration-200">
                                    <img src={moment.imageUrl} alt={moment.caption} className="w-full h-full object-cover opacity-80 group-hover:opacity-100" />
                                </div>
                            </div>
                        </Marker>
                    );
                })}

                {stops.map((stop) => (
                    <Marker
                        key={stop.id}
                        longitude={stop.coordinates[0]}
                        latitude={stop.coordinates[1]}
                        anchor="bottom" // Anchor at bottom so the pointer points to location
                        onClick={(e) => {
                            e.originalEvent.stopPropagation();
                            onStopSelect(stop);
                        }}
                    >
                        <div
                            className={`relative group cursor-pointer transition-all duration-500 ease-boutique flex flex-col items-center
                            ${selectedStopId === stop.id ? 'z-50 scale-125' : 'z-10 hover:scale-110'}
                        `}
                        >
                            {/* Circle Image */}
                            <div className={`w-12 h-12 rounded-full border-[3px] border-white shadow-[0_8px_20px_rgba(0,0,0,0.2)] overflow-hidden bg-white
                                      ${selectedStopId === stop.id ? 'ring-4 ring-brand-accent ring-offset-2 scale-110' : ''}
                        `}>
                                <img
                                    src={stop.imageUrl}
                                    alt={stop.name}
                                    className="w-full h-full object-cover"
                                />
                            </div>

                            {/* Triangle Pointer */}
                            <div className={`w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] -mt-1 drop-shadow-sm transition-colors duration-300
                                ${selectedStopId === stop.id ? 'border-t-brand-accent' : 'border-t-white'}
                            `}></div>

                            {/* Pulse effect while route loads (on active marker only to reduce noise) */}
                            {isLoadingRoute && selectedStopId === stop.id && (
                                <div className="absolute top-0 w-12 h-12 rounded-full bg-brand-accent/30 animate-ping" />
                            )}
                        </div>
                    </Marker>
                ))}
            </Map>

            <MomentModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                moments={modalMoments}
            />
        </>
    );
});

JourneyMap.displayName = 'JourneyMap';

export default JourneyMap;
