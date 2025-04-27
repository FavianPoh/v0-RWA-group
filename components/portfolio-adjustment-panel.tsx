"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { calculateRWA } from "@/lib/rwa-calculator"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Trash2, InfoIcon as InfoCircle } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

// Format a number safely, returning a string and handling NaN/undefined
const safeFormatNumber = (value, options = {}) => {
  if (value === undefined || value === null || isNaN(value)) {
    return "0"
  }

  const defaultOptions = {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }

  const mergedOptions = { ...defaultOptions, ...options }

  return new Intl.NumberFormat("en-US", mergedOptions).format(value)
}

export function PortfolioAdjustmentPanel({ counterparties, onSave, onRemove }) {
  // Initialize state
  const [adjustmentType, setAdjustmentType] = useState("percentage")
  const [adjustmentValue, setAdjustmentValue] = useState("")
  const [distributionMethod, setDistributionMethod] = useState("proportional")
  const [reason, setReason] = useState("")
  const [selectedCounterparties, setSelectedCounterparties] = useState(counterparties.map((cp) => cp.id))

  // Calculate baseline RWA for all counterparties
  const counterpartyData = counterparties.map((cp) => {
    const result = calculateRWA(cp)
    const baselineRWA = result.rwa || 0 // Ensure we have a valid number

    // Check if this counterparty already has an adjustment
    const existingAdjustment = cp.portfolioRwaAdjustment

    return {
      id: cp.id,
      name: cp.name,
      industry: cp.industry,
      region: cp.region,
      baselineRWA,
      adjustedRWA: baselineRWA, // Will be updated when adjustment is applied
      absoluteChange: 0,
      percentageChange: 0,
      selected: selectedCounterparties.includes(cp.id),
      hasExistingAdjustment: !!existingAdjustment,
    }
  })

  // Calculate total baseline RWA for selected counterparties
  const totalBaselineRWA = counterpartyData.filter((cp) => cp.selected).reduce((sum, cp) => sum + cp.baselineRWA, 0)

  // Calculate adjusted RWA based on inputs
  const calculateAdjustedRWA = () => {
    if (adjustmentValue === "" || selectedCounterparties.length === 0) {
      return counterpartyData
    }

    const numValue = Number.parseFloat(adjustmentValue)

    if (isNaN(numValue)) {
      return counterpartyData
    }

    // Calculate the total adjustment amount
    let totalAdjustmentAmount = 0
    if (adjustmentType === "percentage") {
      const numValue = Number.parseFloat(adjustmentValue) || 0 // Add fallback
      // For percentage, we're calculating how much to add/subtract
      totalAdjustmentAmount = totalBaselineRWA * (numValue / 100)
    } else {
      // For absolute, this is the direct amount to add/subtract
      const numValue = Number.parseFloat(adjustmentValue) || 0 // Add fallback
      totalAdjustmentAmount = numValue
    }

    // Log the calculation for debugging
    console.log("Adjustment calculation:", {
      adjustmentType,
      adjustmentValue,
      totalBaselineRWA,
      totalAdjustmentAmount,
    })

    // Distribute the adjustment based on the selected method
    return counterpartyData.map((cp) => {
      if (!cp.selected) return cp

      let counterpartyAdjustment = 0

      switch (distributionMethod) {
        case "proportional":
          // Distribute proportionally to baseline RWA
          counterpartyAdjustment =
            totalBaselineRWA > 0 ? totalAdjustmentAmount * (cp.baselineRWA / totalBaselineRWA) : 0
          break
        case "equal":
          // Distribute equally among selected counterparties
          counterpartyAdjustment =
            selectedCounterparties.length > 0 ? totalAdjustmentAmount / selectedCounterparties.length : 0
          break
        case "risk-weighted":
          // Higher risk (higher RWA density) gets more adjustment
          // This is a simplified approach - could be refined further
          const selectedCPs = counterpartyData.filter((c) => c.selected)
          const totalRiskWeight = selectedCPs.reduce((sum, c) => sum + c.baselineRWA, 0)
          counterpartyAdjustment = totalRiskWeight > 0 ? totalAdjustmentAmount * (cp.baselineRWA / totalRiskWeight) : 0
          break
      }

      // Calculate the adjusted RWA based on the adjustment type
      let adjustedRWA = 0
      if (adjustmentType === "percentage") {
        // For percentage, apply the percentage change to the baseline
        const percentMultiplier = 1 + (Number.parseFloat(adjustmentValue) || 0) / 100
        adjustedRWA = cp.baselineRWA * percentMultiplier
      } else {
        // For absolute, distribute the absolute amount
        adjustedRWA = cp.baselineRWA + counterpartyAdjustment
      }

      const absoluteChange = adjustedRWA - cp.baselineRWA
      const percentageChange = cp.baselineRWA > 0 ? (absoluteChange / cp.baselineRWA) * 100 : 0

      // Log the adjustment for debugging
      console.log(`Counterparty ${cp.name} adjustment:`, {
        baselineRWA: cp.baselineRWA,
        adjustedRWA,
        absoluteChange,
        percentageChange,
        counterpartyAdjustment,
      })

      return {
        ...cp,
        adjustedRWA,
        absoluteChange,
        percentageChange,
      }
    })
  }

  const adjustedCounterpartyData = calculateAdjustedRWA()

  // Calculate totals for the adjusted data
  const totalAdjustedRWA = adjustedCounterpartyData
    .filter((cp) => cp.selected)
    .reduce((sum, cp) => sum + cp.adjustedRWA, 0)

  const totalAbsoluteChange = totalAdjustedRWA - totalBaselineRWA
  const totalPercentageChange = totalBaselineRWA > 0 ? (totalAbsoluteChange / totalBaselineRWA) * 100 : 0 // Add division by zero check

  const handleToggleCounterparty = (id) => {
    setSelectedCounterparties((prev) => {
      if (prev.includes(id)) {
        return prev.filter((cpId) => cpId !== id)
      } else {
        return [...prev, id]
      }
    })
  }

  const handleSave = () => {
    if (adjustmentValue === "" || isNaN(Number.parseFloat(adjustmentValue)) || selectedCounterparties.length === 0) {
      return
    }

    // Create the portfolio adjustment object
    const portfolioAdjustment = {
      type: adjustmentType === "percentage" ? "multiplicative" : "additive",
      value: Number.parseFloat(adjustmentValue),
      distributionMethod,
      reason,
      timestamp: new Date().toISOString(),
      affectedCounterparties: selectedCounterparties.length,
      totalBaselineRWA,
      totalAdjustedRWA,
      totalAbsoluteChange,
      totalPercentageChange,
    }

    // Create counterparty-specific adjustments
    const counterpartyAdjustments = adjustedCounterpartyData
      .filter((cp) => cp.selected)
      .map((cp) => {
        // Create the appropriate adjustment structure based on type
        let adjustmentData = {}

        if (adjustmentType === "percentage") {
          // For percentage adjustments, store as multiplicative with a multiplier
          const multiplier = 1 + Number.parseFloat(adjustmentValue) / 100
          adjustmentData = {
            type: "multiplicative",
            multiplier: multiplier,
            adjustment: cp.absoluteChange,
            adjustedRWA: cp.adjustedRWA,
          }
        } else {
          // For absolute adjustments, store as additive with the adjustment amount
          adjustmentData = {
            type: "additive",
            adjustment: cp.absoluteChange,
            adjustedRWA: cp.adjustedRWA,
          }
        }

        return {
          id: cp.id,
          baselineRWA: cp.baselineRWA,
          ...adjustmentData,
          percentageChange: cp.percentageChange,
        }
      })

    // Log the adjustment data for debugging
    console.log("Portfolio Adjustment Data:", {
      portfolioAdjustment,
      counterpartyAdjustments,
    })

    onSave({ portfolioAdjustment, counterpartyAdjustments })
  }

  const selectAllCounterparties = () => {
    setSelectedCounterparties(counterparties.map((cp) => cp.id))
  }

  const deselectAllCounterparties = () => {
    setSelectedCounterparties([])
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-semibold">Portfolio RWA Adjustment</h3>
          <p className="text-muted-foreground">Adjust RWA values across multiple counterparties</p>
        </div>
        <div className="text-2xl font-bold">${safeFormatNumber(totalBaselineRWA)}</div>
      </div>

      <Separator />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="space-y-6">
          {/* Adjustment Type section */}
          <div className="space-y-4">
            <Label className="text-lg font-medium">Adjustment Type</Label>
            <RadioGroup value={adjustmentType} onValueChange={setAdjustmentType} className="flex space-x-4">
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

          {/* Adjustment Value section */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Label htmlFor="adjustment-value" className="text-lg font-medium">
                {adjustmentType === "percentage" ? "Adjustment Percentage" : "Adjustment Amount"}
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <InfoCircle className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      {adjustmentType === "percentage"
                        ? "Enter a percentage to increase (positive) or decrease (negative) the RWA"
                        : "Enter an absolute amount to increase (positive) or decrease (negative) the RWA"}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex items-center">
              {adjustmentType === "percentage" && <span className="mr-2 text-lg">%</span>}
              {adjustmentType === "absolute" && <span className="mr-2 text-lg">$</span>}
              <Input
                id="adjustment-value"
                value={adjustmentValue}
                onChange={(e) => setAdjustmentValue(e.target.value)}
                placeholder={adjustmentType === "percentage" ? "e.g. 10 for +10%" : "e.g. 1000000"}
                className="flex-1 text-lg h-12"
                type="number"
              />
            </div>
          </div>

          {/* Distribution Method section */}
          <div className="space-y-2">
            <Label className="text-lg font-medium">Distribution Method</Label>
            <RadioGroup value={distributionMethod} onValueChange={setDistributionMethod} className="space-y-3">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="proportional" id="proportional" />
                <Label htmlFor="proportional">Proportional to RWA</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="equal" id="equal" />
                <Label htmlFor="equal">Equal Distribution</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="risk-weighted" id="risk-weighted" />
                <Label htmlFor="risk-weighted">Risk-Weighted</Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <div className="space-y-6">
          {/* Adjustment Reason section */}
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-lg font-medium">
              Adjustment Reason
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide a reason for this adjustment..."
              className="min-h-[200px] text-base"
              rows={8}
            />
          </div>
        </div>

        <Card className="h-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl">Adjustment Preview</CardTitle>
            <CardDescription>Impact of the adjustment on selected counterparties</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Total Baseline RWA</div>
                <div className="text-2xl font-bold">${safeFormatNumber(totalBaselineRWA)}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Total Adjusted RWA</div>
                <div className="text-2xl font-bold">${safeFormatNumber(totalAdjustedRWA)}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Absolute Change</div>
                <div className="flex items-center">
                  <span className={`text-xl font-bold ${totalAbsoluteChange >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {totalAbsoluteChange >= 0 ? "+" : ""}${safeFormatNumber(Math.abs(totalAbsoluteChange))}
                  </span>
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Percentage Change</div>
                <div className="flex items-center">
                  <Badge
                    variant="outline"
                    className={`text-lg py-1 px-3 ${
                      totalPercentageChange >= 0
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                    }`}
                  >
                    {totalPercentageChange >= 0 ? "+" : ""}
                    {isNaN(totalPercentageChange) ? "0.00" : totalPercentageChange.toFixed(2)}%
                  </Badge>
                </div>
              </div>
            </div>

            <Card className="bg-muted/40 border-dashed">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-semibold">Selected Counterparties</div>
                  <div className="text-sm text-muted-foreground">
                    {selectedCounterparties.length} of {counterparties.length}
                  </div>
                </div>
                <div className="h-3 bg-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${(selectedCounterparties.length / counterparties.length) * 100}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="table" className="w-full">
        <div className="flex justify-between items-center mb-2">
          <TabsList className="grid w-[400px] grid-cols-2">
            <TabsTrigger value="table">Table View</TabsTrigger>
            <TabsTrigger value="selected">Selected Only ({selectedCounterparties.length})</TabsTrigger>
          </TabsList>

          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={selectAllCounterparties}>
              Select All
            </Button>
            <Button variant="outline" size="sm" onClick={deselectAllCounterparties}>
              Deselect All
            </Button>
          </div>
        </div>

        <TabsContent value="table" className="mt-0">
          <div className="border rounded-md overflow-hidden">
            <div className="max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="w-12">Select</TableHead>
                    <TableHead>Counterparty</TableHead>
                    <TableHead>Industry</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead className="text-right">Baseline RWA</TableHead>
                    <TableHead className="text-right">Adjusted RWA</TableHead>
                    <TableHead className="text-right">Change</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adjustedCounterpartyData.map((cp) => (
                    <TableRow key={cp.id} className={cp.selected ? "bg-primary/5" : ""}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={cp.selected}
                          onChange={() => handleToggleCounterparty(cp.id)}
                          className="h-5 w-5 rounded border-gray-300"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{cp.name}</div>
                        {cp.hasExistingAdjustment && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            Has Adjustment
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{cp.industry}</TableCell>
                      <TableCell>{cp.region}</TableCell>
                      <TableCell className="text-right font-mono">${safeFormatNumber(cp.baselineRWA)}</TableCell>
                      <TableCell className="text-right font-mono">${safeFormatNumber(cp.adjustedRWA)}</TableCell>
                      <TableCell className="text-right">
                        {cp.selected ? (
                          <Badge
                            variant="outline"
                            className={`${
                              cp.percentageChange >= 0
                                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                            }`}
                          >
                            {cp.percentageChange >= 0 ? "+" : ""}
                            {isNaN(cp.percentageChange) ? "0.00" : cp.percentageChange.toFixed(2)}%
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">No change</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="selected" className="mt-0">
          <div className="border rounded-md overflow-hidden">
            <div className="max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead>Counterparty</TableHead>
                    <TableHead>Industry</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead className="text-right">Baseline RWA</TableHead>
                    <TableHead className="text-right">Adjusted RWA</TableHead>
                    <TableHead className="text-right">Absolute Change</TableHead>
                    <TableHead className="text-right">Percentage Change</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adjustedCounterpartyData
                    .filter((cp) => cp.selected)
                    .map((cp) => (
                      <TableRow key={cp.id}>
                        <TableCell className="font-medium">{cp.name}</TableCell>
                        <TableCell>{cp.industry}</TableCell>
                        <TableCell>{cp.region}</TableCell>
                        <TableCell className="text-right font-mono">${safeFormatNumber(cp.baselineRWA)}</TableCell>
                        <TableCell className="text-right font-mono">${safeFormatNumber(cp.adjustedRWA)}</TableCell>
                        <TableCell className="text-right">
                          <span className={cp.absoluteChange >= 0 ? "text-green-600" : "text-red-600"}>
                            {cp.absoluteChange >= 0 ? "+" : ""}${safeFormatNumber(Math.abs(cp.absoluteChange))}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant="outline"
                            className={`${
                              cp.percentageChange >= 0
                                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                            }`}
                          >
                            {cp.percentageChange >= 0 ? "+" : ""}
                            {isNaN(cp.percentageChange) ? "0.00" : cp.percentageChange.toFixed(2)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-between pt-4">
        {onRemove && (
          <Button variant="destructive" size="lg" onClick={onRemove}>
            <Trash2 className="mr-2 h-5 w-5" />
            Remove Portfolio Adjustment
          </Button>
        )}
        <Button onClick={handleSave} size="lg" className={onRemove ? "" : "ml-auto"}>
          Save Adjustment
        </Button>
      </div>
    </div>
  )
}
