"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ModuleDocumentation } from "@/components/module-documentation"
import { getModuleDescription } from "@/lib/module-descriptions"
import { getModuleDetails, type ModuleType } from "@/lib/module-details"
import { formatNumber } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Info, X, CodeIcon, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { getModuleCode } from "@/lib/module-code"
import { Code } from "@/components/ui/code"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { calculateRWA } from "@/lib/rwa-calculator"
import { calculateTtcPd } from "@/lib/ttc-pd-calculator"

// Define a helper function to get all unique values for a specific field across all counterparties
import { getAllCounterparties } from "@/lib/data-generator"

interface ModuleDetailProps {
  moduleId: string
  onClose: () => void
  counterpartyData: any
  onUpdateCounterparty: (updatedData: any) => void
}

export function ModuleDetail({ moduleId, onClose, counterpartyData, onUpdateCounterparty }: ModuleDetailProps) {
  const moduleDetails = getModuleDetails(moduleId, counterpartyData)
  const moduleDescription = getModuleDescription(moduleId)
  const moduleCode = getModuleCode(moduleId)
  const [editMode, setEditMode] = useState(false)
  const [editValues, setEditValues] = useState<Record<string, any>>({})
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [dropdownOptions, setDropdownOptions] = useState<Record<string, string[]>>({})
  const [previewResults, setPreviewResults] = useState<any>(null)

  // Get all unique values for dropdown fields
  useEffect(() => {
    const allCounterparties = getAllCounterparties()
    const options: Record<string, string[]> = {}

    // Define fields that should use dropdowns
    const dropdownFields = ["industry", "region", "isFinancial", "isLargeFinancial", "isRegulated"]

    // Collect unique values for each field
    dropdownFields.forEach((field) => {
      const uniqueValues = [
        ...new Set(allCounterparties.map((c) => c[field]).filter((val) => val !== undefined && val !== null)),
      ]

      // For boolean fields, ensure we have both true and false options
      if (typeof uniqueValues[0] === "boolean") {
        options[field] = ["true", "false"]
      } else {
        options[field] = uniqueValues.map(String)
      }
    })

    setDropdownOptions(options)
  }, [])

  // Calculate preview results when edit values change
  useEffect(() => {
    if (Object.keys(editValues).length > 0) {
      // Create a temporary counterparty with the edited values
      const tempCounterparty = { ...counterpartyData, ...convertEditValues(editValues) }

      // Recalculate TTC PD if needed
      if (
        editValues.pd !== undefined ||
        editValues.macroeconomicIndex !== undefined ||
        editValues.longTermAverage !== undefined ||
        editValues.cyclicality !== undefined
      ) {
        const ttcInputs = {
          pointInTimePd: tempCounterparty.pd,
          macroeconomicIndex: tempCounterparty.macroeconomicIndex,
          longTermAverage: tempCounterparty.longTermAverage,
          cyclicality: tempCounterparty.cyclicality,
        }

        tempCounterparty.ttcPd = calculateTtcPd(ttcInputs)
      }

      // Calculate RWA with the updated values
      const results = calculateRWA(tempCounterparty)
      setPreviewResults(results)
    } else {
      setPreviewResults(null)
    }
  }, [editValues, counterpartyData])

  // Helper function to convert edit values to appropriate types
  const convertEditValues = (values: Record<string, any>): Record<string, any> => {
    const converted: Record<string, any> = {}

    Object.entries(values).forEach(([key, value]) => {
      if (value === "true") {
        converted[key] = true
      } else if (value === "false") {
        converted[key] = false
      } else {
        // Try to convert to number if appropriate
        const numValue = Number.parseFloat(value as string)
        converted[key] = isNaN(numValue) ? value : numValue
      }
    })

    return converted
  }

  if (!moduleDetails) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Module Details Not Available</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <p>Details for this module are not available.</p>
        </CardContent>
      </Card>
    )
  }

  const { type = "unknown", inputs = [], outputs = [], adjustments = [] } = moduleDetails || {}

  // Extract input and output values from moduleDetails
  const inputValues: Record<string, any> = {}
  const outputValues: Record<string, any> = {}

  // Process inputs from moduleDetails
  if (moduleDetails.inputs) {
    moduleDetails.inputs.forEach((input) => {
      if (typeof input === "object" && input !== null && "name" in input && "value" in input) {
        inputValues[input.name] = input.value
      }
    })
  }

  // Process outputs from moduleDetails
  if (moduleDetails.outputs) {
    moduleDetails.outputs.forEach((output) => {
      if (typeof output === "object" && output !== null && "name" in output && "value" in output) {
        outputValues[output.name] = output.value
      }
    })
  }

  const handleEditToggle = () => {
    if (editMode) {
      // Apply changes
      const updatedData = { ...counterpartyData, ...convertEditValues(editValues) }

      // Recalculate TTC PD if needed
      if (
        editValues.pd !== undefined ||
        editValues.macroeconomicIndex !== undefined ||
        editValues.longTermAverage !== undefined ||
        editValues.cyclicality !== undefined
      ) {
        const ttcInputs = {
          pointInTimePd: updatedData.pd,
          macroeconomicIndex: updatedData.macroeconomicIndex,
          longTermAverage: updatedData.longTermAverage,
          cyclicality: updatedData.cyclicality,
        }

        updatedData.ttcPd = calculateTtcPd(ttcInputs)
      }

      onUpdateCounterparty(updatedData)
      setEditValues({})
      setPreviewResults(null)
    }
    setEditMode(!editMode)
  }

  const handleInputChange = (key: string, value: string) => {
    setEditValues((prev) => ({ ...prev, [key]: value }))
  }

  const handleReset = () => {
    // Reset adjustments for this module
    const updatedData = { ...counterpartyData }
    if (adjustments) {
      adjustments.forEach((adjustment) => {
        if (updatedData[adjustment]) {
          delete updatedData[adjustment]
        }
      })
    }
    onUpdateCounterparty(updatedData)
    setShowResetConfirm(false)
  }

  const handleResetToDefault = () => {
    // Reset all edit values
    setEditValues({})
    setPreviewResults(null)
  }

  // Helper function to determine if a field should use a dropdown
  const shouldUseDropdown = (fieldName: string): boolean => {
    // Check if we have dropdown options for this field
    return Object.keys(dropdownOptions).includes(fieldName.toLowerCase())
  }

  // Helper function to determine if a field is a boolean
  const isBooleanField = (fieldName: string): boolean => {
    const lowerFieldName = fieldName.toLowerCase()
    return (
      lowerFieldName.startsWith("is") ||
      lowerFieldName === "use" ||
      lowerFieldName.includes("enabled") ||
      lowerFieldName.includes("active")
    )
  }

  // Helper function to determine if a field is numerical
  const isNumericalField = (fieldName: string, value: any): boolean => {
    // Check if the value is already a number
    if (typeof value === "number") return true

    // Check field name patterns that suggest numerical values
    const lowerFieldName = fieldName.toLowerCase()
    return (
      lowerFieldName.includes("pd") ||
      lowerFieldName.includes("lgd") ||
      lowerFieldName.includes("ead") ||
      lowerFieldName.includes("rwa") ||
      lowerFieldName.includes("amount") ||
      lowerFieldName.includes("value") ||
      lowerFieldName.includes("rate") ||
      lowerFieldName.includes("index") ||
      lowerFieldName.includes("multiplier") ||
      lowerFieldName.includes("factor") ||
      lowerFieldName.includes("maturity") ||
      lowerFieldName.includes("correlation")
    )
  }

  const formatValue = (key: string, value: any): string => {
    if (value === null || value === undefined) return "N/A"

    // Handle objects by returning a string representation
    if (typeof value === "object") {
      // If it's an object with name, value, description properties
      if (value.name !== undefined && value.value !== undefined) {
        return formatValue(key, value.value)
      }
      return JSON.stringify(value)
    }

    // Format boolean values
    if (typeof value === "boolean") {
      return value ? "Yes" : "No"
    }

    if (typeof value === "number") {
      // Format percentages
      if (
        (key.toLowerCase().includes("pd") ||
          key.toLowerCase().includes("lgd") ||
          key.toLowerCase().includes("correlation") ||
          key.toLowerCase().includes("multiplier")) &&
        value >= 0 &&
        value <= 1
      ) {
        return `${(value * 100).toFixed(2)}%`
      }

      // Format currency values
      if (
        key.toLowerCase().includes("ead") ||
        key.toLowerCase().includes("rwa") ||
        key.toLowerCase().includes("exposure") ||
        key.toLowerCase().includes("amount")
      ) {
        return formatNumber(value)
      }

      // Format other numbers
      return value.toFixed(4)
    }

    return String(value)
  }

  // Prepare data for ModuleDocumentation
  const docInputs: Record<string, any> = {}
  const docOutputs: Record<string, any> = {}

  // Convert input objects to simple key-value pairs
  if (moduleDetails.inputs) {
    moduleDetails.inputs.forEach((input) => {
      if (typeof input === "object" && input !== null && "name" in input) {
        docInputs[input.name] = input.rawValue !== undefined ? input.rawValue : input.value
      }
    })
  }

  // Convert output objects to simple key-value pairs
  if (moduleDetails.outputs) {
    moduleDetails.outputs.forEach((output) => {
      if (typeof output === "object" && output !== null && "name" in output) {
        docOutputs[output.name] = output.rawValue !== undefined ? output.rawValue : output.value
      }
    })
  }

  // Helper function to get the field key from the input name
  const getFieldKey = (inputName: string): string => {
    // Convert input name to a likely field key
    return inputName
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[^a-z0-9]/g, "")
  }

  // Helper function to find the actual field key in counterpartyData
  const findActualFieldKey = (inputName: string): string | null => {
    const possibleKey = getFieldKey(inputName)

    // Check if the key exists directly
    if (possibleKey in counterpartyData) {
      return possibleKey
    }

    // Check for similar keys
    for (const key in counterpartyData) {
      if (key.toLowerCase() === possibleKey) {
        return key
      }
    }

    // Special cases
    if (inputName === "Industry") return "industry"
    if (inputName === "Region") return "region"
    if (inputName === "Is Financial Institution") return "isFinancial"
    if (inputName === "Is Large Financial") return "isLargeFinancial"
    if (inputName === "Is Regulated") return "isRegulated"
    if (inputName === "PD") return "pd"
    if (inputName === "LGD") return "lgd"
    if (inputName === "EAD") return "ead"
    if (inputName === "Maturity") return "maturity"
    if (inputName === "Point-in-Time PD") return "pd"
    if (inputName === "Economic Index") return "macroeconomicIndex"
    if (inputName === "Long-Term Average Default Rate") return "longTermAverage"
    if (inputName === "Cyclicality") return "cyclicality"
    if (inputName === "TTC PD") return "ttcPd"

    return null
  }

  // Get the appropriate results to display (preview or actual)
  const displayResults = previewResults || moduleDetails.results

  return (
    <Card className="w-full max-w-4xl mx-auto border-0 shadow-none">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{moduleDescription.title || `${moduleId.toUpperCase()} Module`}</CardTitle>
          <CardDescription>{moduleDescription.description || "No description available"}</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={type === "input" ? "outline" : type === "calculation" ? "secondary" : "default"}>
            {type ? `${type.charAt(0).toUpperCase()}${type.slice(1)} Module` : "Module"}
          </Badge>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Module Details</TabsTrigger>
            <TabsTrigger value="documentation">Documentation</TabsTrigger>
            <TabsTrigger value="code">Code</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 mt-4">
            {showResetConfirm ? (
              <Alert variant="destructive" className="mb-4">
                <AlertTitle>Reset Module Adjustments</AlertTitle>
                <AlertDescription>
                  This will remove all adjustments for this module and restore default values. Are you sure?
                  <div className="flex gap-2 mt-2">
                    <Button variant="destructive" size="sm" onClick={handleReset}>
                      Yes, Reset
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setShowResetConfirm(false)}>
                      Cancel
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            ) : null}

            <div className="flex justify-between mb-4">
              <h3 className="text-lg font-medium">Module Parameters</h3>
              <div className="flex gap-2">
                {adjustments && adjustments.length > 0 && (
                  <Button variant="outline" size="sm" onClick={() => setShowResetConfirm(true)}>
                    Reset to Default
                  </Button>
                )}
                {editMode && Object.keys(editValues).length > 0 && (
                  <Button variant="outline" size="sm" onClick={handleResetToDefault}>
                    <RotateCcw className="mr-2 h-3.5 w-3.5" />
                    Cancel Changes
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={handleEditToggle}>
                  {editMode ? "Save Changes" : "Edit Values"}
                </Button>
              </div>
            </div>

            {/* Preview Alert */}
            {editMode && previewResults && (
              <Alert className="mb-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                <AlertTitle className="text-blue-800 dark:text-blue-300">Preview Mode</AlertTitle>
                <AlertDescription className="text-blue-700 dark:text-blue-400">
                  These are preview values based on your changes. Click "Save Changes" to apply them.
                </AlertDescription>
              </Alert>
            )}

            {/* Input Parameters */}
            {moduleDetails.inputs && moduleDetails.inputs.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Input Parameters</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {moduleDetails.inputs.map((input, index) => {
                    if (typeof input !== "object" || input === null || !("name" in input)) {
                      return null
                    }

                    const inputName = input.name
                    const inputValue = input.value
                    const inputDesc = input.description || ""
                    const fieldKey = findActualFieldKey(inputName)
                    const rawValue = fieldKey ? counterpartyData[fieldKey] : undefined
                    const isBoolean = typeof rawValue === "boolean" || isBooleanField(inputName)
                    const isNumerical = isNumericalField(inputName, rawValue)
                    const hasDropdown = shouldUseDropdown(inputName) || isBoolean
                    const dropdownKey = Object.keys(dropdownOptions).find(
                      (key) => key.toLowerCase() === inputName.toLowerCase(),
                    )
                    const options = dropdownKey ? dropdownOptions[dropdownKey] : isBoolean ? ["true", "false"] : []

                    return (
                      <div key={index} className="space-y-1">
                        <Label htmlFor={`input-${index}`}>{inputName}</Label>
                        {editMode ? (
                          <>
                            {hasDropdown ? (
                              isBoolean ? (
                                <div className="flex items-center space-x-2">
                                  <Switch
                                    id={`input-${index}`}
                                    checked={
                                      editValues[fieldKey] !== undefined
                                        ? editValues[fieldKey] === true || editValues[fieldKey] === "true"
                                        : rawValue === true
                                    }
                                    onCheckedChange={(checked) =>
                                      handleInputChange(fieldKey || inputName, checked ? "true" : "false")
                                    }
                                  />
                                  <Label htmlFor={`input-${index}`}>
                                    {editValues[fieldKey] !== undefined
                                      ? editValues[fieldKey] === true || editValues[fieldKey] === "true"
                                        ? "Yes"
                                        : "No"
                                      : rawValue === true
                                        ? "Yes"
                                        : "No"}
                                  </Label>
                                </div>
                              ) : (
                                <Select
                                  value={
                                    editValues[fieldKey] !== undefined ? String(editValues[fieldKey]) : String(rawValue)
                                  }
                                  onValueChange={(value) => handleInputChange(fieldKey || inputName, value)}
                                >
                                  <SelectTrigger id={`input-${index}`}>
                                    <SelectValue placeholder="Select value" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {options.map((option) => (
                                      <SelectItem key={option} value={option}>
                                        {option}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )
                            ) : (
                              <Input
                                id={`input-${index}`}
                                type={isNumerical ? "number" : "text"}
                                step={isNumerical ? "0.0001" : undefined}
                                min={isNumerical ? "0" : undefined}
                                value={
                                  editValues[fieldKey] !== undefined
                                    ? editValues[fieldKey]
                                    : rawValue !== undefined
                                      ? rawValue
                                      : inputValue || ""
                                }
                                onChange={(e) => {
                                  const value = isNumerical ? Number.parseFloat(e.target.value) : e.target.value
                                  handleInputChange(fieldKey || inputName, e.target.value)
                                }}
                              />
                            )}
                          </>
                        ) : (
                          <div className="p-2 border rounded-md bg-muted">
                            {formatValue(inputName, rawValue !== undefined ? rawValue : inputValue)}
                          </div>
                        )}
                        {inputDesc && <p className="text-xs text-muted-foreground">{inputDesc}</p>}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Output Parameters */}
            {moduleDetails.outputs && moduleDetails.outputs.length > 0 && (
              <div className="space-y-2 mt-6">
                <h4 className="font-medium">Output Parameters</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {moduleDetails.outputs.map((output, index) => {
                    if (typeof output !== "object" || output === null || !("name" in output)) {
                      return null
                    }

                    const outputName = output.name
                    const outputValue = output.value
                    const outputDesc = output.description || ""
                    const isHighlighted = output.highlight === true

                    // Check if we have a preview value for this output
                    let displayValue = outputValue
                    if (previewResults && moduleId === "avc" && outputName === "AVC Multiplier") {
                      displayValue = previewResults.avcMultiplier
                    } else if (previewResults && moduleId === "correlation" && outputName === "Final Correlation") {
                      displayValue = previewResults.correlation
                    } else if (previewResults && moduleId === "correlation" && outputName === "Base Correlation") {
                      displayValue = previewResults.baseCorrelation
                    } else if (previewResults && moduleId === "maturity" && outputName === "Maturity Adjustment") {
                      displayValue = previewResults.maturityAdjustment
                    } else if (previewResults && moduleId === "rwa" && outputName === "Final RWA") {
                      displayValue = previewResults.rwa
                    } else if (previewResults && moduleId === "rwa" && outputName === "Capital Requirement (K)") {
                      displayValue = previewResults.k
                    }

                    return (
                      <div key={index} className="space-y-1">
                        <Label htmlFor={`output-${index}`}>{outputName}</Label>
                        <div
                          className={`p-2 border rounded-md ${
                            isHighlighted
                              ? "bg-purple-100 dark:bg-purple-900/30"
                              : previewResults
                                ? "bg-blue-50 dark:bg-blue-900/20"
                                : "bg-muted"
                          }`}
                        >
                          {formatValue(outputName, displayValue)}
                        </div>
                        {outputDesc && <p className="text-xs text-muted-foreground">{outputDesc}</p>}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Adjustments */}
            {adjustments && adjustments.length > 0 && (
              <div className="space-y-2 mt-6">
                <h4 className="font-medium">Adjustments</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {adjustments.map((adjustment) => (
                    <div key={adjustment} className="space-y-1">
                      <Label htmlFor={adjustment}>{adjustment}</Label>
                      {editMode ? (
                        <Input
                          id={adjustment}
                          value={
                            editValues[adjustment] !== undefined
                              ? editValues[adjustment]
                              : counterpartyData[adjustment] || ""
                          }
                          onChange={(e) => handleInputChange(adjustment, e.target.value)}
                        />
                      ) : (
                        <div className="p-2 border rounded-md bg-muted">
                          {formatValue(adjustment, counterpartyData[adjustment] || "No adjustment")}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Formula */}
            {moduleDescription.formula && (
              <div className="mt-6 p-4 bg-muted rounded-md">
                <h4 className="font-medium flex items-center gap-2">
                  <Info size={18} />
                  Formula
                </h4>
                <div className="mt-2 font-mono text-sm">
                  {typeof moduleDescription.formula === "string"
                    ? moduleDescription.formula
                    : JSON.stringify(moduleDescription.formula)}
                </div>
              </div>
            )}

            {/* Notes */}
            {moduleDescription.notes && (
              <div className="mt-4 p-4 bg-muted/50 rounded-md">
                <h4 className="font-medium">Notes</h4>
                <p className="mt-1 text-sm">{moduleDescription.notes}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="documentation">
            <ModuleDocumentation
              moduleId={moduleId}
              moduleType={type as ModuleType}
              inputs={docInputs}
              outputs={docOutputs}
            />
          </TabsContent>

          <TabsContent value="code" className="mt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Module Implementation</h3>
                <Badge variant="outline" className="font-mono">
                  {moduleId}.ts
                </Badge>
              </div>

              <div className="relative max-h-[50vh] overflow-auto">
                <Code language="typescript" code={moduleCode} />
              </div>

              <div className="mt-4 p-4 bg-muted/50 rounded-md">
                <div className="flex items-center gap-2 mb-2">
                  <CodeIcon size={16} />
                  <h4 className="font-medium">Code Notes</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  This is the actual implementation code for the {moduleDescription.title || moduleId} module. The code
                  follows the mathematical formulas and regulatory guidelines described in the documentation.
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
