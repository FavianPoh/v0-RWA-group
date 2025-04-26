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
import { Trash2 } from "lucide-react"

export function PortfolioAdjustmentPanel({ counterparties, onSave, onRemove }) {
  // Initialize state
  const [adjustmentType, setAdjustmentType] = useState("percentage")
  const [adjustmentValue, setAdjustmentValue] = useState("")
  const [distributionMethod, setDistributionMethod] = useState("proportional")
  const [reason, setReason] = useState("")
  const [selectedCounterparties, setSelectedCounterparties] = useState(counterparties.map((cp) => cp.id))

  // Calculate baseline RWA for all counterparties
  const counterpartyData = counterparties.map((cp) => {
    const baselineRWA = calculateRWA(cp).rwa

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
      totalAdjustmentAmount = totalBaselineRWA * (numValue / 100)
    } else {
      totalAdjustmentAmount = numValue
    }

    // Distribute the adjustment based on the selected method
    return counterpartyData.map((cp) => {
      if (!cp.selected) return cp

      let counterpartyAdjustment = 0

      switch (distributionMethod) {
        case "proportional":
          // Distribute proportionally to baseline RWA
          counterpartyAdjustment = totalAdjustmentAmount * (cp.baselineRWA / totalBaselineRWA)
          break
        case "equal":
          // Distribute equally among selected counterparties
          counterpartyAdjustment = totalAdjustmentAmount / selectedCounterparties.length
          break
        case "risk-weighted":
          // Higher risk (higher RWA density) gets more adjustment
          // This is a simplified approach - could be refined further
          const selectedCPs = counterpartyData.filter((c) => c.selected)
          const totalRiskWeight = selectedCPs.reduce((sum, c) => sum + c.baselineRWA, 0)
          counterpartyAdjustment = totalAdjustmentAmount * (cp.baselineRWA / totalRiskWeight)
          break
      }

      const adjustedRWA = cp.baselineRWA + counterpartyAdjustment
      const absoluteChange = counterpartyAdjustment
      const percentageChange = (counterpartyAdjustment / cp.baselineRWA) * 100

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
  const totalPercentageChange = (totalAbsoluteChange / totalBaselineRWA) * 100

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

    const portfolioAdjustment = {
      type: adjustmentType,
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

    const counterpartyAdjustments = adjustedCounterpartyData
      .filter((cp) => cp.selected)
      .map((cp) => ({
        id: cp.id,
        baselineRWA: cp.baselineRWA,
        adjustedRWA: cp.adjustedRWA,
        absoluteChange: cp.absoluteChange,
        percentageChange: cp.percentageChange,
      }))

    onSave({ portfolioAdjustment, counterpartyAdjustments })
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Total Baseline RWA</h3>
          <p className="text-sm text-muted-foreground">For selected counterparties</p>
        </div>
        <div className="text-2xl font-bold">${Math.round(totalBaselineRWA).toLocaleString()}</div>
      </div>

      <Separator />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
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
                value={adjustmentValue}
                onChange={(e) => setAdjustmentValue(e.target.value)}
                placeholder={adjustmentType === "percentage" ? "e.g. 10 for +10%" : "e.g. 1000000"}
                className="flex-1"
              />
            </div>
          </div>

          <div>
            <Label className="text-base">Distribution Method</Label>
            <RadioGroup value={distributionMethod} onValueChange={setDistributionMethod} className="space-y-2 mt-2">
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
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Adjustment Preview</CardTitle>
            <CardDescription>Impact of the adjustment on selected counterparties</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium">Total Baseline RWA</div>
                <div className="text-xl">${Math.round(totalBaselineRWA).toLocaleString()}</div>
              </div>
              <div>
                <div className="text-sm font-medium">Total Adjusted RWA</div>
                <div className="text-xl">${Math.round(totalAdjustedRWA).toLocaleString()}</div>
              </div>
              <div>
                <div className="text-sm font-medium">Absolute Change</div>
                <div className="flex items-center">
                  <span className={totalAbsoluteChange >= 0 ? "text-green-600" : "text-red-600"}>
                    {totalAbsoluteChange >= 0 ? "+" : ""}${Math.abs(Math.round(totalAbsoluteChange)).toLocaleString()}
                  </span>
                </div>
              </div>
              <div>
                <div className="text-sm font-medium">Percentage Change</div>
                <div className="flex items-center">
                  <Badge
                    variant="outline"
                    className={`${
                      totalPercentageChange >= 0
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                    }`}
                  >
                    {totalPercentageChange >= 0 ? "+" : ""}
                    {totalPercentageChange.toFixed(2)}%
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="table">
        <TabsList>
          <TabsTrigger value="table">Table View</TabsTrigger>
          <TabsTrigger value="selected">Selected Counterparties</TabsTrigger>
        </TabsList>
        <TabsContent value="table" className="mt-4">
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Select</TableHead>
                  <TableHead>Counterparty</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Baseline RWA</TableHead>
                  <TableHead>Adjusted RWA</TableHead>
                  <TableHead>Change</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adjustedCounterpartyData.map((cp) => (
                  <TableRow key={cp.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={cp.selected}
                        onChange={() => handleToggleCounterparty(cp.id)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                    </TableCell>
                    <TableCell>
                      {cp.name}
                      {cp.hasExistingAdjustment && (
                        <Badge variant="outline" className="ml-2">
                          Has Adjustment
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{cp.industry}</TableCell>
                    <TableCell>${Math.round(cp.baselineRWA).toLocaleString()}</TableCell>
                    <TableCell>${Math.round(cp.adjustedRWA).toLocaleString()}</TableCell>
                    <TableCell>
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
                          {cp.percentageChange.toFixed(2)}%
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
        </TabsContent>
        <TabsContent value="selected" className="mt-4">
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Counterparty</TableHead>
                  <TableHead>Baseline RWA</TableHead>
                  <TableHead>Adjusted RWA</TableHead>
                  <TableHead>Absolute Change</TableHead>
                  <TableHead>Percentage Change</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adjustedCounterpartyData
                  .filter((cp) => cp.selected)
                  .map((cp) => (
                    <TableRow key={cp.id}>
                      <TableCell>{cp.name}</TableCell>
                      <TableCell>${Math.round(cp.baselineRWA).toLocaleString()}</TableCell>
                      <TableCell>${Math.round(cp.adjustedRWA).toLocaleString()}</TableCell>
                      <TableCell>
                        <span className={cp.absoluteChange >= 0 ? "text-green-600" : "text-red-600"}>
                          {cp.absoluteChange >= 0 ? "+" : ""}${Math.abs(Math.round(cp.absoluteChange)).toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`${
                            cp.percentageChange >= 0
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                          }`}
                        >
                          {cp.percentageChange >= 0 ? "+" : ""}
                          {cp.percentageChange.toFixed(2)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-between">
        {onRemove && (
          <Button variant="destructive" onClick={onRemove}>
            <Trash2 className="mr-2 h-4 w-4" />
            Remove Portfolio Adjustment
          </Button>
        )}
        <Button onClick={handleSave} className={onRemove ? "" : "ml-auto"}>
          Save Adjustment
        </Button>
      </div>
    </div>
  )
}
