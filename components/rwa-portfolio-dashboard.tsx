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
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { AlertCircle, ArrowDownIcon, ArrowUpIcon } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export function RWAPortfolioDashboard({ counterparties, onEadUpdate }) {
  const [targetRWA, setTargetRWA] = useState("")
  const [eadAdjustments, setEadAdjustments] = useState(
    counterparties.reduce((acc, cp) => {
      acc[cp.id] = 1 // Start with no adjustment (multiplier of 1)
      return acc
    }, {}),
  )
  const [optimizationResult, setOptimizationResult] = useState(null)

  // Calculate total portfolio metrics
  const portfolioMetrics = useMemo(() => {
    const adjustedCounterparties = counterparties.map((cp) => ({
      ...cp,
      ead: cp.ead * (eadAdjustments[cp.id] || 1),
    }))

    const rwaResults = adjustedCounterparties.map((cp) => {
      const result = calculateRWA(cp)
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
        rwa: result.rwa,
        rwaDensity: (result.rwa / cp.ead) * 100,
      }
    })

    const totalEad = rwaResults.reduce((sum, cp) => sum + cp.adjustedEad, 0)
    const totalRwa = rwaResults.reduce((sum, cp) => sum + cp.rwa, 0)
    const avgRwaDensity = (totalRwa / totalEad) * 100
    const avgPd = (rwaResults.reduce((sum, cp) => sum + cp.ttcPd, 0) / rwaResults.length) * 100
    const avgLgd = (rwaResults.reduce((sum, cp) => sum + cp.lgd, 0) / rwaResults.length) * 100

    // Group by industry and region for charts
    const byIndustry = {}
    const byRegion = {}

    rwaResults.forEach((cp) => {
      // Group by industry
      if (!byIndustry[cp.industry]) {
        byIndustry[cp.industry] = { rwa: 0, ead: 0 }
      }
      byIndustry[cp.industry].rwa += cp.rwa
      byIndustry[cp.industry].ead += cp.adjustedEad

      // Group by region
      if (!byRegion[cp.region]) {
        byRegion[cp.region] = { rwa: 0, ead: 0 }
      }
      byRegion[cp.region].rwa += cp.rwa
      byRegion[cp.region].ead += cp.adjustedEad
    })

    const industryData = Object.entries(byIndustry).map(([industry, data]) => ({
      name: industry,
      rwa: data.rwa,
      ead: data.ead,
      density: (data.rwa / data.ead) * 100,
    }))

    const regionData = Object.entries(byRegion).map(([region, data]) => ({
      name: region,
      rwa: data.rwa,
      ead: data.ead,
      density: (data.rwa / data.ead) * 100,
    }))

    return {
      counterpartyResults: rwaResults,
      totalEad,
      totalRwa,
      avgRwaDensity,
      avgPd,
      avgLgd,
      industryData,
      regionData,
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
    const sortedCounterparties = [...counterparties].sort((a, b) => b.ttcPd - a.ttcPd)

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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Total RWA</CardTitle>
            <CardDescription>Portfolio risk-weighted assets</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${Math.round(portfolioMetrics.totalRwa).toLocaleString()}</div>
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>RWA by Industry</CardTitle>
            <CardDescription>Distribution of risk-weighted assets across industries</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ChartWrapper>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={portfolioMetrics.industryData} margin={{ top: 20, right: 30, left: 20, bottom: 70 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={70} />
                  <YAxis />
                  <Tooltip formatter={(value) => `$${Math.round(value).toLocaleString()}`} />
                  <Legend />
                  <Bar dataKey="rwa" name="RWA" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </ChartWrapper>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>RWA by Region</CardTitle>
            <CardDescription>Geographical distribution of risk-weighted assets</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ChartWrapper>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={portfolioMetrics.regionData}
                    dataKey="rwa"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {portfolioMetrics.regionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `$${Math.round(value).toLocaleString()}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartWrapper>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>RWA Optimization</CardTitle>
          <CardDescription>Adjust exposures to reach a target RWA level</CardDescription>
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
                <TableHead>TTC PD</TableHead>
                <TableHead>EAD</TableHead>
                <TableHead>RWA</TableHead>
                <TableHead>Density</TableHead>
                <TableHead>EAD Adjustment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {portfolioMetrics.counterpartyResults
                .sort((a, b) => b.ttcPd - a.ttcPd) // Sort by TTC PD (highest first)
                .map((cp) => (
                  <TableRow key={cp.id}>
                    <TableCell>
                      {cp.name}
                      {cp.isFinancial && (
                        <Badge variant="outline" className="ml-2">
                          Financial
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{cp.industry}</TableCell>
                    <TableCell>{(cp.ttcPd * 100).toFixed(4)}%</TableCell>
                    <TableCell>${Math.round(cp.adjustedEad).toLocaleString()}</TableCell>
                    <TableCell>${Math.round(cp.rwa).toLocaleString()}</TableCell>
                    <TableCell>{cp.rwaDensity.toFixed(2)}%</TableCell>
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
        </CardContent>
        <CardFooter>
          <Button onClick={applyAdjustments}>Apply EAD Adjustments</Button>
        </CardFooter>
      </Card>
    </div>
  )
}
