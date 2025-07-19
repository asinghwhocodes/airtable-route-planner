import { initializeBlock, useCursor, useBase, useRecords, useGlobalConfig, useSettingsButton, useWatchable, Box, Text, Button, Select, Icon, Loader, useViewport, expandRecord, expandRecordList, useSession, FieldPicker, TablePicker, RecordPicker } from "@airtable/blocks/ui";
import React, { useState, useEffect } from "react";
import "./style.css";
import { geocodeAddresses, calculateRoute } from "./services/routingService.js";
import RouteMap from "./components/RouteMap.js";
import SaveModal from "./components/SaveModal.js";
import SettingsModal from "./components/SettingsModal.js";
import Tooltip from "./components/Tooltip.js";

// Add Font Awesome to the document head
if (!document.querySelector('link[href*="fontawesome"]')) {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css";
  document.head.appendChild(link);
}

function RoutePlannerAppAirtable() {
  const [selectedLocationField, setSelectedLocationField] = useState(null);
  const [selectedAddresses, setSelectedAddresses] = useState([]);
  const [routeType, setRouteType] = useState("driving");
  const [routeResult, setRouteResult] = useState(null);
  const [geocodedAddresses, setGeocodedAddresses] = useState([]);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [error, setError] = useState(null);
  const [showAddressSection, setShowAddressSection] = useState(true);
  const [showGoogleMapsButton, setShowGoogleMapsButton] = useState(false);
  const [optimizedRouteOrder, setOptimizedRouteOrder] = useState(null);
  const [geocodingErrors, setGeocodingErrors] = useState({});
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isLoadingSavedField, setIsLoadingSavedField] = useState(false);
  const [canUpdateGlobalConfig, setCanUpdateGlobalConfig] = useState(false);
  const [canUpdateRecords, setCanUpdateRecords] = useState(false);
  const [permissionError, setPermissionError] = useState(null);

  // Airtable hooks
  const cursor = useCursor();
  const base = useBase();
  const globalConfig = useGlobalConfig();
  const viewport = useViewport();
  const session = useSession();

  // Settings button
  useSettingsButton({
    label: canUpdateGlobalConfig ? "Route Settings" : "Route Settings (Read-only)",
    onClick: () => {
      setShowSettingsModal(true);
    },
  });

  // Watch for global config changes
  useWatchable(globalConfig, ["*"]);

  // Check permissions on component mount and when table changes
  useEffect(() => {
    const checkPermissions = async () => {
      try {
        setPermissionError(null);
        
        // Test GlobalConfig permissions by trying to read a test value
        try {
          globalConfig.get('_permission_test');
          setCanUpdateGlobalConfig(true);
        } catch (error) {
          console.log('GlobalConfig permission test failed:', error);
          setCanUpdateGlobalConfig(false);
        }
        
        // For record permissions, we'll check when actually trying to save
        setCanUpdateRecords(true); // Assume true until proven otherwise
      } catch (error) {
        console.error('Error checking permissions:', error);
        setPermissionError(`Permission check failed: ${error.message}`);
        setCanUpdateGlobalConfig(false);
        setCanUpdateRecords(false);
      }
    };

    checkPermissions();
  }, [table, globalConfig]);

  // Watch for cursor changes (table switching) and reset field selection
  useWatchable(cursor, ["activeTableId"], () => {
    if (cursor.activeTableId) {
      // Get the current table from the updated cursor
      const currentTable = base.getTableById(cursor.activeTableId);
      if (currentTable) {
        // Clear current selection first
        setSelectedLocationField(null);
        setSelectedAddresses([]);
        setRouteResult(null);
        setGeocodedAddresses([]);
        setError(null);
        setShowAddressSection(true);
        setShowGoogleMapsButton(false);
        setOptimizedRouteOrder(null);
        setGeocodingErrors({});
        
        // Load saved field for the new table
        loadSavedLocationFieldForTable(currentTable);
      }
    }
  });

  // Load saved location field from global config for a specific table
  const loadSavedLocationFieldForTable = async (targetTable) => {
    try {
      setIsLoadingSavedField(true);
      const configKey = `table_${targetTable.id}_field`;
      const savedFieldId = globalConfig.get(configKey);
      
      // Load if we have saved config for this table
      if (savedFieldId && targetTable) {
        try {
          const savedField = targetTable.getFieldById(savedFieldId);
          if (savedField) {
            setSelectedLocationField(savedField);
          } else {
            // Field doesn't exist in this table, clear the config
            if (canUpdateGlobalConfig) {
              await globalConfig.setAsync(configKey, null);
            } else {
              console.warn('Cannot clear invalid field config - insufficient permissions');
            }
          }
        } catch (fieldError) {
          // Field ID is invalid, clear the config
          if (canUpdateGlobalConfig) {
            await globalConfig.setAsync(configKey, null);
          } else {
            console.warn('Cannot clear invalid field config - insufficient permissions');
          }
        }
      }
    } catch (error) {
      console.error('Error loading saved location field:', error);
    } finally {
      setIsLoadingSavedField(false);
    }
  };

  // Load saved location field from global config for the current table
  const loadSavedLocationField = async () => {
    if (table) {
      await loadSavedLocationFieldForTable(table);
    }
  };

  // Load saved location field on initial load
  useEffect(() => {
    if (table && !selectedLocationField) {
      loadSavedLocationField();
    }
  }, [table, globalConfig, selectedLocationField]);

  // Save location field selection to global config for the current table
  const saveLocationFieldToConfig = async (field) => {
    try {
      const configKey = `table_${table.id}_field`;
      await globalConfig.setAsync(configKey, field.id);
    } catch (error) {
      console.error('Error saving location field to config:', error);
      // Check if this is a permission error
      if (error.message && error.message.includes('permission')) {
        setCanUpdateGlobalConfig(false);
        setError(`Cannot save field selection: Insufficient permissions`);
      } else {
        setError(`Error saving field selection: ${error.message}`);
      }
    }
  };

  // Handle loading state when cursor is null
  if (!cursor) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" padding={3}>
        <Loader scale={0.8} />
        <Text marginTop={2} textColor="light">
          Loading extension...
        </Text>
      </Box>
    );
  }

  // Get the current table from the cursor
  const table = cursor.activeTableId ? base.getTableById(cursor.activeTableId) : null;

  // Immediate validation check - if selectedLocationField doesn't exist in current table, clear it
  if (selectedLocationField && table) {
    try {
      const fieldExists = table.getFieldById(selectedLocationField.id);
      if (!fieldExists) {
        setSelectedLocationField(null);
        setSelectedAddresses([]);
        setRouteResult(null);
        setGeocodedAddresses([]);
        setError(null);
        setShowAddressSection(true);
        setShowGoogleMapsButton(false);
        setOptimizedRouteOrder(null);
        setGeocodingErrors({});
        // Return early to prevent rendering with invalid field
        return (
          <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" padding={3}>
            <Loader scale={0.8} />
            <Text marginTop={2} textColor="light">
              Updating field selection...
            </Text>
          </Box>
        );
      }
    } catch (error) {
      setSelectedLocationField(null);
      setSelectedAddresses([]);
      setRouteResult(null);
      setGeocodedAddresses([]);
      setError(null);
      setShowAddressSection(true);
      setShowGoogleMapsButton(false);
      setOptimizedRouteOrder(null);
      setGeocodingErrors({});
      // Return early to prevent rendering with invalid field
      return (
        <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" padding={3}>
          <Loader scale={0.8} />
          <Text marginTop={2} textColor="light">
            Updating field selection...
          </Text>
          </Box>
      );
    }
  }

  if (!table) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" padding={3}>
        <Icon name="warning" size={24} />
        <Text marginTop={2} textColor="light" fontWeight={500}>
          No Table Selected
        </Text>
        <Text marginTop={1} textColor="light" fontSize="14px">
          Please select a table to view its records.
        </Text>
      </Box>
    );
  }

  // Get the current view and records with filters applied
  const currentView = cursor.activeViewId ? table.getViewById(cursor.activeViewId) : null;
  const records = currentView ? useRecords(currentView) : useRecords(table);

  if (!records) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" padding={3}>
        <Loader scale={0.8} />
        <Text marginTop={2} textColor="light">
          Loading records...
        </Text>
      </Box>
    );
  }

  // If no location field is selected, show the column selection
  if (!selectedLocationField) {
    return (
      <Box padding={3}>
        <Box marginBottom={3} paddingBottom={2} borderBottom="1px solid #e1e5e9">
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Text fontSize="20px" fontWeight={600} textColor="dark">
            <Icon name="link" size={20} /> Route Planner
            </Text>
            <Box display="flex" gap={1}>
              <Box padding="4px 8px" backgroundColor="blue" borderRadius="12px" border="1px solid #bfdbfe">
                <Text fontSize="10px" fontWeight={500} textColor="white">
                  {table.name}
                </Text>
              </Box>
              <Box padding="4px 8px" backgroundColor="lightGray1" borderRadius="12px" border="1px solid #e5e7eb">
                <Text fontSize="10px" fontWeight={500} textColor="dark">
                  {records.length} records
                </Text>
              </Box>
              {currentView && currentView.activeFilters && currentView.activeFilters.length > 0 && (
                <Box padding="4px 8px" backgroundColor="orange" borderRadius="12px" border="1px solid #fed7aa">
                  <Text fontSize="10px" fontWeight={500} textColor="white">
                    Filtered
                  </Text>
                </Box>
              )}
            </Box>
          </Box>
        </Box>

        <Box marginBottom={3}>
          <Text fontSize="14px" fontWeight={600} textColor="dark" marginBottom={2}>
            <Icon name="mapPin" size={16} /> Select Location Column
          </Text>
          {isLoadingSavedField ? (
            <Box display="flex" alignItems="center" gap={2} padding={2} backgroundColor="lightGray1" borderRadius="6px" border="1px solid #e5e7eb">
              <Loader scale={0.6} />
              <Text fontSize="14px" textColor="light">Loading saved field selection...</Text>
            </Box>
          ) : (
            <Box>
                          <FieldPicker 
              table={table} 
              field={selectedLocationField} 
              onChange={(field) => {
                setSelectedLocationField(field);
                if (field) {
                  saveLocationFieldToConfig(field);
                }
              }} 
              placeholder="Choose a field containing addresses..." 
              shouldAllowPickingNone={false}
            />
              {!canUpdateGlobalConfig && (
                <Text fontSize="11px" textColor="light" marginTop={1}>
                  <Icon name="info" size={12} /> Field selection cannot be saved with read-only permissions
                </Text>
              )}
            </Box>
          )}
        </Box>


      </Box>
    );
  }

  // Find a name-like field (prefer fields with "name" in the title)
  const nameField = table.fields && table.fields.length > 0 ? 
    table.fields.find((field) => field.name.toLowerCase().includes("name") || field.name.toLowerCase().includes("title") || field.name.toLowerCase().includes("label")) || table.fields[0] : 
    null; // fallback to first field

  // Get transport mode icon
  const getTransportIcon = (mode) => {
    switch (mode) {
      case "driving":
        return "fas fa-car";
      case "cycling":
        return "fas fa-bicycle";
      case "walking":
        return "fas fa-walking";
      default:
        return "fas fa-car";
    }
  };

  // Handle address selection with immediate geocoding
  const handleAddressToggle = async (recordId, address) => {
    setSelectedAddresses((prev) => {
      const existingIndex = prev.findIndex((item) => item.recordId === recordId);
      if (existingIndex >= 0) {
        // Remove if already selected and reorder remaining items
        const newList = prev.filter((item) => item.recordId !== recordId);
        return newList.map((item, index) => ({
          ...item,
          order: index + 1,
        }));
      } else {
        // Add to end of list (maintains order)
        return [...prev, { recordId, address, order: prev.length + 1 }];
      }
    });

    // Clear previous results when selection changes
    setRouteResult(null);
    setError(null);
    setShowGoogleMapsButton(false);
    setOptimizedRouteOrder(null);

    // Geocode the address immediately if it's being added
    const existingIndex = selectedAddresses.findIndex((item) => item.recordId === recordId);
    if (existingIndex === -1) {
      // New address being added - geocode it
      try {
        const geocoded = await geocodeAddresses([address]);
        if (geocoded && geocoded.length > 0) {
          setGeocodedAddresses((prev) => {
            // Remove any existing geocoded address for this record
            const filtered = prev.filter((addr) => addr.recordId !== recordId);
            // Add the new geocoded address with the correct order
            const newOrder = selectedAddresses.length + 1; // This will be the order for the new address
            return [...filtered, { ...geocoded[0], recordId, order: newOrder }];
          });
          // Clear any previous error for this address
          setGeocodingErrors((prev) => {
            const newErrors = { ...prev };
            delete newErrors[recordId];
            return newErrors;
          });
        }
      } catch (error) {
        console.error("Geocoding error:", error);
        // Store error for this specific address
        setGeocodingErrors((prev) => ({
          ...prev,
          [recordId]: `Could not geocode`,
        }));
      }
    } else {
      // Address being removed - remove from geocoded addresses and clear error
      setGeocodedAddresses((prev) => prev.filter((addr) => addr.recordId !== recordId));
      setGeocodingErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[recordId];
        return newErrors;
      });
    }
  };

  // Handle route type change
  const handleRouteTypeChange = async (newRouteType) => {
    setRouteType(newRouteType);

    // Recalculate route if we have addresses selected and geocoded
    if (selectedAddresses.length >= 2 && geocodedAddresses.length > 0) {
      setIsCalculatingRoute(true);
      setError(null);

      try {
        const coordinates = geocodedAddresses.map((addr) => ({
          lat: addr.lat,
          lon: addr.lon,
        }));

        const routeData = await calculateRoute(coordinates, newRouteType);
        setRouteResult(routeData);
      } catch (error) {
        console.error("Route calculation error:", error);
        setError(`Error calculating route: ${error.message}`);
      } finally {
        setIsCalculatingRoute(false);
      }
    }
  };

  // Calculate route using already geocoded addresses
  const calculateRouteWithGeocoding = async () => {
    if (selectedAddresses.length < 2) {
      setError("Please select at least 2 addresses for routing.");
      return;
    }

    // Check if we have geocoding errors
    const addressesWithErrors = Object.keys(geocodingErrors);
    if (addressesWithErrors.length > 0) {
      setError(`Some addresses couldn't be geocoded and won't be included in the route. Please review the addresses marked with errors below.`);
      return;
    }

    // Check if we have all addresses geocoded
    if (geocodedAddresses.length < selectedAddresses.length) {
      setError("Some addresses are still being geocoded. Please wait a moment and try again.");
      return;
    }

    setIsCalculatingRoute(true);
    setError(null);

    try {
      // Get addresses in EXACT order selected by user
      const addressesInOrder = selectedAddresses.sort((a, b) => a.order - b.order);

      // Get geocoded addresses in the same order
      const geocodedInOrder = addressesInOrder.map((selected) => geocodedAddresses.find((geocoded) => geocoded.recordId === selected.recordId)).filter(Boolean);

      // Extract coordinates for routing
      const coordinates = geocodedInOrder.map((addr) => ({
        lat: addr.lat,
        lon: addr.lon,
      }));

      // Calculate route
      const routeData = await calculateRoute(coordinates, routeType);
      setRouteResult(routeData);

      // Collapse address section after successful calculation
      setShowAddressSection(false);
      setShowGoogleMapsButton(true);
      setOptimizedRouteOrder(null); // Use original order
    } catch (error) {
      console.error("Route calculation error:", error);
      setError(`Error calculating route: ${error.message}`);
    } finally {
      setIsCalculatingRoute(false);
    }
  };

  // Calculate best route (optimized order) using already geocoded addresses
  const calculateBestRoute = async () => {
    if (selectedAddresses.length < 2) {
      setError("Please select at least 2 addresses for routing.");
      return;
    }

    // Check if we have geocoding errors
    const addressesWithErrors = Object.keys(geocodingErrors);
    if (addressesWithErrors.length > 0) {
      setError(`Some addresses couldn't be geocoded and won't be included in the route. Please review the addresses marked with errors below.`);
      return;
    }

    // Check if we have all addresses geocoded
    if (geocodedAddresses.length < selectedAddresses.length) {
      setError("Some addresses are still being geocoded. Please wait a moment and try again.");
      return;
    }

    setIsCalculatingRoute(true);
    setError(null);

    try {
      // Get all geocoded addresses
      const allGeocoded = geocodedAddresses;

      // Find the optimal route order using a simple TSP approach
      const optimizedOrder = findOptimalRouteOrder(allGeocoded);

      // Extract coordinates in optimized order
      const coordinates = optimizedOrder.map((addr) => ({
        lat: addr.lat,
        lon: addr.lon,
      }));

      // Calculate route with optimized order
      const routeData = await calculateRoute(coordinates, routeType);
      setRouteResult(routeData);

      // Keep the original selection order for display, but use optimized order for route
      // Don't update the selectedAddresses order - keep original selection visible

      // Collapse address section after successful calculation
      setShowAddressSection(false);
      setShowGoogleMapsButton(true);
      setOptimizedRouteOrder(optimizedOrder);
    } catch (error) {
      console.error("Best route calculation error:", error);
      setError(`Error calculating best route: ${error.message}`);
    } finally {
      setIsCalculatingRoute(false);
    }
  };

  // Build Google Maps directions URL
  const buildGoogleMapsUrl = () => {
    if (!geocodedAddresses || geocodedAddresses.length === 0) {
      return null;
    }

    // Use optimized order if present, otherwise use geocodedAddresses
    const routeAddresses = optimizedRouteOrder && optimizedRouteOrder.length === geocodedAddresses.length ? optimizedRouteOrder.map((addr) => addr.originalAddress) : geocodedAddresses.map((addr) => addr.originalAddress);

    // Build the Google Maps directions URL
    const baseUrl = "https://www.google.com/maps/dir/";
    const encodedAddresses = routeAddresses.map((addr) => encodeURIComponent(addr));
    const url = baseUrl + encodedAddresses.join("/") + "/";

    return url;
  };

  // Build Apple Maps directions URL
  const buildAppleMapsUrl = () => {
    if (!geocodedAddresses || geocodedAddresses.length === 0) {
      return null;
    }
    // Use optimized order if present, otherwise use geocodedAddresses
    const routeAddresses = optimizedRouteOrder && optimizedRouteOrder.length === geocodedAddresses.length ? optimizedRouteOrder.map((addr) => addr.originalAddress) : geocodedAddresses.map((addr) => addr.originalAddress);
    if (routeAddresses.length < 2) return null;
    const saddr = encodeURIComponent(routeAddresses[0]);
    // Apple Maps supports waypoints using 'to:' in daddr
    const daddr = routeAddresses
      .slice(1)
      .map((addr) => encodeURIComponent(addr))
      .join("+to:");
    return `https://maps.apple.com/?saddr=${saddr}&daddr=${daddr}`;
  };

  // Simple TSP solver to find optimal route order
  const findOptimalRouteOrder = (addresses) => {
    if (addresses.length <= 2) {
      return addresses; // No optimization needed for 2 or fewer points
    }

    // Calculate distances between all points
    const distances = [];
    for (let i = 0; i < addresses.length; i++) {
      distances[i] = [];
      for (let j = 0; j < addresses.length; j++) {
        if (i === j) {
          distances[i][j] = 0;
        } else {
          // Calculate distance using Haversine formula
          const lat1 = (addresses[i].lat * Math.PI) / 180;
          const lat2 = (addresses[j].lat * Math.PI) / 180;
          const deltaLat = ((addresses[j].lat - addresses[i].lat) * Math.PI) / 180;
          const deltaLon = ((addresses[j].lon - addresses[i].lon) * Math.PI) / 180;

          const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          const distance = 6371 * c; // Earth's radius in km

          distances[i][j] = distance;
        }
      }
    }

    // Simple nearest neighbor algorithm for TSP
    const visited = new Array(addresses.length).fill(false);
    const route = [addresses[0]]; // Start with first address
    visited[0] = true;

    for (let i = 1; i < addresses.length; i++) {
      let currentIndex = addresses.indexOf(route[route.length - 1]);
      let nearestIndex = -1;
      let minDistance = Infinity;

      // Find nearest unvisited neighbor
      for (let j = 0; j < addresses.length; j++) {
        if (!visited[j] && distances[currentIndex][j] < minDistance) {
          minDistance = distances[currentIndex][j];
          nearestIndex = j;
        }
      }

      if (nearestIndex !== -1) {
        route.push(addresses[nearestIndex]);
        visited[nearestIndex] = true;
      }
    }

    return route;
  };

  return (
    <Box padding={3}>
      <Box marginBottom={3} paddingBottom={2} borderBottom="1px solid #e1e5e9">
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Text fontSize="20px" fontWeight={600} textColor="dark">
            <Icon name="link" size={20} /> Route Planner
          </Text>
          <Box display="flex" gap={1}>
            <Box padding="4px 8px" backgroundColor="blue" borderRadius="12px" border="1px solid #bfdbfe">
              <Text fontSize="10px" fontWeight={500} textColor="white">
                {table.name}
              </Text>
            </Box>
            <Box padding="4px 8px" backgroundColor="lightGray1" borderRadius="12px" border="1px solid #e5e7eb">
              <Text fontSize="10px" fontWeight={500} textColor="dark">
                {records.length} records
              </Text>
            </Box>
            {currentView && currentView.activeFilters && currentView.activeFilters.length > 0 && (
              <Box padding="4px 8px" backgroundColor="orange" borderRadius="12px" border="1px solid #fed7aa">
                <Text fontSize="10px" fontWeight={500} textColor="white">
                  Filtered
                </Text>
              </Box>
            )}
            {!canUpdateGlobalConfig && (
              <Tooltip 
                content="You have read-only permissions. Field selections and settings cannot be saved."
                position="bottom"
                width="250px"
              >
                <Box padding="4px 8px" backgroundColor="yellow" borderRadius="12px" border="1px solid #fde047">
                  <Text fontSize="10px" fontWeight={500} textColor="dark">
                    Read-only
                  </Text>
                </Box>
              </Tooltip>
            )}
          </Box>
        </Box>
      </Box>

      <Box marginBottom={3}>
        <Box display="flex" alignItems="center" gap={1}>
          <Icon name="mapPin" size={16} />
          <Text fontSize="14px" fontWeight={600} textColor="dark">
            {selectedLocationField?.name || 'No field selected'}
          </Text>
          <Button
            variant="danger"
            marginLeft={2}
            size="small"
            onClick={async () => {
              // Clear the config for the current table
              try {
                const configKey = `table_${table.id}_field`;
                await globalConfig.setAsync(configKey, null);
              } catch (error) {
                console.error('Error clearing table config:', error);
                // Check if this is a permission error
                if (error.message && error.message.includes('permission')) {
                  setCanUpdateGlobalConfig(false);
                  setError(`Cannot change field selection: Insufficient permissions`);
                } else {
                  setError(`Error clearing field selection: ${error.message}`);
                }
                return;
              }
              
              // Reset all state
              setSelectedLocationField(null);
              setSelectedAddresses([]);
              setRouteResult(null);
              setGeocodedAddresses([]);
              setError(null);
              setShowAddressSection(true);
              setShowGoogleMapsButton(false);
              setOptimizedRouteOrder(null);
              setGeocodingErrors({}); // Clear all geocoding errors
            }}
          >
            <Icon name="redo" size={12} /> Change
          </Button>
        </Box>
      </Box>



      {/* <Box marginBottom={3}>
        <Box display="flex" alignItems="center" gap={1} marginBottom={1}>
          <Icon name="directions" size={16} />
          <Text fontSize="14px" fontWeight={600} textColor="dark">
            Route Type
          </Text>
        </Box>
        <Select value={routeType} onChange={handleRouteTypeChange} disabled>
          <option value="driving">Driving</option>
        </Select>
      </Box> */}

      <Box marginBottom={1}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          {/* Filter indicator - only show when field is selected */}
          {selectedLocationField && (
            <Tooltip 
              content="Use Airtable table filters."
              position="right"
              width="220px"
            >
              {currentView && currentView.activeFilters && currentView.activeFilters.length > 0 ? (
                <Box display="flex" alignItems="center" gap={1} padding="4px 8px" backgroundColor="orange" borderRadius="12px" border="1px solid #fed7aa">
                  <Icon name="view" size={12} />
                  <Text fontSize="11px" fontWeight={500} textColor="white">
                    Filtered ({records.length})
                  </Text>
                </Box>
              ) : (
                <Box display="flex" alignItems="center" gap={1} padding="4px 8px" backgroundColor="lightGray1" borderRadius="12px" border="1px solid #e5e7eb">
                  <Icon name="view" size={12} />
                  <Text fontSize="11px" fontWeight={500} textColor="light">
                    All ({records.length})
                  </Text>
                </Box>
              )}
            </Tooltip>
          )}

          {/* Route buttons */}
          <Box display="flex" gap={1}>
            <Button variant="default" marginRight={2} size="large" onClick={calculateRouteWithGeocoding} disabled={selectedAddresses.length < 2 || isCalculatingRoute}>
              {isCalculatingRoute ? (
                <>
                  <Loader scale={0.6} /> Calculating...
                </>
              ) : (
                <>
                  <Icon name="link" size={16} /> Calculate Route
                </>
              )}
            </Button>

            <Button variant="default" size="large" onClick={calculateBestRoute} disabled={selectedAddresses.length < 2 || isCalculatingRoute}>
              {isCalculatingRoute ? (
                <>
                  <Loader scale={0.6} /> Optimizing...
                </>
              ) : (
                <>
                  <Icon name="star" size={16} /> Best Route
                </>
              )}
            </Button>
          </Box>
        </Box>
      </Box>

      {error && (
        <Box display="flex" alignItems="flex-start" gap={2} marginBottom={3} padding={3} backgroundColor="#fee2e2" borderRadius="8px" border="1px solid #fca5a5">
          <Icon name="warning" size={16} fill="#dc2626" />
          <Box>
            {/* <Text fontSize="14px" fontWeight={600} textColor="#dc2626" marginBottom={1}>
              Route Calculation Error
            </Text> */}
            <Text fontSize="13px" textColor="#dc2626" lineHeight="1.4">
              {error}
            </Text>
          </Box>
        </Box>
      )}

      {permissionError && (
        <Box display="flex" alignItems="flex-start" gap={2} marginBottom={3} padding={3} backgroundColor="#fef3c7" borderRadius="8px" border="1px solid #f59e0b">
          <Icon name="warning" size={16} fill="#d97706" />
          <Box>
            <Text fontSize="13px" textColor="#d97706" lineHeight="1.4">
              {permissionError}
            </Text>
          </Box>
        </Box>
      )}

      {/* Collapsible Address Section */}
      <Box marginBottom={3}>
        <Box display="flex" alignItems="center" justifyContent="space-between" marginBottom={1} onClick={() => setShowAddressSection(!showAddressSection)}>
          <Text fontSize="14px" fontWeight={600} textColor="dark">
            <Icon name="mapPin" size={16} /> Select Addresses ({selectedAddresses.length} selected)
          </Text>
          <Button variant="default" onClick={() => setShowAddressSection(!showAddressSection)}>
            {showAddressSection ? <Icon marginTop={1} name="minus" size={16} /> : <Icon marginTop={1} name="plus" size={16} />}
          </Button>
        </Box>

        {showAddressSection && selectedLocationField && nameField && (
          <Box display="flex" flexDirection="column">
            {records.map((record, index) => {
              // Add safety checks for both fields
              const nameValue = nameField ? record.getCellValue(nameField.id) : null;
              const locationValue = selectedLocationField ? record.getCellValue(selectedLocationField.id) : null;
              const isSelected = selectedAddresses.find((item) => item.recordId === record.id);
              const order = isSelected ? isSelected.order : null;
              const geocodingError = geocodingErrors[record.id];

              return (
                <Box
                  key={record.id}
                  display="flex"
                  alignItems="flex-start"
                  gap={2}
                  padding={3}
                  marginBottom={2}
                  backgroundColor={isSelected ? "blue" : "white"}
                  border="1px solid"
                  borderColor={isSelected ? "blue" : "lightGray2"}
                  borderRadius="8px"
                  cursor="pointer"
                  onClick={() => locationValue && handleAddressToggle(record.id, locationValue)}
                  transition="all 0.2s ease"
                  _hover={{
                    backgroundColor: isSelected ? "blue" : "lightGray1",
                    borderColor: isSelected ? "blue" : "lightGray3",
                  }}
                  boxShadow={isSelected ? "0 2px 4px rgba(0,0,0,0.1)" : "none"}
                >
                  <Box display="flex" marginRight={2} alignItems="center" justifyContent="center" width="28px" height="28px" borderRadius="50%" backgroundColor={isSelected ? "white" : "lightGray1"} border="1px solid" borderColor={isSelected ? "white" : "lightGray2"} flexShrink={0}>
                    {isSelected ? (
                      <Text fontSize="13px" fontWeight={600} textColor="blue">
                        {order}
                      </Text>
                    ) : (
                      <Text fontSize="13px" textColor="light">
                        ○
                      </Text>
                    )}
                  </Box>

                  <Box flex={1} textAlign="left" minWidth={0}>
                    {geocodingError && (
                      <Box marginBottom={2} display="flex" alignItems="center" gap={1} padding={2} backgroundColor="#fee2e2" borderRadius="6px" border="1px solid #fca5a5">
                        <Icon name="warning" size={12} fill="#dc2626" />
                        <Text fontSize="11px" textColor="#dc2626" fontWeight={500}>
                          Could not geocode address
                        </Text>
                      </Box>
                    )}
                    <Text fontSize="14px" fontWeight={600} textColor={isSelected ? "white" : "dark"} marginBottom={1} overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
                      {nameValue ? String(nameValue) : "N/A"}
                    </Text>
                    <Text fontSize="12px" textColor={isSelected ? "white" : "light"} opacity={0.8} overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
                      {locationValue ? String(locationValue) : "N/A"}
                    </Text>
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}
      </Box>

      {geocodedAddresses.length > 0 && <RouteMap routeData={routeResult} addresses={geocodedAddresses} selectedAddresses={selectedAddresses} />}

      {routeResult && (
        <Box marginTop={3} padding={2} backgroundColor="lightGray1" borderRadius="8px" border="1px solid #e5e7eb">
          <Box display="flex" alignItems="center" gap={1} marginBottom={2}>
            <Icon name="chart" size={16} />
            <Text fontSize="14px" fontWeight={600} textColor="dark">
              Route Summary
            </Text>
          </Box>
          {isCalculatingRoute ? (
            <Box display="flex" alignItems="center" gap={1} padding={1} backgroundColor="lightGray2" borderRadius="6px" border="1px solid #e5e7eb">
              <Loader scale={0.6} />
              <Text fontSize="12px" textColor="dark">
                Recalculating route...
              </Text>
            </Box>
          ) : (
            <Box display="flex" alignItems="center" gap={3} flexWrap="wrap">
              {/* <Box display="flex" alignItems="center" gap={1}>
                <Icon name="directions" size={14} />
                <Text fontSize="12px" textColor="dark">
                  {routeType.charAt(0).toUpperCase() + routeType.slice(1)}
                </Text>
              </Box> */}
              <Box display="flex" alignItems="center" marginRight={2} gap={1}>
                <Icon name="text" size={14} />
                <Text fontSize="12px" textColor="dark">
                  {(routeResult.distance / 1000).toFixed(1)} km
                </Text>
              </Box>
              <Box display="flex" alignItems="center" marginRight={2} gap={1}>
                <Icon name="time" size={14} />
                <Text fontSize="12px" textColor="dark">
                  {Math.round(routeResult.duration / 60)} min
                </Text>
              </Box>
              <Box display="flex" alignItems="center" marginRight={2} gap={1}>
                <Icon name="mapPin" size={14} />
                <Text fontSize="12px" textColor="dark">
                  {routeResult.waypoints.length} stops
                </Text>
              </Box>
              {routeResult && geocodedAddresses.length > 0 && showGoogleMapsButton && (
                <>
                  <Button variant="default" size="small" marginRight={2} onClick={() => window.open(buildGoogleMapsUrl(), "_blank")} target="_blank" rel="noopener noreferrer">
                    <Icon name="hyperlink" size={12} /> Google Maps
                  </Button>
                  <Button 
                    variant="primary" 
                    size="small" 
                    onClick={() => setShowSaveModal(true)}
                  >
                    <Icon name="download" size={12} /> Save
                  </Button>
                </>
              )}
            </Box>
          )}
        </Box>
      )}

      <SaveModal isOpen={showSaveModal} onClose={() => setShowSaveModal(false)} routeData={routeResult} addresses={geocodedAddresses} optimizedRouteOrder={buildGoogleMapsUrl()} />

      <SettingsModal isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)} />
    </Box>
  );
}
initializeBlock(() => <RoutePlannerAppAirtable />);
