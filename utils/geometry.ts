
// Basic Haversine formula to calculate distance between two coordinates in km
export const getDistanceFromLatLonInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
}

const deg2rad = (deg: number) => {
    return deg * (Math.PI / 180)
}

// Check proximity to finding the closest stop
// Returns index of closest stop
export const checkProximity = (userLat: number, userLng: number, stopsCoords: [number, number][]): number => {
    let closestIndex = -1;
    let minDistance = Infinity;

    stopsCoords.forEach((coord, index) => {
        const [lon, lat] = coord;
        const distance = getDistanceFromLatLonInKm(userLat, userLng, lat, lon);
        if (distance < minDistance) {
            minDistance = distance;
            closestIndex = index;
        }
    });

    return closestIndex;
};
