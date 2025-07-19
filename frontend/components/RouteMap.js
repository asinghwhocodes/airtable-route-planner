import React, { useEffect, useRef, useState } from 'react';
import { Box, Text, Icon, Loader } from "@airtable/blocks/ui";

// Simple polyline decoder (fallback if polyline library fails)
const decodePolyline = (encoded) => {
    try {
        // Try to use polyline library if available
        if (typeof require !== 'undefined') {
            const polyline = require('polyline');
        return polyline.decode(encoded);
        }
        // Fallback: return empty array if polyline library not available
        console.warn('Polyline library not available, route line will not be displayed');
        return [];
    } catch (error) {
        console.error('Error decoding polyline:', error);
        return [];
    }
};

const RouteMap = ({ routeData, addresses }) => {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markersRef = useRef([]);
    const routeLineRef = useRef(null);
    const leafletLoadedRef = useRef(false);
    const mapInitializedRef = useRef(false);
    const [mapLoading, setMapLoading] = useState(false);
    const [mapError, setMapError] = useState(null);

    useEffect(() => {
        // Load Leaflet CSS and JS dynamically
        const loadLeaflet = async () => {
            if (leafletLoadedRef.current) return;

            setMapLoading(true);
            setMapError(null);

            try {
            // Load Leaflet CSS
            if (!document.querySelector('link[href*="leaflet"]')) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
                document.head.appendChild(link);
            }

            // Load Leaflet JS
            if (typeof L === 'undefined') {
                const script = document.createElement('script');
                script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
                
                await new Promise((resolve, reject) => {
                    script.onload = () => {
                        resolve();
                    };
                    script.onerror = (error) => {
                        console.error('RouteMap: Failed to load Leaflet JS:', error);
                        reject(error);
                    };
                    document.head.appendChild(script);
                });
            }

            leafletLoadedRef.current = true;
                setMapLoading(false);
            } catch (error) {
                console.error('RouteMap: Error loading Leaflet:', error);
                setMapError('Failed to load map library');
                setMapLoading(false);
            }
        };

        const initializeMap = async () => {
            if (!addresses || addresses.length === 0) {
                return;
            }

            try {
                await loadLeaflet();

                // Only create map container if it doesn't exist
                if (!mapInitializedRef.current) {
                    
                    // Clear the map container first
                    if (mapRef.current) {
                        mapRef.current.innerHTML = '';
                    }

                    // Create map container
                    const mapContainer = document.createElement('div');
                    mapContainer.style.width = '100%';
                    mapContainer.style.height = '400px';
                    mapContainer.style.borderRadius = '8px';
                    mapContainer.style.overflow = 'hidden';
                    mapRef.current.appendChild(mapContainer);

                    // Initialize Leaflet map
                    const map = L.map(mapContainer).setView([0, 0], 13);
                    mapInstanceRef.current = map;
                    mapInitializedRef.current = true;

                    // Add simple tile layer
                    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                        attribution: '© OpenStreetMap contributors'
                    }).addTo(map);
                }

                const map = mapInstanceRef.current;
                if (!map) {
                    console.error('RouteMap: Map instance not available');
                    return;
                }

                // Clear existing markers and route line
                markersRef.current.forEach(marker => {
                    if (map.hasLayer(marker)) {
                        map.removeLayer(marker);
                    }
                });
                markersRef.current = [];
                
                if (routeLineRef.current && map.hasLayer(routeLineRef.current)) {
                    map.removeLayer(routeLineRef.current);
                    routeLineRef.current = null;
                }



                // Add numbered markers for each address (showing original selection order)
                addresses.forEach((address, index) => {
                    // Use order from address, or fallback to index + 1
                    const orderNumber = address.order || (index + 1);
                    
                    // Create custom numbered marker showing original selection order
                    const markerHtml = `
                        <div style="
                            background: #4285f4;
                            color: white;
                            border-radius: 50%;
                            width: 24px;
                            height: 24px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-weight: bold;
                            font-size: 12px;
                            border: 2px solid white;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                        ">
                            ${orderNumber}
                        </div>
                    `;
                    
                    const customIcon = L.divIcon({
                        html: markerHtml,
                        className: 'custom-numbered-marker',
                        iconSize: [24, 24],
                        iconAnchor: [12, 12]
                    });
                    
                    const marker = L.marker([address.lat, address.lon], { icon: customIcon })
                        .addTo(map)
                        .bindPopup(`
                            <strong>Selection: ${orderNumber}</strong><br>
                            <strong>${address.originalAddress}</strong><br>
                            ${address.display_name}
                        `);
                    
                    markersRef.current.push(marker);
                });

                // Add route line if route data is available
                if (routeData && routeData.geometry) {
                    try {
                        // Decode the polyline geometry to get the actual road-following route
                        if (routeData.geometry) {
                            const coordinates = decodePolyline(routeData.geometry);
                            
                            if (coordinates.length > 0) {
                                // Create route line using the decoded polyline
                                const routeLine = L.polyline(coordinates, {
                                    color: '#4285f4', // Google Maps blue
                                    weight: 6, // Medium thickness
                                    opacity: 0.8, // Slightly transparent
                                    dashArray: '8, 8' // Subtle dashed line
                                }).addTo(map);
                                
                                routeLineRef.current = routeLine;
                            }
                        }
                    } catch (error) {
                        console.error('RouteMap: Error adding route line:', error);
                    }
                }

                // Fit map to show all markers and route
                let bounds = L.latLngBounds(addresses.map(addr => [addr.lat, addr.lon]));
                
                // If we have a route line, include its bounds too
                if (routeLineRef.current) {
                    const routeBounds = routeLineRef.current.getBounds();
                    bounds = bounds.extend(routeBounds);
                }
                
                map.fitBounds(bounds, { padding: [20, 20] });

                // Force a map refresh
                setTimeout(() => {
                    if (mapInstanceRef.current) {
                        mapInstanceRef.current.invalidateSize();
                    }
                }, 100);

            } catch (error) {
                console.error('RouteMap: Error initializing map:', error);
                setMapError('Failed to initialize map');
            }
        };

        initializeMap();

        // Cleanup function - only run when component unmounts
        return () => {
            // Only cleanup when component is actually unmounting
            if (mapInstanceRef.current && !mapInitializedRef.current) {
                markersRef.current.forEach(marker => {
                    if (mapInstanceRef.current.hasLayer(marker)) {
                        mapInstanceRef.current.removeLayer(marker);
                    }
                });
                markersRef.current = [];
                
                if (routeLineRef.current && mapInstanceRef.current.hasLayer(routeLineRef.current)) {
                    mapInstanceRef.current.removeLayer(routeLineRef.current);
                    routeLineRef.current = null;
                }
            }
        };
    }, [routeData, addresses]);

    // Reset map initialization when addresses become empty
    useEffect(() => {
        if (!addresses || addresses.length === 0) {
            mapInitializedRef.current = false;
        }
    }, [addresses]);

    if (!addresses || addresses.length === 0) {
        return null;
    }

    if (mapLoading) {
        return (
            <Box marginTop={3} padding={3} backgroundColor="lightGray1" borderRadius="8px" border="1px solid #e5e7eb">
                <Box display="flex" alignItems="center" gap={2} marginBottom={2}>
                    <Icon name="view" size={16} />
                    <Text fontSize="14px" fontWeight={600} textColor="dark">
                        Route Map
                    </Text>
                </Box>
                <Box display="flex" alignItems="center" justifyContent="center" padding={3}>
                    <Loader scale={0.8} />
                    <Text marginLeft={2} textColor="light">Loading map...</Text>
                </Box>
            </Box>
        );
    }

    if (mapError) {
        return (
            <Box marginTop={3} padding={3} backgroundColor="lightGray1" borderRadius="8px" border="1px solid #e5e7eb">
                <Box display="flex" alignItems="center" gap={2} marginBottom={2}>
                    <Icon name="view" size={16} />
                    <Text fontSize="14px" fontWeight={600} textColor="dark">
                        Route Map
                    </Text>
                </Box>
                <Box display="flex" alignItems="center" gap={2} padding={2} backgroundColor="lightGray2" borderRadius="6px" border="1px solid #e5e7eb">
                    <Icon name="warning" size={16} />
                    <Text fontSize="14px" textColor="dark">{mapError}</Text>
                </Box>
            </Box>
        );
    }

    return (
        <Box marginTop={3} padding={3} backgroundColor="lightGray1" borderRadius="8px" border="1px solid #e5e7eb">
            <Box display="flex" alignItems="center" gap={2} marginBottom={2}>
                <Icon name="view" size={16} />
                <Text fontSize="14px" fontWeight={600} textColor="dark">
                    Route Map
                </Text>
            </Box>
            <Box 
                ref={mapRef}
                width="100%"
                height="400px"
                borderRadius="8px"
                overflow="hidden"
                border="1px solid #e5e7eb"
            />
        </Box>
    );
};

export default RouteMap; 