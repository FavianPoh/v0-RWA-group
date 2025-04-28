"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { calculateRWA } from "@/lib/rwa-calculator"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Trash2 } from "lucide-react"

export function RWAAdjustmentPanel({ counterparty, onSave, onRemove }) {
  const baselineRWA = calculateRWA(counterparty).rwa

  // Initialize state from existing adjustment if present
  const existingAdjustment = counterparty.rwaAdjustment

  const [adjustmentType, setAdjustmentType] = useState(existingAdjustment?.type || "percentage")

  // Initialize adjustment value with a safe default
  const getInitialAdjustmentValue = () => {
    if (!existingAdjustment) return ""

    try {
      const value =
        adjustmentType === "percentage"
          ? (existingAdjustment.adjustedRWA / baselineRWA - 1) * 100
          : existingAdjustment.adjustedRWA - baselineRWA

      // Check if value is NaN or infinite
      if (isNaN(value) || !isFinite(value)) return ""

      return value
    } catch (error) {
      console.error("Error calculating initial adjustment value:", error)
      return ""
    }
  }

  const [adjustmentValue, setAdjustmentValue] = useState(getInitialAdjustmentValue())
  const [reason, setReason] = useState(existingAdjustment?.reason || "")

  // Update adjustment value when type changes
  useEffect(() => {
    if (existingAdjustment) {
      try {
        const newValue =
          adjustmentType === "percentage"
            ? (existingAdjustment.adjustedRWA / baselineRWA - 1) * 100
            : existingAdjustment.adjustedRWA - baselineRWA

        // Check if value is NaN or infinite
        if (isNaN(newValue) || !isFinite(newValue)) {
          setAdjustmentValue("")
        } else {
          setAdjustmentValue(newValue)
        }
      } catch (error) {
        console.error("Error updating adjustment value:", error)
        setAdjustmentValue("")
      }
    }
  }, [adjustmentType, existingAdjustment, baselineRWA])

  // Handle adjustment value change
  const handleAdjustmentValueChange = (e) => {
    const inputValue = e.target.value

    // Allow empty string
    if (inputValue === "") {
      setAdjustmentValue("")
      return
    }

    // Try to parse as number
    const numValue = Number.parseFloat(inputValue)

    // Only update if it's a valid number
    if (!isNaN(numValue) && isFinite(numValue)) {
      setAdjustmentValue(numValue)
    }
  }

  // Calculate adjusted RWA based on inputs
  const calculateAdjustedRWA = () => {
    if (adjustmentValue === "") return baselineRWA

    const numValue = Number.parseFloat(adjustmentValue)

    if (isNaN(numValue) || !isFinite(numValue)) return baselineRWA

    if (adjustmentType === "percentage") {
      return baselineRWA * (1 + numValue / 100)
    } else {
      return baselineRWA + numValue
    }
  }

  const adjustedRWA = calculateAdjustedRWA()

  // Calculate changes safely
  const calculatePercentageChange = () => {
    if (baselineRWA === 0) return 0
    return (adjustedRWA / baselineRWA - 1) * 100
  }

  const percentageChange = calculatePercentageChange()
  const absoluteChange = adjustedRWA - baselineRWA

  const handleSave = () => {
    // Validate adjustment value
    if (adjustmentValue === "" || isNaN(Number.parseFloat(adjustmentValue))) {
      return
    }

    const numValue = Number.parseFloat(adjustmentValue)

    // Create the appropriate adjustment structure based on type
    const rwaAdjustment = {
      type: adjustmentType,
      value: numValue,
      adjustedRWA,
      reason,
      timestamp: new Date().toISOString(),
    }

    // Add type-specific properties
    if (adjustmentType === "percentage") {
      rwaAdjustment.multiplier = 1 + numValue / 100
    } else if (adjustmentType === "absolute") {
      rwaAdjustment.adjustment = numValue
    }

    console.log("Saving RWA adjustment:", rwaAdjustment)
    onSave({ rwaAdjustment })
  }

  // Format number safely
  const safeFormatNumber = (value) => {
    if (value === undefined || value === null || isNaN(value) || !isFinite(value)) {
      return "0"
    }
    return Math.round(value).toLocaleString()
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Baseline RWA</h3>
          <p className="text-sm text-muted-foreground">Before any adjustments</p>
        </div>
        <div className="text-2xl font-bold">${safeFormatNumber(baselineRWA)}</div>
      </div>

      <Separator />

      <div>
        <Label className="text-base">Adjustment Type</Label>
        <RadioGroup value={adjustmentType} onValueChange={setAdjustmentType} className="flex space-x-4 mt-2">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="percentage" id="percentage" />
            <Label htmlFor="percentage">Percentage</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="absolute" id="absolute" />
            <Label htmlFor="absolute">Absolute</Label>
          </div>
        </RadioGroup>
      </div>

      <div>
        <Label htmlFor="adjustment-value" className="text-base">
          {adjustmentType === "percentage" ? "Adjustment Percentage" : "Adjustment Amount"}
        </Label>
        <div className="flex items-center mt-1">
          {adjustmentType === "percentage" && <span className="mr-2">%</span>}
          {adjustmentType === "absolute" && <span className="mr-2">$</span>}
          <Input
            id="adjustment-value"
            value={adjustmentValue === "" ? "" : adjustmentValue.toString()}
            onChange={handleAdjustmentValueChange}
            placeholder={adjustmentType === "percentage" ? "e.g. 10 for +10%" : "e.g. 1000000"}
            className="flex-1"
          />
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {adjustmentType === "percentage"
            ? "Positive values increase RWA, negative values decrease RWA"
            : "Enter the absolute amount to add or subtract from the baseline RWA"}
        </p>
      </div>

      <div>
        <Label htmlFor="reason" className="text-base">
          Adjustment Reason
        </Label>
        <Textarea
          id="reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Provide a reason for this adjustment..."
          className="mt-1"
          rows={3}
        />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Adjustment Preview</CardTitle>
          <CardDescription>Impact of the adjustment on RWA</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium">Baseline RWA</div>
              <div className="text-xl">${safeFormatNumber(baselineRWA)}</div>
            </div>
            <div>
              <div className="text-sm font-medium">Adjusted RWA</div>
              <div className="text-xl">${safeFormatNumber(adjustedRWA)}</div>
            </div>
            <div>
              <div className="text-sm font-medium">Absolute Change</div>
              <div className="flex items-center">
                <span className={absoluteChange >= 0 ? "text-green-600" : "text-red-600"}>
                  {absoluteChange >= 0 ? "+" : ""}${safeFormatNumber(Math.abs(absoluteChange))}
                </span>
              </div>
            </div>
            <div>
              <div className="text-sm font-medium">Percentage Change</div>
              <div className="flex items-center">
                <Badge
                  variant="outline"
                  className={`${
                    percentageChange >= 0
                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                      : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                  }`}
                >
                  {percentageChange >= 0 ? "+" : ""}
                  {isNaN(percentageChange) ? "0.00" : percentageChange.toFixed(2)}%
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        {onRemove && (
          <Button variant="destructive" onClick={onRemove}>
            <Trash2 className="mr-2 h-4 w-4" />
            Remove Adjustment
          </Button>
        )}
        <Button onClick={handleSave} className={onRemove ? "" : "ml-auto"}>
          Save Adjustment
        </Button>
      </div>
    </div>
  )
}
