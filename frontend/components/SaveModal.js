import React, { useState, useEffect } from "react";
import { useBase, useRecords, Box, Text, Button, Select, Icon, Loader, TablePicker, FieldPicker, Dialog } from "@airtable/blocks/ui";

const SaveModal = ({ isOpen, onClose, routeData, addresses, optimizedRouteOrder }) => {
  const [selectedBase, setSelectedBase] = useState(null);
  const [selectedTable, setSelectedTable] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);
  const [selectedColumn, setSelectedColumn] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const base = useBase();
  const [bases, setBases] = useState([]);
  const [tables, setTables] = useState([]);

  // Use the useRecords hook to get records for the selected table
  const rows = useRecords(selectedTable);

  // Build route info for preview and saving
  const buildRouteInfo = () => {
    if (!routeData || !addresses || addresses.length === 0) return null;

    const googleMapsUrl = optimizedRouteOrder;

    return {
      googleMapsUrl: googleMapsUrl,
    };
  };

  const routeInfo = buildRouteInfo();

  // Load available bases and tables
  useEffect(() => {
    if (isOpen && base) {
      // Set the current base as the only option
      setBases([base]);
      setSelectedBase(base);

      // Load tables from the current base
      const baseTables = base.tables;
      setTables(baseTables);

      // Auto-select the first table if available
      if (baseTables.length > 0) {
        setSelectedTable(baseTables[0]);
      }
    }
  }, [isOpen, base]);

  // Reset selections when table changes
  useEffect(() => {
    if (selectedTable) {
      setSelectedRow(null);
      setSelectedColumn(null);
    }
  }, [selectedTable]);
  const handleSave = async () => {
    if (!selectedBase || !selectedTable || !selectedRow || !selectedColumn) {
      setSaveError("Please select all required fields");
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      // Use the pre-built routeInfo
      if (!routeInfo) {
        throw new Error("Route information not available");
      }

      // Save just the Google Maps URL
      const cellValue = routeInfo.googleMapsUrl;

      // Try using the table's updateRecord method
      let updateSuccess = false;

      // Method 1: Try table.updateRecordAsync
      if (typeof selectedTable.updateRecordAsync === "function") {
        await selectedTable.updateRecordAsync(selectedRow.id, { [selectedColumn.id]: cellValue });
        updateSuccess = true;
      }
      // Method 2: Try record.setCellValueAsync
      else if (typeof selectedRow.setCellValueAsync === "function") {
        await selectedRow.setCellValueAsync(selectedColumn.id, cellValue);
        updateSuccess = true;
      }
      // Method 3: Try record.updateAsync
      else if (typeof selectedRow.updateAsync === "function") {
        await selectedRow.updateAsync({ [selectedColumn.id]: cellValue });
        updateSuccess = true;
      }
      // Method 4: Try setCellValue (sync)
      else if (typeof selectedRow.setCellValue === "function") {
        selectedRow.setCellValue(selectedColumn.id, cellValue);
        updateSuccess = true;
      }

      if (!updateSuccess) {
        throw new Error("No valid method found to update cell value");
      }

      setSaveSuccess(true);
      setTimeout(() => {
        onClose();
        setSaveSuccess(false);
      }, 2000);
    } catch (error) {
      console.error("Error saving route data:", error);
      setSaveError(`Error saving: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Box position="fixed" top="0" left="0" right="0" bottom="0" backgroundColor="rgba(0,0,0,0.5)" display="flex" alignItems="center" justifyContent="center" zIndex={1000} onClick={onClose}>
      <Box backgroundColor="white" borderRadius="8px" padding={3} width="500px" maxWidth="90vw" maxHeight="90vh" overflow="auto" onClick={(e) => e.stopPropagation()}>
        <Box display="flex" alignItems="center" justifyContent="space-between" marginBottom={3}>
          <Text fontSize="16px" fontWeight={600} textColor="dark">
            Save Route to Airtable
          </Text>
          <Button variant="default" size="small" onClick={onClose}>
            <Icon name="x" size={16} />
          </Button>
        </Box>
        <Box padding={3}>
          {saveSuccess ? (
            <Box display="flex" alignItems="center" gap={2} padding={3} backgroundColor="lightGray1" borderRadius="8px" border="1px solid #e5e7eb">
              <Icon name="check" size={20} />
              <Text fontSize="14px" textColor="dark">
                Route saved successfully!
              </Text>
            </Box>
          ) : (
            <>
              <Box marginBottom={3}>
                <Text fontSize="12px" fontWeight={600} textColor="dark" marginBottom={1}>
                  Base:
                </Text>
                <Box padding={2} backgroundColor="lightGray1" borderRadius="6px" border="1px solid #e5e7eb">
                  <Text fontSize="14px" textColor="dark">
                    {selectedBase?.name || "Current Base"}
                  </Text>
                </Box>
              </Box>

              <Box marginBottom={3}>
                <Text fontSize="12px" fontWeight={600} textColor="dark" marginBottom={1}>
                  Table:
                </Text>
                {TablePicker ? (
                  <TablePicker table={selectedTable} onChange={setSelectedTable} placeholder="Choose a table..." shouldAllowPickingNone={false} />
                ) : (
                  <Box padding={2} backgroundColor="lightGray2" borderRadius="6px" border="1px solid #e5e7eb">
                    <Text fontSize="14px" textColor="light">
                      TablePicker not available
                    </Text>
                  </Box>
                )}
               
              </Box>

              <Box marginBottom={3}>
                <Text fontSize="12px" fontWeight={600} textColor="dark" marginBottom={1}>
                  Record: ({rows?.length || 0} available)
                </Text>
                {rows && rows.length > 0 ? (
                  <Select
                    value={selectedRow?.id || ""}
                    onChange={(value) => setSelectedRow(rows.find((r) => r.id === value))}
                    options={[
                      { value: "", label: "Select Record" },
                      ...rows.map((record) => {
                        // Try to get a display name from the first field
                        const firstField = selectedTable?.fields[0];
                        const displayName = firstField ? record.getCellValue(firstField.id) : record.id;
                        return {
                          value: record.id,
                          label: displayName || record.id,
                        };
                      }),
                    ]}
                    disabled={!selectedTable}
                  />
                ) : (
                  <Box padding={2} backgroundColor="lightGray2" borderRadius="6px" border="1px solid #e5e7eb">
                    <Text fontSize="14px" textColor="light">
                      {!selectedTable ? "Select a table first" : `No records available (rows: ${rows?.length || 0})`}
                    </Text>
                  </Box>
                )}
              </Box>

              <Box marginBottom={3}>
                <Text fontSize="12px" fontWeight={600} textColor="dark" marginBottom={1}>
                  Field:
                </Text>
                {FieldPicker ? (
                  <FieldPicker table={selectedTable} field={selectedColumn} onChange={setSelectedColumn} placeholder="Choose a field to save the route URL..." shouldAllowPickingNone={false} />
                ) : (
                  <Box padding={2} backgroundColor="lightGray2" borderRadius="6px" border="1px solid #e5e7eb">
                    <Text fontSize="14px" textColor="light">
                      FieldPicker not available
                    </Text>
                  </Box>
                )}
              </Box>

              {routeInfo && (
                <Box marginBottom={3} padding={2} backgroundColor="lightGray1" borderRadius="8px" border="1px solid #e5e7eb">
                  <Text fontSize="12px" fontWeight={600} textColor="dark" marginBottom={1}>
                    Preview:
                  </Text>
                  <Box display="flex" flexDirection="column" gap={1}>
                    <Box display="flex" alignItems="center" gap={1}>
                      {/* <Text fontSize="12px" fontWeight={600} textColor="dark">
                        Google Maps URL:
                      </Text> */}
                      {/* <Text fontSize="12px" textColor="light" fontFamily="monospace">
                        {routeInfo.googleMapsUrl ? "Available" : "Not available"}
                      </Text> */}
                    </Box>
                    {routeInfo.googleMapsUrl && (
                      <Button variant="default" size="small" onClick={() => window.open(routeInfo.googleMapsUrl, "_blank")} target="_blank" rel="noopener noreferrer">
                        <Icon name="link" size={12} /> Open in Google Maps
                      </Button>
                    )}
                  </Box>
                </Box>
              )}

              {saveError && (
                <Box display="flex" alignItems="center" gap={2} marginBottom={3} padding={2} backgroundColor="lightGray2" borderRadius="8px" border="1px solid #e5e7eb">
                  <Icon name="warning" size={16} />
                  <Text fontSize="14px" textColor="dark">
                    {saveError}
                  </Text>
                </Box>
              )}

              <Box display="flex" justifyContent="flex-end" gap={2}>
                <Button variant="default" onClick={onClose} disabled={isSaving}>
                  Cancel
                </Button>
                <Button marginLeft={2} variant="primary" onClick={handleSave} disabled={!selectedBase || !selectedTable || !selectedRow || !selectedColumn || isSaving}>
                  {isSaving ? (
                    <>
                      <Loader scale={0.6} /> Saving...
                    </>
                  ) : (
                    "Save Route"
                  )}
                </Button>
              </Box>
            </>
          )}
        </Box>
      </Box>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <Dialog
          onClose={() => setShowConfirmDialog(false)}
          title="Confirm Save"
          body={
            <Box>
              <Text>Are you sure you want to save the route URL to the selected record?</Text>
              <Box marginTop={2} padding={2} backgroundColor="lightGray1" borderRadius="6px">
                <Text fontSize="12px" fontWeight={600}>
                  Table:
                </Text>
                <Text fontSize="14px">{selectedTable?.name}</Text>
                <Text fontSize="12px" fontWeight={600} marginTop={1}>
                  Record:
                </Text>
                <Text fontSize="14px">{selectedRow?.id}</Text>
                <Text fontSize="12px" fontWeight={600} marginTop={1}>
                  Field:
                </Text>
                <Text fontSize="14px">{selectedColumn?.name}</Text>
              </Box>
            </Box>
          }
          primaryButtonLabel="Save"
          primaryButtonOnClick={handleSave}
          secondaryButtonLabel="Cancel"
          secondaryButtonOnClick={() => setShowConfirmDialog(false)}
        />
      )}
    </Box>
  );
};

export default SaveModal;
