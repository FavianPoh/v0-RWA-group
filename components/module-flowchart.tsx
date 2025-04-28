"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Info, Edit } from "lucide-react"
import { getModuleExplanation } from "@/lib/module-explanations"

// Helper function to format numbers consistently
function formatNumber(value) {
  if (value === undefined || value === null || isNaN(value)) return "N/A"
  return typeof value === "number" ? Math.round(value).toLocaleString() : value.toString()
}

// Helper function to format percentages consistently
function formatPercentage(value) {
  if (value === undefined || value === null || isNaN(value)) return "N/A"
  return typeof value === "number" ? `${(value * 100).toFixed(4)}%` : value.toString()
}

// Helper function to format decimal values with more precision
function formatDecimal(value, decimals = 4) {
  if (value === undefined || value === null || isNaN(value)) return "N/A"
  return typeof value === "number" ? value.toFixed(decimals) : value.toString()
}

export function ModuleFlowchart({
  counterparty,
  rwaResults,
  onSelectModule,
  onCreditReview,
  modifiedModules = [],
  onUpdateCounterparty,
}) {
  const [hoveredModule, setHoveredModule] = useState(null)
  const [moduleExplanation, setModuleExplanation] = useState(null)

  // Get explanation when hovering over a module
  useEffect(() => {
    if (hoveredModule) {
      const explanation = getModuleExplanation(hoveredModule)
      setModuleExplanation(explanation)
    } else {
      setModuleExplanation(null)
    }
  }, [hoveredModule])

  // Extract values from results and ensure they're valid numbers
  const {
    pd = 0.01,
    ttcPd = 0.01,
    lgd = 0.45,
    ead = 1000000,
    baseCorrelation = 0.12,
    avcMultiplier = 1,
    correlation = 0.12,
    maturityAdjustment = 1,
    k = 0.01,
    rwa = 100000,
    originalRwa,
    hasAdjustment,
    rwaDensity = 0.1,
  } = rwaResults || {}

  // Get the actual PIT PD and TTC PD values from the counterparty data
  const pitPd = counterparty?.pd || pd
  const actualTtcPd = counterparty?.ttcPd || ttcPd

  // Ensure all values are valid numbers
  const safeRwa = isNaN(rwa) ? 0 : rwa
  const safeOriginalRwa = isNaN(originalRwa) ? safeRwa : originalRwa

  // Determine if there's an adjustment and calculate the adjustment amount
  const hasRwaAdjustment =
    hasAdjustment || (safeOriginalRwa !== undefined && Math.abs(safeRwa - safeOriginalRwa) > 0.01)
  const adjustmentAmount = hasRwaAdjustment && safeOriginalRwa ? safeRwa - safeOriginalRwa : 0
  const adjustmentPercentage =
    hasRwaAdjustment && safeOriginalRwa && safeOriginalRwa !== 0 ? (safeRwa / safeOriginalRwa - 1) * 100 : 0

  // Function to render a module box
  const renderModule = (id, title, value, format = "number", isInput = false, isOutput = false, isModified = false) => {
    // Ensure value is a valid number
    const safeValue = isNaN(value) ? 0 : value

    // Format the value based on the specified format and module ID
    let formattedValue

    if (id === "avc" || id === "maturity") {
      // Use more decimal places for AVC and Maturity modules
      formattedValue = formatDecimal(safeValue, 4)
    } else if (format === "percentage") {
      formattedValue = formatPercentage(safeValue)
    } else if (format === "currency") {
      formattedValue = `$${formatNumber(safeValue)}`
    } else {
      formattedValue = formatNumber(safeValue)
    }

    return (
      <div
        className={`relative p-4 border rounded-lg shadow-sm transition-all ${
          hoveredModule === id ? "bg-muted/80 shadow-md" : "bg-card"
        } ${isInput ? "border-l-4 border-l-blue-500" : ""} ${isOutput ? "border-l-4 border-l-green-500" : ""} ${
          isModified ? "border-orange-500 border-2" : ""
        }`}
        onMouseEnter={() => setHoveredModule(id)}
        onMouseLeave={() => setHoveredModule(null)}
        onClick={() => onSelectModule(id)}
      >
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-medium text-sm">{title}</h3>
          {isModified && (
            <Badge variant="outline" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
              Modified
            </Badge>
          )}
        </div>
        <div className="text-2xl font-bold">{formattedValue}</div>
        {isInput && <div className="absolute top-0 right-0 p-1 text-blue-500">Input</div>}
        {isOutput && <div className="absolute top-0 right-0 p-1 text-green-500">Output</div>}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Input Modules */}
        <div className="space-y-4">
          {renderModule("pd", "PIT PD Module", pitPd, "percentage", true, false, modifiedModules.includes("pd"))}
          {renderModule(
            "ttcpd",
            "TTC PD Module",
            actualTtcPd,
            "percentage",
            true,
            false,
            modifiedModules.includes("ttcpd"),
          )}
          {renderModule("lgd", "LGD Module", lgd, "percentage", true, false, modifiedModules.includes("lgd"))}
          {renderModule("ead", "EAD Module", ead, "currency", true, false, modifiedModules.includes("ead"))}
        </div>

        {/* Calculation Modules */}
        <div className="space-y-4">
          {renderModule(
            "correlation",
            "Correlation Module",
            correlation,
            "percentage",
            false,
            false,
            modifiedModules.includes("correlation"),
          )}
          {renderModule("avc", "AVC Module", avcMultiplier, "number", false, false, modifiedModules.includes("avc"))}
          {renderModule(
            "maturity",
            "Maturity Module",
            maturityAdjustment,
            "number",
            false,
            false,
            modifiedModules.includes("maturity"),
          )}
          {renderModule(
            "capital",
            "Capital Requirement",
            k,
            "percentage",
            false,
            false,
            modifiedModules.includes("capital"),
          )}
        </div>

        {/* Output Modules */}
        <div className="space-y-4">
          {renderModule("rwa", "RWA Module", safeRwa, "currency", false, true, modifiedModules.includes("rwa"))}
          {renderModule(
            "density",
            "RWA Density",
            rwaDensity,
            "percentage",
            false,
            true,
            modifiedModules.includes("density"),
          )}

          {/* RWA Adjustment Information */}
          {hasRwaAdjustment && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-sm">RWA Adjustment</h3>
                  <Badge
                    variant="outline"
                    className={`${
                      adjustmentAmount >= 0
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                    }`}
                  >
                    {adjustmentAmount >= 0 ? "Increase" : "Decrease"}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Original RWA:</span>
                    <span>${formatNumber(safeOriginalRwa)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Adjusted RWA:</span>
                    <span>${formatNumber(safeRwa)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-medium">
                    <span>Adjustment:</span>
                    <span
                      className={`${
                        adjustmentAmount >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {adjustmentAmount >= 0 ? "+" : ""}${formatNumber(adjustmentAmount)} (
                      {adjustmentPercentage >= 0 ? "+" : ""}
                      {adjustmentPercentage.toFixed(2)}%)
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Module Explanation */}
      {moduleExplanation && (
        <div className="p-4 bg-muted/50 rounded-lg border">
          <div className="flex items-center gap-2 mb-2">
            <Info className="h-4 w-4" />
            <h3 className="font-medium">{hoveredModule ? hoveredModule.toUpperCase() : ""} Module</h3>
          </div>
          <p className="text-sm">{moduleExplanation.description || "No description available."}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end space-x-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={onCreditReview}>
                <Edit className="mr-2 h-4 w-4" />
                Credit Review
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Review and update the credit rating and PD for this counterparty</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  )
}
