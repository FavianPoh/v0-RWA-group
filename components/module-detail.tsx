"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { getModuleDetails } from "@/lib/module-details"
import { calculateRWA } from "@/lib/rwa-calculator"
import { calculateTtcPd } from "@/lib/ttc-pd-calculator"
import { getPdFromRating } from "@/lib/credit-ratings"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function ModuleDetail({ module, data, results, baselineResults, onClose, onSave }) {
  const [activeTab, setActiveTab] = useState("overview")
  const [originalData] = useState(data)
  const [modifiedData, setModifiedData] = useState(data)
  const [modifiedResults, setModifiedResults] = useState(results)
  const [editedInputs, setEditedInputs] = useState({})
  const [inputValues, setInputValues] = useState({})
  const [moduleDetails, setModuleDetails] = useState(null)

  // Get module details based on current data state - only when needed
  useEffect(() => {
    const details = getModuleDetails(module, modifiedData, modifiedResults)
    setModuleDetails(details)
  }, [module, modifiedData, modifiedResults])

  // Initialize input values when module details change
  useEffect(() => {
    if (!moduleDetails || !moduleDetails.inputs) return

    const initialValues = {}
    moduleDetails.inputs.forEach((input) => {
      if (input.rawValue !== undefined) {
        const name = input.name.toLowerCase().replace(/\s+/g, "")
        if (name.includes("pd") || name.includes("lgd")) {
          initialValues[name] = (input.rawValue * 100).toFixed(4)
        } else {
          initialValues[name] = input.rawValue.toString()
        }
      }
    })
    setInputValues(initialValues)
  }, [moduleDetails])

  // Recalculate results when data changes, but only if there are edited inputs
  useEffect(() => {
    if (Object.keys(editedInputs).length > 0) {
      // Recalculate results based on modified data
      const newResults = calculateRWA(modifiedData)
      setModifiedResults(newResults)
    }
  }, [modifiedData, editedInputs])

  if (!moduleDetails) return null

  // Check if there are any adjustments
  const hasAdjustment = results.hasAdjustment || results.hasPortfolioAdjustment
  const originalRwaValue = baselineResults?.rwa || results.originalRwa || results.rwa
  const adjustedRwaValue = results.rwa
  const adjustmentPercentageValue = hasAdjustment ? (adjustedRwaValue / originalRwaValue - 1) * 100 : 0

  // Map display name to actual property name
  const getPropertyName = (displayName) => {
    const name = displayName.toLowerCase().replace(/\s+/g, "")

    // Map common display names to actual property names
    const nameMap = {
      "point-in-timepd": "pd",
      pitpd: "pd",
      "through-the-cyclepd": "ttcpd",
      ttcpd: "ttcPd",
      effectivematurity: "maturity",
      economicindex: "macroeconomicIndex",
      currenteconomicconditions: "macroeconomicIndex",
      "long-termaveragedefaultrate": "longTermAverage",
      longtermaveragedefaultrate: "longTermAverage",
    }

    return nameMap[name] || name
  }

  // Handle input value changes
  const handleInputChange = (paramName, value) => {
    // Update the input value state
    setInputValues((prev) => ({
      ...prev,
      [paramName]: value,
    }))

    // Get the actual property name
    const propertyName = getPropertyName(paramName)

    // Only update the actual data if the value is valid
    let newValue

    // Handle special case for credit rating
    if (propertyName === "creditrating") {
      newValue = value
    } else {
      newValue = Number.parseFloat(value)
      if (isNaN(newValue)) return
    }

    // Create a copy of the modified data
    const updatedData = { ...modifiedData }

    // Update the appropriate field based on the parameter name
    switch (propertyName) {
      case "pd":
        updatedData.pd = newValue / 100 // Convert from percentage to decimal

        // Recalculate TTC PD if PD changes
        const ttcPdInputs = {
          pointInTimePd: updatedData.pd,
          macroeconomicIndex: updatedData.macroeconomicIndex,
          longTermAverage: updatedData.longTermAverage,
          cyclicality: updatedData.cyclicality,
        }
        updatedData.ttcPd = calculateTtcPd(ttcPdInputs)
        break
      case "ttcPd":
        updatedData.ttcPd = newValue / 100 // Convert from percentage to decimal
        break
      case "lgd":
        updatedData.lgd = newValue / 100 // Convert from percentage to decimal
        break
      case "ead":
        updatedData.ead = newValue
        break
      case "maturity":
        updatedData.maturity = newValue
        break
      case "macroeconomicIndex":
        updatedData.macroeconomicIndex = newValue

        // Recalculate TTC PD if economic index changes
        const ttcInputs = {
          pointInTimePd: updatedData.pd,
          macroeconomicIndex: newValue,
          longTermAverage: updatedData.longTermAverage,
          cyclicality: updatedData.cyclicality,
        }
        updatedData.ttcPd = calculateTtcPd(ttcInputs)
        break
      case "longTermAverage":
        updatedData.longTermAverage = newValue / 100 // Convert from percentage to decimal

        // Recalculate TTC PD if long-term average changes
        const ttcLtaInputs = {
          pointInTimePd: updatedData.pd,
          macroeconomicIndex: updatedData.macroeconomicIndex,
          longTermAverage: updatedData.longTermAverage,
          cyclicality: updatedData.cyclicality,
        }
        updatedData.ttcPd = calculateTtcPd(ttcLtaInputs)
        break
      case "cyclicality":
        updatedData.cyclicality = newValue

        // Recalculate TTC PD if cyclicality changes
        const ttcCyclicalityInputs = {
          pointInTimePd: updatedData.pd,
          macroeconomicIndex: updatedData.macroeconomicIndex,
          longTermAverage: updatedData.longTermAverage,
          cyclicality: newValue,
        }
        updatedData.ttcPd = calculateTtcPd(ttcCyclicalityInputs)
        break
      case "creditrating":
        updatedData.creditRating = value
        updatedData.creditRatingPd = getPdFromRating(value)
        break
      default:
        // For other properties, directly update the property
        if (updatedData[propertyName] !== undefined) {
          // Check if it's likely a percentage value
          if (
            propertyName.toLowerCase().includes("pd") ||
            propertyName.toLowerCase().includes("lgd") ||
            propertyName.toLowerCase().includes("rate") ||
            propertyName.toLowerCase().includes("average")
          ) {
            updatedData[propertyName] = newValue / 100
          } else {
            updatedData[propertyName] = newValue
          }
        }
        break
    }

    // Mark this input as edited
    setEditedInputs((prev) => ({
      ...prev,
      [paramName]: true,
    }))

    // Update the modified data
    setModifiedData(updatedData)
  }

  // Reset a specific input to its original value
  const resetInput = (paramName) => {
    // Get the actual property name
    const propertyName = getPropertyName(paramName)

    // Create a copy of the modified data
    const updatedData = { ...modifiedData }

    // Reset the specific parameter to its original value
    switch (propertyName) {
      case "pd":
        updatedData.pd = originalData.pd
        setInputValues((prev) => ({
          ...prev,
          [paramName]: (originalData.pd * 100).toFixed(4),
        }))

        // Recalculate TTC PD if PD is reset
        const ttcPdInputs = {
          pointInTimePd: updatedData.pd,
          macroeconomicIndex: updatedData.macroeconomicIndex,
          longTermAverage: originalData.longTermAverage,
          cyclicality: updatedData.cyclicality,
        }
        updatedData.ttcPd = calculateTtcPd(ttcPdInputs)
        break
      case "ttcPd":
        updatedData.ttcPd = originalData.ttcPd
        setInputValues((prev) => ({
          ...prev,
          [paramName]: (originalData.ttcPd * 100).toFixed(4),
        }))
        break
      case "lgd":
        updatedData.lgd = originalData.lgd
        setInputValues((prev) => ({
          ...prev,
          [paramName]: (originalData.lgd * 100).toFixed(4),
        }))
        break
      case "ead":
        updatedData.ead = originalData.ead
        setInputValues((prev) => ({
          ...prev,
          [paramName]: originalData.ead.toString(),
        }))
        break
      case "maturity":
        updatedData.maturity = originalData.maturity
        setInputValues((prev) => ({
          ...prev,
          [paramName]: originalData.maturity.toString(),
        }))
        break
      case "macroeconomicIndex":
        updatedData.macroeconomicIndex = originalData.macroeconomicIndex
        setInputValues((prev) => ({
          ...prev,
          [paramName]: originalData.macroeconomicIndex.toString(),
        }))

        // Recalculate TTC PD if economic index is reset
        const ttcInputs = {
          pointInTimePd: updatedData.pd,
          macroeconomicIndex: originalData.macroeconomicIndex,
          longTermAverage: originalData.longTermAverage,
          cyclicality: updatedData.cyclicality,
        }
        updatedData.ttcPd = calculateTtcPd(ttcInputs)
        break
      case "longTermAverage":
        updatedData.longTermAverage = originalData.longTermAverage
        setInputValues((prev) => ({
          ...prev,
          [paramName]: (originalData.longTermAverage * 100).toFixed(4),
        }))

        // Recalculate TTC PD if long-term average is reset
        const ttcLtaInputs = {
          pointInTimePd: updatedData.pd,
          macroeconomicIndex: updatedData.macroeconomicIndex,
          longTermAverage: originalData.longTermAverage,
          cyclicality: updatedData.cyclicality,
        }
        updatedData.ttcPd = calculateTtcPd(ttcLtaInputs)
        break
      case "cyclicality":
        updatedData.cyclicality = originalData.cyclicality
        setInputValues((prev) => ({
          ...prev,
          [paramName]: originalData.cyclicality.toString(),
        }))

        // Recalculate TTC PD if cyclicality is reset
        const ttcCyclicalityInputs = {
          pointInTimePd: updatedData.pd,
          macroeconomicIndex: updatedData.macroeconomicIndex,
          longTermAverage: originalData.longTermAverage,
          cyclicality: originalData.cyclicality,
        }
        updatedData.ttcPd = calculateTtcPd(ttcCyclicalityInputs)
        break
      case "creditrating":
        updatedData.creditRating = originalData.creditRating
        updatedData.creditRatingPd = originalData.creditRatingPd
        setInputValues((prev) => ({
          ...prev,
          [paramName]: originalData.creditRating || "",
        }))
        break
      default:
        // For other properties, directly reset from original data
        if (originalData[propertyName] !== undefined) {
          updatedData[propertyName] = originalData[propertyName]

          // Update input value based on whether it's likely a percentage
          if (
            propertyName.toLowerCase().includes("pd") ||
            propertyName.toLowerCase().includes("lgd") ||
            propertyName.toLowerCase().includes("rate") ||
            propertyName.toLowerCase().includes("average")
          ) {
            setInputValues((prev) => ({
              ...prev,
              [paramName]: (originalData[propertyName] * 100).toFixed(4),
            }))
          } else {
            setInputValues((prev) => ({
              ...prev,
              [paramName]: originalData[propertyName].toString(),
            }))
          }
        }
        break
    }

    // Remove this input from edited inputs
    setEditedInputs((prev) => {
      const updated = { ...prev }
      delete updated[paramName]
      return updated
    })

    // Update the modified data
    setModifiedData(updatedData)
  }

  // Reset to original values
  const resetToOriginal = () => {
    setModifiedData(originalData)
    setModifiedResults(results)
    setEditedInputs({})

    // Reset all input values
    const resetValues = {}
    if (moduleDetails && moduleDetails.inputs) {
      moduleDetails.inputs.forEach((input) => {
        if (input.rawValue !== undefined) {
          const name = input.name.toLowerCase().replace(/\s+/g, "")
          const propertyName = getPropertyName(name)

          // Check if the property exists in originalData before accessing it
          if (propertyName && originalData[propertyName] !== undefined) {
            if (name.includes("pd") || name.includes("lgd") || name.includes("rate") || name.includes("average")) {
              // Handle percentage values
              resetValues[name] = (originalData[propertyName] * 100).toFixed(4)
            } else {
              // Handle other values
              resetValues[name] = originalData[propertyName].toString()
            }
          } else if (input.rawValue !== undefined) {
            // Use the input's raw value as fallback
            if (name.includes("pd") || name.includes("lgd") || name.includes("rate") || name.includes("average")) {
              resetValues[name] = (input.rawValue * 100).toFixed(4)
            } else {
              resetValues[name] = input.rawValue.toString()
            }
          } else {
            // Use default values as last resort
            resetValues[name] = name.includes("pd") || name.includes("lgd") ? "0.0000" : "0"
          }
        }
      })
    }
    setInputValues(resetValues)
  }

  // Save changes to parent component
  const saveChanges = () => {
    if (onSave && Object.keys(editedInputs).length > 0) {
      onSave(modifiedData, module)
      onClose()
    }
  }

  // Check if a value is editable
  const isEditable = (name) => {
    const editableParams = [
      "pd",
      "ttcpd",
      "lgd",
      "ead",
      "maturity",
      "macroeconomicindex",
      "cyclicality",
      "creditrating",
      "longtermaveragedefaultrate",
      "economicindex",
      "currenteconomicconditions",
      "effectivematurity",
      "point-in-timepd",
      "through-the-cyclepd",
    ]
    return editableParams.some((param) => name.toLowerCase().replace(/\s+/g, "") === param)
  }

  // Check if a parameter has been edited
  const isEdited = (name) => {
    return editedInputs[name.toLowerCase().replace(/\s+/g, "")]
  }

  // Get normalized parameter name
  const getNormalizedParamName = (name) => {
    return name.toLowerCase().replace(/\s+/g, "")
  }

  // Calculate if there are adjustments and their impact
  const hasAdj = results.hasAdjustment || results.hasPortfolioAdjustment
  const originalRwa = results.originalRwa || baselineResults?.rwa || results.rwa
  const adjustedRwa = results.rwa
  const adjustmentPercentage = hasAdj ? (adjustedRwa / originalRwa - 1) * 100 : 0
  const adjustmentAmount = hasAdj ? adjustedRwa - originalRwa : 0

  // Ensure moduleDetails properties exist before mapping
  const keyConsiderations = moduleDetails.keyConsiderations || []
  const inputs = moduleDetails.inputs || []
  const outputs = moduleDetails.outputs || []

  return (
    <Dialog
      open={!!module}
      onOpenChange={() => {
        onClose()
      }}
    >
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{moduleDetails.title}</DialogTitle>
          <DialogDescription>{moduleDetails.description}</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview" onClick={() => setActiveTab("overview")}>
              Overview
            </TabsTrigger>
            <TabsTrigger value="inputs" onClick={() => setActiveTab("inputs")}>
              Inputs
            </TabsTrigger>
            <TabsTrigger value="outputs" onClick={() => setActiveTab("outputs")}>
              Outputs
            </TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-lg font-medium">Description</h3>
                <p className="text-sm text-muted-foreground">{moduleDetails.overview}</p>
              </div>
              <div>
                <h3 className="text-lg font-medium">Key Considerations</h3>
                <ul className="list-disc pl-4 text-sm text-muted-foreground">
                  {keyConsiderations.map((consideration, index) => (
                    <li key={index}>{consideration}</li>
                  ))}
                </ul>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="inputs" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {inputs.map((input, index) => {
                const paramName = input.name.toLowerCase().replace(/\s+/g, "")
                const normalizedParamName = getNormalizedParamName(input.name)
                const isCurrentlyEdited = isEdited(normalizedParamName)
                return (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={paramName}>{input.name}</Label>
                      {isEditable(normalizedParamName) && isCurrentlyEdited && (
                        <Button variant="ghost" size="sm" onClick={() => resetInput(input.name)}>
                          Reset
                        </Button>
                      )}
                    </div>
                    {isEditable(normalizedParamName) ? (
                      <Input
                        type="text"
                        id={paramName}
                        value={inputValues[paramName] || ""}
                        onChange={(e) => handleInputChange(input.name, e.target.value)}
                      />
                    ) : (
                      <div className="p-2 border rounded-md bg-muted/50 text-sm">
                        {input.rawValue !== undefined ? input.rawValue.toString() : "N/A"}
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground">{input.description}</p>
                  </div>
                )
              })}
            </div>
            <Button variant="outline" onClick={resetToOriginal}>
              Reset All
            </Button>
          </TabsContent>
          <TabsContent value="outputs" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {outputs.map((output, index) => (
                <div key={index} className="space-y-2">
                  <Label>{output.name}</Label>
                  <div className="p-2 border rounded-md bg-muted/50 text-sm">
                    {output.value !== undefined ? output.value.toString() : "N/A"}
                  </div>
                  <p className="text-sm text-muted-foreground">{output.description}</p>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Add adjustment information section - only show in RWA module or when adjustments exist */}
        {(module === "rwa" || hasAdj) && (
          <div className="mt-4 p-4 border rounded-md bg-muted/20">
            <h3 className="text-lg font-medium mb-2">Adjustment Information</h3>
            {hasAdj ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="font-medium">Original RWA:</div>
                  <div>${Math.round(originalRwa).toLocaleString()}</div>

                  <div className="font-medium">Adjusted RWA:</div>
                  <div>${Math.round(adjustedRwa).toLocaleString()}</div>

                  <div className="font-medium">Adjustment Amount:</div>
                  <div className={adjustmentAmount >= 0 ? "text-green-600" : "text-red-600"}>
                    {adjustmentAmount >= 0 ? "+" : ""}${Math.round(adjustmentAmount).toLocaleString()}
                  </div>

                  <div className="font-medium">Percentage Impact:</div>
                  <div className={adjustmentPercentage >= 0 ? "text-green-600" : "text-red-600"}>
                    {adjustmentPercentage >= 0 ? "+" : ""}
                    {adjustmentPercentage.toFixed(2)}%
                  </div>
                </div>

                {modifiedData.rwaAdjustment && (
                  <div className="mt-2">
                    <div className="font-medium">Counterparty Adjustment Reason:</div>
                    <div className="text-sm">{modifiedData.rwaAdjustment.reason || "No reason provided"}</div>
                  </div>
                )}

                {modifiedData.portfolioRwaAdjustment && (
                  <div className="mt-2">
                    <div className="font-medium">Portfolio Adjustment Reason:</div>
                    <div className="text-sm">{modifiedData.portfolioRwaAdjustment.reason || "No reason provided"}</div>
                  </div>
                )}

                <div className="mt-3">
                  <Button variant="outline" size="sm" onClick={onClose} className="mr-2">
                    Close
                  </Button>
                  {modifiedData.rwaAdjustment && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        onSave({ ...modifiedData, rwaAdjustment: undefined }, module)
                        onClose()
                      }}
                    >
                      Remove Counterparty Adjustment
                    </Button>
                  )}
                  {modifiedData.portfolioRwaAdjustment && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        onSave({ ...modifiedData, portfolioRwaAdjustment: undefined }, module)
                        onClose()
                      }}
                      className="ml-2"
                    >
                      Remove Portfolio Adjustment
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-muted-foreground">No adjustments have been applied to this counterparty.</div>
            )}
          </div>
        )}

        <div className="flex justify-end space-x-2 mt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={saveChanges} disabled={Object.keys(editedInputs).length === 0}>
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
