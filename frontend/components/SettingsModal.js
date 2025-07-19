import React, { useState } from 'react';
import { 
  Box, 
  Text, 
  Button, 
  Select, 
  Icon, 
  useGlobalConfig,
  useWatchable,
  Switch
} from "@airtable/blocks/ui";

const SettingsModal = ({ isOpen, onClose }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  const globalConfig = useGlobalConfig();
  
  // Watch for global config changes
  useWatchable(globalConfig, ['*']);

  // Get current settings
  const defaultRouteType = globalConfig.get('defaultRouteType') || 'driving';
  const maxAddresses = globalConfig.get('maxAddresses') || 10;
  const enableOptimization = globalConfig.get('enableOptimization') || true;
  const autoGeocode = globalConfig.get('autoGeocode') || true;

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);

    try {
      // Save settings to global config
      await globalConfig.setAsync({
        defaultRouteType,
        maxAddresses,
        enableOptimization,
        autoGeocode
      });

      setSaveSuccess(true);
      setTimeout(() => {
        onClose();
        setSaveSuccess(false);
      }, 2000);

    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveError(`Error saving settings: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Box
      position="fixed"
      top="0"
      left="0"
      right="0"
      bottom="0"
      backgroundColor="rgba(0,0,0,0.5)"
      display="flex"
      alignItems="center"
      justifyContent="center"
      zIndex={1000}
      onClick={onClose}
    >
      <Box
        backgroundColor="white"
        borderRadius="8px"
        padding={3}
        width="500px"
        maxWidth="90vw"
        maxHeight="90vh"
        overflow="auto"
        onClick={(e) => e.stopPropagation()}
      >
        <Box display="flex" alignItems="center" justifyContent="space-between" marginBottom={3}>
          <Text fontSize="16px" fontWeight={600} textColor="dark">
            Route Planner Settings
          </Text>
          <Button variant="subtle" size="small" onClick={onClose}>
            <Icon name="close" size={16} />
          </Button>
        </Box>
      <Box padding={3}>
        {saveSuccess ? (
          <Box display="flex" alignItems="center" gap={2} padding={3} backgroundColor="lightGray1" borderRadius="8px" border="1px solid #e5e7eb">
            <Icon name="check-circle" size={20} />
            <Text fontSize="14px" textColor="dark">Settings saved successfully!</Text>
          </Box>
        ) : (
          <>
            <Box marginBottom={3}>
              <Text fontSize="12px" fontWeight={600} textColor="dark" marginBottom={1}>
                Default Route Type:
              </Text>
              <Select 
                value={defaultRouteType}
                onChange={(e) => globalConfig.set('defaultRouteType', e.target.value)}
              >
                <option value="driving">🚗 Driving</option>
                <option value="cycling">🚴 Cycling</option>
                <option value="walking">🚶 Walking</option>
              </Select>
              <Text fontSize="11px" textColor="light" marginTop={1}>
                The default transportation mode for route calculations
              </Text>
            </Box>

            <Box marginBottom={3}>
              <Text fontSize="12px" fontWeight={600} textColor="dark" marginBottom={1}>
                Maximum Addresses:
              </Text>
              <Select 
                value={maxAddresses}
                onChange={(e) => globalConfig.set('maxAddresses', parseInt(e.target.value))}
              >
                <option value={5}>5 addresses</option>
                <option value={10}>10 addresses</option>
                <option value={15}>15 addresses</option>
                <option value={20}>20 addresses</option>
              </Select>
              <Text fontSize="11px" textColor="light" marginTop={1}>
                Maximum number of addresses that can be selected for routing
              </Text>
            </Box>

            <Box marginBottom={3}>
              <Box display="flex" alignItems="center" justifyContent="space-between" marginBottom={1}>
                <Text fontSize="12px" fontWeight={600} textColor="dark">
                  Enable Route Optimization:
                </Text>
                <Switch
                  value={enableOptimization}
                  onChange={(value) => globalConfig.set('enableOptimization', value)}
                />
              </Box>
              <Text fontSize="11px" textColor="light">
                Automatically optimize route order for shortest distance
              </Text>
            </Box>

            <Box marginBottom={3}>
              <Box display="flex" alignItems="center" justifyContent="space-between" marginBottom={1}>
                <Text fontSize="12px" fontWeight={600} textColor="dark">
                  Auto Geocoding:
                </Text>
                <Switch
                  value={autoGeocode}
                  onChange={(value) => globalConfig.set('autoGeocode', value)}
                />
              </Box>
              <Text fontSize="11px" textColor="light">
                Automatically geocode addresses when selected
              </Text>
            </Box>

            {saveError && (
              <Box display="flex" alignItems="center" gap={2} marginBottom={3} padding={2} backgroundColor="lightGray2" borderRadius="8px" border="1px solid #e5e7eb">
                <Icon name="exclamation-circle" size={16} />
                <Text fontSize="14px" textColor="dark">{saveError}</Text>
              </Box>
            )}

            <Box display="flex" justifyContent="flex-end" gap={2}>
              <Button variant="default" onClick={onClose} disabled={isSaving}>
                Cancel
              </Button>
              <Button 
                variant="primary" 
                onClick={handleSave} 
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save Settings'}
              </Button>
            </Box>
          </>
        )}
      </Box>
      </Box>
    </Box>
  );
};

export default SettingsModal; 