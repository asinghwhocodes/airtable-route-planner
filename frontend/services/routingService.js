// Geocoding service using Nominatim (OpenStreetMap's geocoding service)
export const geocodeAddress = async (address) => {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
        );
        const data = await response.json();
        
        if (data && data.length > 0) {
            return {
                lat: parseFloat(data[0].lat),
                lon: parseFloat(data[0].lon),
                display_name: data[0].display_name
            };
        }
        return null;
    } catch (error) {
        console.error('Geocoding error:', error);
        return null;
    }
};

// Route calculation using OSRM
export const calculateRoute = async (coordinates, profile = 'driving') => {
    try {
        // Format coordinates for OSRM API
        const coordsString = coordinates.map(coord => `${coord.lon},${coord.lat}`).join(';');
        
        const url = `https://router.project-osrm.org/route/v1/${profile}/${coordsString}?overview=full&steps=true&annotations=true`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.code === 'Ok') {
            return {
                distance: data.routes[0].distance,
                duration: data.routes[0].duration,
                geometry: data.routes[0].geometry,
                legs: data.routes[0].legs,
                waypoints: data.waypoints
            };
        } else {
            throw new Error(`Route calculation failed: ${data.message || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('Route calculation error:', error);
        throw error;
    }
};

// Batch geocoding for multiple addresses
export const geocodeAddresses = async (addresses) => {
    const geocodedAddresses = [];
    
    for (let i = 0; i < addresses.length; i++) {
        const address = addresses[i];
        const geocoded = await geocodeAddress(address);
        
        if (geocoded) {
            geocodedAddresses.push({
                ...geocoded,
                originalAddress: address,
                order: i + 1
            });
        } else {
            throw new Error(`Could not geocode address: ${address}`);
        }
        
        // Add delay to respect Nominatim's usage policy
        if (i < addresses.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    
    return geocodedAddresses;
}; 