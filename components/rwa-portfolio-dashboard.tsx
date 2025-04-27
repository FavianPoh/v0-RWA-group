"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { calculateRWA } from "@/lib/rwa-calculator"
import { ChartWrapper } from "@/components/chart-wrapper"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts"
import { AlertCircle, ArrowDownIcon, ArrowUpIcon, RotateCcw, ChevronDown, ChevronUp, InfoIcon } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { AdjustmentHeatmap } from "@/components/adjustment-heatmap"

export function RWAPortfolioDashboard({ counterparties, onEadUpdate, onSelectCounterparty }) {
  const [targetRWA, setTargetRWA] = useState("")
  const [chartView, setChartView] = useState("industry")

  // Store original EAD values for reset functionality
  const originalEadAdjustments = useMemo(() => {
    return counterparties.reduce((acc, cp) => {
      acc[cp.id] = 1 // Start with no adjustment (multiplier of 1)
      return acc
    }, {})
  }, [counterparties])

  const [eadAdjustments, setEadAdjustments] = useState(originalEadAdjustments)
  const [optimizationResult, setOptimizationResult] = useState(null)

  // Add these after the existing state declarations
  const [sortField, setSortField] = useState("ttcPd")
  const [sortDirection, setSortDirection] = useState("desc") // desc = highest first

  const handleSort = (field) => {
    if (sortField === field) {
      // Toggle direction if clicking the same field
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      // Set new field and default direction
      setSortField(field)
      setSortDirection("desc") // Default to descending (highest first)
    }
  }

  // Reset all EAD adjustments to default (1.0)
  const resetToDefault = () => {
    setEadAdjustments(originalEadAdjustments)
    setOptimizationResult(null)
    setTargetRWA("")
  }

  // Calculate total portfolio metrics
  const portfolioMetrics = useMemo(() => {
    const adjustedCounterparties = counterparties.map((cp) => ({
      ...cp,
      ead: cp.ead * (eadAdjustments[cp.id] || 1),
    }))

    const rwaResults = adjustedCounterparties.map((cp) => {
      const result = calculateRWA(cp)

      // Get the baseline RWA before any adjustments
      const baselineRWA = result.rwa

      // Apply counterparty-specific adjustment if present
      let adjustedRWA = baselineRWA
      let counterpartyAdjustment = 0
      if (cp.rwaAdjustment) {
        adjustedRWA = cp.rwaAdjustment.adjustedRWA
        counterpartyAdjustment = cp.rwaAdjustment.adjustedRWA - baselineRWA
      }

      // Apply portfolio-level adjustment if present
      let portfolioAdjustment = 0
      if (cp.portfolioRwaAdjustment) {
        const previousRWA = adjustedRWA
        adjustedRWA = cp.portfolioRwaAdjustment.adjustedRWA
        portfolioAdjustment = adjustedRWA - previousRWA
      }

      // Calculate total adjustment
      const totalAdjustment = counterpartyAdjustment + portfolioAdjustment
      const hasAdjustment = totalAdjustment !== 0

      return {
        id: cp.id,
        name: cp.name,
        industry: cp.industry,
        region: cp.region,
        isFinancial: cp.isFinancial,
        pd: cp.pd,
        ttcPd: cp.ttcPd,
        lgd: cp.lgd,
        ead: cp.ead,
        adjustedEad: cp.ead * (eadAdjustments[cp.id] || 1),
        baselineRWA: baselineRWA,
        rwa: adjustedRWA,
        hasAdjustment,
        counterpartyAdjustment,
        portfolioAdjustment,
        totalAdjustment,
        adjustmentPercentage: hasAdjustment ? (adjustedRWA / baselineRWA - 1) * 100 : 0,
        rwaDensity: (adjustedRWA / cp.ead) * 100,
        adjustmentIntensity: hasAdjustment ? Math.abs((adjustedRWA / baselineRWA - 1) * 100) : 0,
        adjustmentDirection: totalAdjustment >= 0 ? "positive" : "negative",
      }
    })

    const totalEad = rwaResults.reduce((sum, cp) => sum + cp.adjustedEad, 0)
    const totalBaselineRWA = rwaResults.reduce((sum, cp) => sum + cp.baselineRWA, 0)
    const totalRwa = rwaResults.reduce((sum, cp) => sum + cp.rwa, 0)
    const totalAdjustment = totalRwa - totalBaselineRWA
    const avgRwaDensity = (totalRwa / totalEad) * 100
    const avgPd = (rwaResults.reduce((sum, cp) => sum + cp.ttcPd, 0) / rwaResults.length) * 100
    const avgLgd = (rwaResults.reduce((sum, cp) => sum + cp.lgd, 0) / rwaResults.length) * 100

    // Group by industry and region for charts
    const byIndustry = {}
    const byRegion = {}

    rwaResults.forEach((cp) => {
      // Group by industry
      if (!byIndustry[cp.industry]) {
        byIndustry[cp.industry] = {
          rwa: 0,
          baselineRWA: 0,
          ead: 0,
          adjustment: 0,
          counterparties: 0,
          adjustedCounterparties: 0,
        }
      }
      byIndustry[cp.industry].rwa += cp.rwa
      byIndustry[cp.industry].baselineRWA += cp.baselineRWA
      byIndustry[cp.industry].ead += cp.adjustedEad
      byIndustry[cp.industry].adjustment += cp.totalAdjustment
      byIndustry[cp.industry].counterparties += 1
      if (cp.hasAdjustment) {
        byIndustry[cp.industry].adjustedCounterparties += 1
      }

      // Group by region
      if (!byRegion[cp.region]) {
        byRegion[cp.region] = {
          rwa: 0,
          baselineRWA: 0,
          ead: 0,
          adjustment: 0,
          counterparties: 0,
          adjustedCounterparties: 0,
        }
      }
      byRegion[cp.region].rwa += cp.rwa
      byRegion[cp.region].baselineRWA += cp.baselineRWA
      byRegion[cp.region].ead += cp.adjustedEad
      byRegion[cp.region].adjustment += cp.totalAdjustment
      byRegion[cp.region].counterparties += 1
      if (cp.hasAdjustment) {
        byRegion[cp.region].adjustedCounterparties += 1
      }
    })

    const industryData = Object.entries(byIndustry).map(([industry, data]) => ({
      name: industry,
      rwa: data.rwa,
      baselineRWA: data.baselineRWA,
      adjustment: data.adjustment,
      ead: data.ead,
      density: (data.rwa / data.ead) * 100,
      adjustmentPercentage: (data.adjustment / data.baselineRWA) * 100,
      counterparties: data.counterparties,
      adjustedCounterparties: data.adjustedCounterparties,
      adjustmentRatio: data.adjustedCounterparties / data.counterparties,
    }))

    const regionData = Object.entries(byRegion).map(([region, data]) => ({
      name: region,
      rwa: data.rwa,
      baselineRWA: data.baselineRWA,
      adjustment: data.adjustment,
      ead: data.ead,
      density: (data.rwa / data.ead) * 100,
      adjustmentPercentage: (data.adjustment / data.baselineRWA) * 100,
      counterparties: data.counterparties,
      adjustedCounterparties: data.adjustedCounterparties,
      adjustmentRatio: data.adjustedCounterparties / data.counterparties,
    }))

    return {
      counterpartyResults: rwaResults,
      totalEad,
      totalBaselineRWA,
      totalRwa,
      totalAdjustment,
      avgRwaDensity,
      avgPd,
      avgLgd,
      industryData,
      regionData,
      hasAdjustments: totalBaselineRWA !== totalRwa,
      totalAdjustmentPercentage: (totalRwa / totalBaselineRWA - 1) * 100,
      adjustedCounterparties: rwaResults.filter((cp) => cp.hasAdjustment).length,
      totalCounterparties: rwaResults.length,
    }
  }, [counterparties, eadAdjustments])

  // Handle EAD adjustment for a specific counterparty
  const handleEadAdjustment = (counterpartyId, value) => {
    setEadAdjustments((prev) => ({
      ...prev,
      [counterpartyId]: value,
    }))
  }

  // Apply all EAD adjustments to the counterparties
  const applyAdjustments = () => {
    const updatedCounterparties = counterparties.map((cp) => ({
      ...cp,
      ead: cp.ead * eadAdjustments[cp.id],
    }))
    onEadUpdate(updatedCounterparties)
  }

  // Optimize EAD adjustments to reach target RWA
  const optimizeForTargetRWA = () => {
    const targetValue = Number.parseFloat(targetRWA.replace(/,/g, ""))
    if (isNaN(targetValue) || targetValue <= 0) {
      return
    }

    // Sort counterparties by TTC PD (highest first) to prioritize reducing exposure to riskier counterparties
    const sortedCounterparties = [...counterparties].sort((a, b) => {
      if (sortDirection === "asc") {
        return a[sortField] - b[sortField]
      } else {
        return b[sortField] - a[sortField]
      }
    })

    // Calculate current total RWA
    const currentTotalRWA = portfolioMetrics.totalRwa

    if (targetValue >= currentTotalRWA) {
      // If target is higher than current, we don't need to reduce
      setOptimizationResult({
        success: false,
        message: "Target RWA is higher than current RWA. No reduction needed.",
      })
      return
    }

    // Calculate how much RWA we need to reduce
    const rwaToReduce = currentTotalRWA - targetValue

    // Start with no adjustments
    const newAdjustments = { ...eadAdjustments }
    let remainingRwaToReduce = rwaToReduce
    let reductionAchieved = 0

    // Iterate through counterparties starting with highest TTC PD
    for (const cp of sortedCounterparties) {
      if (remainingRwaToReduce <= 0) break

      const result = calculateRWA(cp)
      const rwaDensity = result.rwa / cp.ead // RWA per unit of EAD

      // Calculate how much EAD we can reduce for this counterparty
      // We'll reduce up to 50% of the original EAD
      const maxEadReduction = cp.ead * 0.5
      const maxRwaReduction = maxEadReduction * rwaDensity

      if (maxRwaReduction <= remainingRwaToReduce) {
        // We need to reduce this counterparty's EAD by the maximum amount
        newAdjustments[cp.id] = 0.5 // 50% of original EAD
        remainingRwaToReduce -= maxRwaReduction
        reductionAchieved += maxRwaReduction
      } else {
        // We only need to reduce part of this counterparty's EAD
        const neededEadReduction = remainingRwaToReduce / rwaDensity
        const newEadMultiplier = 1 - neededEadReduction / cp.ead
        newAdjustments[cp.id] = Math.max(0.5, newEadMultiplier) // Don't go below 50%

        const actualRwaReduction = neededEadReduction * rwaDensity
        remainingRwaToReduce -= actualRwaReduction
        reductionAchieved += actualRwaReduction
      }
    }

    // Update the EAD adjustments
    setEadAdjustments(newAdjustments)

    // Set optimization result
    setOptimizationResult({
      success: true,
      message: `Optimized EAD adjustments to reduce RWA by $${Math.round(reductionAchieved).toLocaleString()}`,
      targetRwa: targetValue,
      achievedRwa: currentTotalRWA - reductionAchieved,
    })
  }

  // Colors for charts
  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d", "#ffc658", "#8dd1e1"]

  // Custom tooltip for the adjustment charts
  const AdjustmentTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded shadow-lg">
          <p className="font-medium">{label}</p>
          <p className="text-sm">
            Pre-adjustment RWA:{" "}
            <span className="font-medium">${Math.round(payload[0].payload.baselineRWA).toLocaleString()}</span>
          </p>
          <p className="text-sm">
            Post-adjustment RWA:{" "}
            <span className="font-medium">${Math.round(payload[0].payload.rwa).toLocaleString()}</span>
          </p>
          <p className="text-sm">
            Adjustment:{" "}
            <span className={`font-medium ${payload[0].payload.adjustment >= 0 ? "text-green-600" : "text-red-600"}`}>
              {payload[0].payload.adjustment >= 0 ? "+" : ""}$
              {Math.round(payload[0].payload.adjustment).toLocaleString()} (
              {payload[0].payload.adjustmentPercentage.toFixed(2)}%)
            </span>
          </p>
          <p className="text-sm">
            Adjusted counterparties:{" "}
            <span className="font-medium">
              {payload[0].payload.adjustedCounterparties}/{payload[0].payload.counterparties}
            </span>
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between">
              <span>Total RWA</span>
              <TooltipProvider>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <InfoIcon className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Total Risk-Weighted Assets after all adjustments</p>
                  </TooltipContent>
                </UITooltip>
              </TooltipProvider>
            </CardTitle>
            <CardDescription>Portfolio risk-weighted assets</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${Math.round(portfolioMetrics.totalRwa).toLocaleString()}</div>
            {portfolioMetrics.hasAdjustments && (
              <div className="flex flex-col mt-1">
                <div className="flex items-center">
                  <div className="text-sm text-muted-foreground mr-2">Pre-adjustment:</div>
                  <div className="text-sm font-medium">
                    ${Math.round(portfolioMetrics.totalBaselineRWA).toLocaleString()}
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="text-sm text-muted-foreground mr-2">Adjustment:</div>
                  <Badge
                    variant="outline"
                    className={`${
                      portfolioMetrics.totalAdjustment >= 0
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                    }`}
                  >
                    {portfolioMetrics.totalAdjustment >= 0 ? "+" : ""}$
                    {Math.abs(Math.round(portfolioMetrics.totalAdjustment)).toLocaleString()} (
                    {portfolioMetrics.totalAdjustmentPercentage.toFixed(2)}%)
                  </Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Total EAD</CardTitle>
            <CardDescription>Portfolio exposure at default</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${Math.round(portfolioMetrics.totalEad).toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Average RWA Density</CardTitle>
            <CardDescription>RWA as percentage of EAD</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{portfolioMetrics.avgRwaDensity.toFixed(2)}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Adjusted Counterparties</CardTitle>
            <CardDescription>Counterparties with RWA adjustments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {portfolioMetrics.adjustedCounterparties} / {portfolioMetrics.totalCounterparties}
            </div>
            {portfolioMetrics.adjustedCounterparties > 0 && (
              <div className="text-sm text-muted-foreground mt-1">
                {((portfolioMetrics.adjustedCounterparties / portfolioMetrics.totalCounterparties) * 100).toFixed(1)}%
                of portfolio
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>RWA by {chartView === "industry" ? "Industry" : "Region"}</CardTitle>
            <CardDescription className="flex items-center justify-between">
              <span>Distribution of risk-weighted assets</span>
              <div className="flex items-center space-x-2">
                <Button
                  variant={chartView === "industry" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setChartView("industry")}
                >
                  Industry
                </Button>
                <Button
                  variant={chartView === "region" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setChartView("region")}
                >
                  Region
                </Button>
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ChartWrapper>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartView === "industry" ? portfolioMetrics.industryData : portfolioMetrics.regionData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={70} />
                  <YAxis />
                  <Tooltip content={<AdjustmentTooltip />} />
                  <Legend />
                  <Bar dataKey="baselineRWA" name="Pre-adjustment RWA" fill="#94a3b8" />
                  <Bar dataKey="rwa" name="Post-adjustment RWA" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </ChartWrapper>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>RWA Adjustments</CardTitle>
            <CardDescription>Magnitude and distribution of RWA adjustments</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <Tabs defaultValue="chart" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="chart">Chart View</TabsTrigger>
                <TabsTrigger value="heatmap">Heatmap View</TabsTrigger>
              </TabsList>
              <TabsContent value="chart" className="h-[250px]">
                <ChartWrapper>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={portfolioMetrics.counterpartyResults
                        .filter((cp) => cp.hasAdjustment)
                        .sort((a, b) => b.adjustmentIntensity - a.adjustmentIntensity)}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis
                        label={{ value: "Adjustment %", angle: -90, position: "insideLeft" }}
                        domain={["dataMin", "dataMax"]}
                      />
                      <Tooltip
                        formatter={(value, name) => [`${value.toFixed(2)}%`, "Adjustment"]}
                        labelFormatter={(label) => `Counterparty: ${label}`}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="adjustmentPercentage"
                        name="Adjustment %"
                        stroke="#8884d8"
                        dot={{
                          stroke: (data) => (data.adjustmentDirection === "positive" ? "#10b981" : "#ef4444"),
                          fill: (data) => (data.adjustmentDirection === "positive" ? "#10b981" : "#ef4444"),
                          r: 5,
                        }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartWrapper>
              </TabsContent>
              <TabsContent value="heatmap" className="h-[250px]">
                <AdjustmentHeatmap counterparties={portfolioMetrics.counterpartyResults} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle>RWA Optimization</CardTitle>
            <CardDescription>Adjust exposures to reach a target RWA level</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={resetToDefault}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset to Default
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="w-full md:w-1/3">
              <Label htmlFor="target-rwa">Target RWA ($)</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  id="target-rwa"
                  placeholder="Enter target RWA"
                  value={targetRWA}
                  onChange={(e) => {
                    // Format as currency
                    const value = e.target.value.replace(/[^\d]/g, "")
                    setTargetRWA(value ? Number.parseInt(value).toLocaleString() : "")
                  }}
                />
                <Button onClick={optimizeForTargetRWA}>Optimize</Button>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Current: ${Math.round(portfolioMetrics.totalRwa).toLocaleString()}
              </p>
            </div>
            <div className="w-full md:w-2/3">
              {optimizationResult && (
                <Alert variant={optimizationResult.success ? "default" : "destructive"}>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Optimization Result</AlertTitle>
                  <AlertDescription>
                    {optimizationResult.message}
                    {optimizationResult.success && (
                      <div className="mt-2">
                        <div className="flex justify-between text-sm">
                          <span>Target RWA:</span>
                          <span>${Math.round(optimizationResult.targetRwa).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Achieved RWA:</span>
                          <span>${Math.round(optimizationResult.achievedRwa).toLocaleString()}</span>
                        </div>
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Counterparty</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("ttcPd")}>
                  TTC PD{" "}
                  {sortField === "ttcPd" &&
                    (sortDirection === "asc" ? (
                      <ChevronUp className="inline h-4 w-4" />
                    ) : (
                      <ChevronDown className="inline h-4 w-4" />
                    ))}
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("ead")}>
                  EAD{" "}
                  {sortField === "ead" &&
                    (sortDirection === "asc" ? (
                      <ChevronUp className="inline h-4 w-4" />
                    ) : (
                      <ChevronDown className="inline h-4 w-4" />
                    ))}
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("baselineRWA")}>
                  Pre-Adj RWA{" "}
                  {sortField === "baselineRWA" &&
                    (sortDirection === "asc" ? (
                      <ChevronUp className="inline h-4 w-4" />
                    ) : (
                      <ChevronDown className="inline h-4 w-4" />
                    ))}
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("rwa")}>
                  Post-Adj RWA{" "}
                  {sortField === "rwa" &&
                    (sortDirection === "asc" ? (
                      <ChevronUp className="inline h-4 w-4" />
                    ) : (
                      <ChevronDown className="inline h-4 w-4" />
                    ))}
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort("adjustmentPercentage")}
                >
                  Adjustment{" "}
                  {sortField === "adjustmentPercentage" &&
                    (sortDirection === "asc" ? (
                      <ChevronUp className="inline h-4 w-4" />
                    ) : (
                      <ChevronDown className="inline h-4 w-4" />
                    ))}
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("rwaDensity")}>
                  Density{" "}
                  {sortField === "rwaDensity" &&
                    (sortDirection === "asc" ? (
                      <ChevronUp className="inline h-4 w-4" />
                    ) : (
                      <ChevronDown className="inline h-4 w-4" />
                    ))}
                </TableHead>
                <TableHead>EAD Adjustment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {portfolioMetrics.counterpartyResults
                .sort((a, b) => {
                  if (sortDirection === "asc") {
                    return a[sortField] - b[sortField]
                  } else {
                    return b[sortField] - a[sortField]
                  }
                })
                .map((cp) => (
                  <TableRow
                    key={cp.id}
                    className={
                      cp.hasAdjustment
                        ? cp.adjustmentDirection === "positive"
                          ? "bg-green-50 dark:bg-green-900/10"
                          : "bg-red-50 dark:bg-red-900/10"
                        : ""
                    }
                  >
                    <TableCell>
                      {cp.name}
                      {cp.isFinancial && (
                        <Badge variant="outline" className="ml-2">
                          Financial
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{cp.industry}</TableCell>
                    <TableCell>
                      <div
                        className={`px-2 py-1 rounded-md inline-block ${
                          cp.ttcPd > 0.05
                            ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                            : cp.ttcPd > 0.02
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                              : cp.ttcPd > 0.01
                                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                                : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        }`}
                      >
                        {(cp.ttcPd * 100).toFixed(4)}%
                      </div>
                    </TableCell>
                    <TableCell>${Math.round(cp.adjustedEad).toLocaleString()}</TableCell>
                    <TableCell className="font-medium">${Math.round(cp.baselineRWA).toLocaleString()}</TableCell>
                    <TableCell className="font-medium">${Math.round(cp.rwa).toLocaleString()}</TableCell>
                    <TableCell>
                      {cp.hasAdjustment ? (
                        <Badge
                          variant="outline"
                          className={`${
                            cp.adjustmentPercentage >= 0
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                          }`}
                        >
                          {cp.adjustmentPercentage >= 0 ? "+" : ""}
                          {cp.adjustmentPercentage.toFixed(2)}%
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">None</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div
                        className={`px-2 py-1 rounded-md inline-block ${
                          cp.rwaDensity > 100
                            ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                            : cp.rwaDensity > 75
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                              : cp.rwaDensity > 50
                                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                                : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        }`}
                      >
                        {cp.rwaDensity.toFixed(2)}%
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Slider
                          min={0.5}
                          max={1.5}
                          step={0.01}
                          value={[eadAdjustments[cp.id] || 1]}
                          onValueChange={(value) => handleEadAdjustment(cp.id, value[0])}
                          className="w-32"
                        />
                        <span className="text-sm font-medium w-12">{(eadAdjustments[cp.id] || 1).toFixed(2)}x</span>
                        {eadAdjustments[cp.id] !== 1 && (
                          <span className="text-xs text-muted-foreground">
                            {eadAdjustments[cp.id] > 1 ? (
                              <ArrowUpIcon className="h-3 w-3 inline text-green-500" />
                            ) : (
                              <ArrowDownIcon className="h-3 w-3 inline text-red-500" />
                            )}
                            {Math.abs((eadAdjustments[cp.id] - 1) * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
          <div className="mt-4 border-t pt-4">
            <div className="text-sm font-medium mb-2">Legend</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-sm bg-red-100 dark:bg-red-900"></div>
                <span className="text-xs">High Risk</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-sm bg-amber-100 dark:bg-amber-900"></div>
                <span className="text-xs">Medium-High Risk</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-sm bg-yellow-100 dark:bg-yellow-900"></div>
                <span className="text-xs">Medium Risk</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-sm bg-green-100 dark:bg-green-900"></div>
                <span className="text-xs">Low Risk</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-sm bg-green-50 dark:bg-green-900/10"></div>
                <span className="text-xs">Positive Adjustment</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-sm bg-red-50 dark:bg-red-900/10"></div>
                <span className="text-xs">Negative Adjustment</span>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={applyAdjustments}>Apply EAD Adjustments</Button>
        </CardFooter>
      </Card>
    </div>
  )
}
