"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ModuleDocumentation } from "@/components/module-documentation"
import { getModuleDescription } from "@/lib/module-descriptions"
import { getModuleDetails, type ModuleType } from "@/lib/module-details"
import { formatNumber } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Info, X, CodeIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { getModuleCode } from "@/lib/module-code"
import { Code } from "@/components/ui/code"

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
      const updatedData = { ...counterpartyData }
      Object.entries(editValues).forEach(([key, value]) => {
        // Convert string values to numbers where appropriate
        const numValue = Number.parseFloat(value as string)
        updatedData[key] = isNaN(numValue) ? value : numValue
      })
      onUpdateCounterparty(updatedData)
      setEditValues({})
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
                <Button variant="outline" size="sm" onClick={handleEditToggle}>
                  {editMode ? "Save Changes" : "Edit Values"}
                </Button>
              </div>
            </div>

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

                    return (
                      <div key={index} className="space-y-1">
                        <Label htmlFor={`input-${index}`}>{inputName}</Label>
                        {editMode ? (
                          <Input
                            id={`input-${index}`}
                            value={editValues[inputName] !== undefined ? editValues[inputName] : inputValue || ""}
                            onChange={(e) => handleInputChange(inputName, e.target.value)}
                          />
                        ) : (
                          <div className="p-2 border rounded-md bg-muted">{formatValue(inputName, inputValue)}</div>
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

                    return (
                      <div key={index} className="space-y-1">
                        <Label htmlFor={`output-${index}`}>{outputName}</Label>
                        <div
                          className={`p-2 border rounded-md ${isHighlighted ? "bg-purple-100 dark:bg-purple-900/30" : "bg-muted"}`}
                        >
                          {formatValue(outputName, outputValue)}
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
