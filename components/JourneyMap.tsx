
import React, { forwardRef, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Map, { Source, Layer, Marker, MapRef } from 'react-map-gl/mapbox';
import { Stop, Moment } from '../types';
import { useJourneys } from '../context/JourneyContext';
import type { FeatureCollection, LineString } from 'geojson';
import useSupercluster from 'use-supercluster';
import MomentModal from './MomentModal';
import UserMarker from './UserMarker';
import { checkProximity, getDistanceFromLatLonInKm } from '../utils/geometry';

interface JourneyMapProps {
    stops: Stop[];
    moments?: Moment[];
    mapboxToken: string;
    selectedStopId: string | null;
    onStopSelect: (stop: Stop) => void;
}

const JourneyMap = forwardRef<MapRef, JourneyMapProps>(({ stops, moments = [], mapboxToken, selectedStopId, onStopSelect }, ref) => {
    const { userLocation, userHeading, isFollowing, setIsFollowing, visitedStopIds, markStopAsVisited, activeJourney } = useJourneys();
    const [routeGeoJSON, setRouteGeoJSON] = React.useState<FeatureCollection<LineString> | null>(null);
    const [isLoadingRoute, setIsLoadingRoute] = React.useState(false);

    // Performance refs
    const lastCenterRef = useRef<[number, number] | null>(null);
    const lastStopIndexRef = useRef<number>(-1);

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

    const onMove = (evt: any) => {
        const map = evt.target;
        const b = map.getBounds();
        setViewState({
            bounds: [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()],
            zoom: map.getZoom()
        });
    };

    const handleClusterClick = (clusterId: number, latitude: number, longitude: number) => {
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

    // Open Postcard Logic (Arrival)
    const openPostcard = (stopIndex: number) => {
        const stop = stops[stopIndex];
        const nearbyMoments = moments.filter(m => {
            const dist = getDistanceFromLatLonInKm(m.coordinates[1], m.coordinates[0], stop.coordinates[1], stop.coordinates[0]);
            return dist < 1.0;
        });

        if (nearbyMoments.length > 0) {
            setModalMoments(nearbyMoments);
            setIsModalOpen(true);
        } else if (stop.imageUrl) {
            const stopMoment: Moment = {
                id: `stop-${stop.id}`,
                coordinates: stop.coordinates,
                imageUrl: stop.imageUrl,
                caption: `Arrived: ${stop.name}`
            };
            setModalMoments([stopMoment]);
            setIsModalOpen(true);
        }
    };

    // Recenter on User (Performance Guarded)
    const recenterOnUser = React.useCallback(() => {
        if (userLocation && ref && 'current' in ref && ref.current) {
            const [lng, lat] = userLocation;

            let shouldMove = true;
            if (lastCenterRef.current) {
                const dist = getDistanceFromLatLonInKm(lat, lng, lastCenterRef.current[1], lastCenterRef.current[0]);
                if (dist < 0.005) shouldMove = false;
            }

            if (shouldMove) {
                ref.current.easeTo({
                    center: userLocation,
                    zoom: 16,
                    pitch: 45,
                    bearing: userHeading || 0,
                    duration: 1500
                });
                lastCenterRef.current = userLocation;
            }
        }
    }, [userLocation, userHeading, ref]);

    // Reset Camera when Navigation Ends
    React.useEffect(() => {
        if (!isFollowing && ref && 'current' in ref && ref.current) {
            ref.current.easeTo({
                pitch: 0,
                bearing: 0,
                duration: 1000
            });
        }
    }, [isFollowing, ref]);

    // Active Navigation Loop
    useEffect(() => {
        if (!userLocation) return;
        const [lng, lat] = userLocation;

        // 1. Recenter if following
        if (isFollowing) {
            recenterOnUser();
        }

        // 2. Proximity Check (Arrival)
        const stopCoords = stops.map(s => s.coordinates);
        const closestIndex = checkProximity(lat, lng, stopCoords as [number, number][]);

        if (closestIndex !== -1) {
            const stop = stops[closestIndex];
            const dist = getDistanceFromLatLonInKm(lat, lng, stop.coordinates[1], stop.coordinates[0]);

            // Threshold: 50m (0.05km)
            if (dist < 0.05) {
                if (lastStopIndexRef.current !== closestIndex) {
                    lastStopIndexRef.current = closestIndex;

                    // "Arrival" Experience: Only for unvisited stops
                    if (!visitedStopIds.includes(stop.id)) {
                        markStopAsVisited(stop.id);

                        // Haptic Feedback
                        if (typeof navigator !== 'undefined' && navigator.vibrate) {
                            navigator.vibrate(200);
                        }

                        openPostcard(closestIndex);
                    }

                    onStopSelect(stop); // This is programmatic selection
                }
            }
        }

    }, [userLocation, isFollowing, recenterOnUser, stops, onStopSelect, visitedStopIds, markStopAsVisited]);

    // Fetch Directions (Existing)
    React.useEffect(() => {
        const fetchDirections = async () => {
            if (stops.length < 2) return;
            setIsLoadingRoute(true);
            const coordinates = stops.map(s => s.coordinates.join(',')).join(';');
            const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates}?geometries=geojson&overview=full&access_token=${mapboxToken}`;

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

    // Fly to selected stop (Manual)
    React.useEffect(() => {
        if (selectedStopId && ref && 'current' in ref && ref.current) {
            // Only fly to stop if NOT following
            if (!isFollowing) {
                const stop = stops.find(s => s.id === selectedStopId);
                if (stop) {
                    ref.current.flyTo({
                        center: stop.coordinates,
                        zoom: 14,
                        pitch: 0,
                        bearing: 0,
                        speed: 0.8,
                        curve: 1.5,
                        duration: 3000,
                        essential: true
                    });
                }
            }
        }
    }, [selectedStopId, stops, ref, isFollowing]);

    return (
        <div className="relative w-full h-full">
            <Map
                ref={ref}
                initialViewState={{
                    longitude: -122.4,
                    latitude: 37.8,
                    zoom: 14,
                }}
                style={{ width: '100%', height: '100%' }}
                mapStyle="mapbox://styles/mapbox/light-v11"
                mapboxAccessToken={mapboxToken}
                padding={isFollowing ? { left: 340, top: 20, bottom: 20, right: 20 } : { left: 0, top: 0, bottom: 0, right: 0 }}
                onMove={onMove}
            >
                {routeGeoJSON && (
                    <Source id="route-source" type="geojson" data={routeGeoJSON}>
                        <Layer
                            id="route-line"
                            type="line"
                            layout={{ 'line-join': 'round', 'line-cap': 'round' }}
                            paint={{ 'line-color': '#2D3748', 'line-width': 3, 'line-opacity': 0.8 }}
                        />
                    </Source>
                )}

                {userLocation && (
                    <UserMarker
                        longitude={userLocation[0]}
                        latitude={userLocation[1]}
                        heading={userHeading}
                    />
                )}

                {clusters.map((cluster) => {
                    const [longitude, latitude] = cluster.geometry.coordinates;
                    const { cluster: isCluster, point_count: pointCount } = cluster.properties;

                    if (isCluster) {
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
                                </div>
                            </Marker>
                        );
                    }
                    const moment = moments.find(m => m.id === cluster.properties.momentId);
                    if (!moment) return null;
                    return (
                        <Marker
                            key={`moment-${moment.id}`}
                            longitude={moment.coordinates[0]}
                            latitude={moment.coordinates[1]}
                            anchor="center"
                            onClick={(e) => {
                                e.originalEvent.stopPropagation();
                                handleMomentClick(moment);
                            }}
                        >
                            <div className="group relative cursor-pointer z-0 hover:z-20">
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
                        anchor="bottom"
                        onClick={(e) => {
                            e.originalEvent.stopPropagation();
                            setIsFollowing(false); // Manual interaction stops following
                            onStopSelect(stop);
                        }}
                    >
                        <motion.div
                            initial={false}
                            animate={{ scale: selectedStopId === stop.id ? 1.15 : 0.8 }}
                            transition={{ type: "spring", stiffness: 400, damping: 25 }}
                            className={`relative cursor-pointer flex flex-col items-center ${selectedStopId === stop.id ? 'z-50' : 'z-10'}`}
                        >
                            {selectedStopId === stop.id && <div className="absolute inset-0 -m-3 rounded-full border-2 border-slate-800/30 animate-ping" />}
                            <div className={`w-12 h-12 rounded-full border-[3px] border-slate-50 shadow-[0_10px_15px_rgba(0,0,0,0.2)] overflow-hidden bg-white ${selectedStopId === stop.id ? 'ring-[3px] ring-slate-800 ring-offset-2' : ''}`}>
                                <img src={stop.imageUrl} alt={stop.name} className="w-full h-full object-cover" />
                            </div>
                            <div className={`w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] -mt-[2px] drop-shadow-sm transition-colors duration-300 ${selectedStopId === stop.id ? 'border-t-slate-800' : 'border-t-slate-50'}`}></div>
                        </motion.div>
                    </Marker>
                ))}
            </Map>

            {/* Navigation UI Overlay: Compass Button */}
            <div className="absolute bottom-8 right-8 z-20">
                <button
                    onClick={() => setIsFollowing(!isFollowing)}
                    className={`p-3 rounded-full backdrop-blur-md border border-white/40 shadow-lg transition-all duration-300
                        ${isFollowing
                            ? 'bg-indigo-500/80 text-white animate-pulse ring-4 ring-indigo-500/30'
                            : 'bg-white/80 text-slate-700 hover:bg-white'}
                    `}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-6 h-6 transition-transform duration-500 ${isFollowing ? 'rotate-0' : '-rotate-45'}`}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11.25l-3-3m0 0l-3 3m3-3v7.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </button>
            </div>

            <MomentModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                moments={modalMoments}
                author={activeJourney?.author}
            />
        </div>
    );
});

JourneyMap.displayName = 'JourneyMap';

export default JourneyMap;
