"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { calculateRWA } from "@/lib/rwa-calculator"
import { ChartWrapper } from "@/components/chart-wrapper"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Scatter,
} from "recharts"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RotateCcw, Target } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"

// Custom tooltip component to highlight baseline and target values
const CustomTooltip = ({ active, payload, label, formatParameterValue, baselineValue, targetValue }) => {
  if (active && payload && payload.length) {
    const isBaseline = Math.abs(label - baselineValue) < 0.0000001
    const isTarget = targetValue !== null && Math.abs(label - targetValue) < 0.0000001

    return (
      <div className="bg-white p-3 border rounded shadow-lg">
        <p className="font-medium text-sm">
          {formatParameterValue(label)}
          {isBaseline && " (Baseline)"}
          {isTarget && " (Target)"}
        </p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {`${entry.name}: ${
              entry.name === "RWA" ? `$${Math.round(entry.value).toLocaleString()}` : `${entry.value.toFixed(2)}%`
            }`}
          </p>
        ))}
        {isBaseline && <div className="mt-1 pt-1 border-t text-xs text-gray-500">Current baseline value</div>}
        {isTarget && <div className="mt-1 pt-1 border-t text-xs text-gray-500">Target analysis value</div>}
      </div>
    )
  }
  return null
}

// Update the component to include target value functionality
export function SensitivityAnalysis({ counterparty }) {
  // State for parameter selection and range
  const [selectedParameter, setSelectedParameter] = useState("pd")
  const [rangeMin, setRangeMin] = useState(0.5)
  const [rangeMax, setRangeMax] = useState(1.5)
  const [steps, setSteps] = useState(10)
  const [rangeType, setRangeType] = useState("percentage") // percentage or absolute
  const [customRange, setCustomRange] = useState(false)
  const [customRangeValues, setCustomRangeValues] = useState("")
  const [sensitivityData, setSensitivityData] = useState([])
  const [baselineRWA, setBaselineRWA] = useState(0)
  const [baselinePoint, setBaselinePoint] = useState(null)
  const [targetPoint, setTargetPoint] = useState(null)

  // New state for target value functionality
  const [showTarget, setShowTarget] = useState(false)
  const [targetValue, setTargetValue] = useState("")
  const [targetRWA, setTargetRWA] = useState(null)
  const [targetImpact, setTargetImpact] = useState(null)

  // Parameter definitions
  const parameters = useMemo(
    () => [
      { id: "pd", name: "PD", description: "Probability of Default", baseline: counterparty.pd },
      { id: "lgd", name: "LGD", description: "Loss Given Default", baseline: counterparty.lgd },
      { id: "ead", name: "EAD", description: "Exposure at Default", baseline: counterparty.ead },
      { id: "maturity", name: "Maturity", description: "Effective Maturity", baseline: counterparty.maturity },
      { id: "ttcPd", name: "TTC PD", description: "Through-the-Cycle PD", baseline: counterparty.ttcPd },
    ],
    [counterparty],
  )

  // Get the selected parameter details
  const selectedParameterDetails = useMemo(() => {
    return parameters.find((p) => p.id === selectedParameter) || parameters[0]
  }, [parameters, selectedParameter])

  // Calculate sensitivity data when parameters change
  const calculateSensitivityData = useCallback(() => {
    const baselineValue = selectedParameterDetails.baseline
    const baselineResult = calculateRWA(counterparty)
    setBaselineRWA(baselineResult.rwa)

    // Create baseline point data
    const baselinePointData = {
      parameterValue: baselineValue,
      rwa: baselineResult.rwa,
      rwaDensity: baselineResult.rwaDensity * 100,
      change: 0,
      k: baselineResult.k * 100,
      isBaseline: true,
    }
    setBaselinePoint(baselinePointData)

    let dataPoints = []

    if (customRange && customRangeValues.trim()) {
      // Parse custom range values
      const values = customRangeValues
        .split(",")
        .map((v) => v.trim())
        .filter((v) => v)
        .map((v) => {
          const parsed = Number.parseFloat(v)
          return isNaN(parsed) ? null : parsed
        })
        .filter((v) => v !== null)

      // Sort values
      values.sort((a, b) => a - b)

      // Generate data points for each custom value
      dataPoints = values.map((value) => {
        const modifiedCounterparty = { ...counterparty }
        modifiedCounterparty[selectedParameter] = value
        const result = calculateRWA(modifiedCounterparty)

        return {
          parameterValue: value,
          rwa: result.rwa,
          rwaDensity: result.rwaDensity * 100,
          change: ((result.rwa - baselineResult.rwa) / baselineResult.rwa) * 100,
          k: result.k * 100,
          isBaseline: Math.abs(value - baselineValue) < 0.0000001,
        }
      })
    } else {
      // Generate range of values
      const rangeValues = []
      const stepSize = (rangeMax - rangeMin) / (steps - 1)

      for (let i = 0; i < steps; i++) {
        const multiplier = rangeMin + i * stepSize
        let value

        if (rangeType === "percentage") {
          value = baselineValue * multiplier
        } else {
          value = baselineValue + multiplier
        }

        rangeValues.push(value)
      }

      // Generate data points for each value in the range
      dataPoints = rangeValues.map((value) => {
        const modifiedCounterparty = { ...counterparty }
        modifiedCounterparty[selectedParameter] = value
        const result = calculateRWA(modifiedCounterparty)

        return {
          parameterValue: value,
          rwa: result.rwa,
          rwaDensity: result.rwaDensity * 100,
          change: ((result.rwa - baselineResult.rwa) / baselineResult.rwa) * 100,
          k: result.k * 100,
          isBaseline: Math.abs(value - baselineValue) < 0.0000001,
        }
      })
    }

    // Ensure baseline is included in the data points
    if (!dataPoints.some((point) => Math.abs(point.parameterValue - baselineValue) < 0.0000001)) {
      dataPoints.push(baselinePointData)
      // Sort the data points by parameter value
      dataPoints.sort((a, b) => a.parameterValue - b.parameterValue)
    }

    setSensitivityData(dataPoints)
  }, [
    counterparty,
    customRange,
    customRangeValues,
    rangeMax,
    rangeMin,
    rangeType,
    selectedParameter,
    selectedParameterDetails.baseline,
    steps,
  ])

  // Calculate target RWA when target value changes
  const parseParameterValue = useCallback(
    (value) => {
      if (!value || value.trim() === "") return null

      try {
        if (selectedParameter === "pd" || selectedParameter === "lgd" || selectedParameter === "ttcPd") {
          // If the value contains %, remove it and convert from percentage to decimal
          if (typeof value === "string" && value.includes("%")) {
            return Number.parseFloat(value.replace("%", "")) / 100
          }
          return Number.parseFloat(value)
        } else if (selectedParameter === "ead") {
          // Remove $ and commas
          if (typeof value === "string") {
            return Number.parseFloat(value.replace(/[$,]/g, ""))
          }
          return Number.parseFloat(value)
        } else {
          return Number.parseFloat(value)
        }
      } catch (error) {
        console.error("Error parsing parameter value:", error)
        return null
      }
    },
    [selectedParameter],
  )

  const calculateTargetRWA = useCallback(() => {
    if (!showTarget || !targetValue || targetValue.trim() === "") {
      setTargetRWA(null)
      setTargetImpact(null)
      setTargetPoint(null)
      return
    }

    const parsedValue = parseParameterValue(targetValue)

    if (parsedValue === null || isNaN(parsedValue)) {
      setTargetRWA(null)
      setTargetImpact(null)
      setTargetPoint(null)
      return
    }

    const modifiedCounterparty = { ...counterparty }
    modifiedCounterparty[selectedParameter] = parsedValue

    try {
      const result = calculateRWA(modifiedCounterparty)
      const impact = ((result.rwa - baselineRWA) / baselineRWA) * 100

      setTargetRWA(result.rwa)
      setTargetImpact(impact)

      // Create target point data
      setTargetPoint({
        parameterValue: parsedValue,
        rwa: result.rwa,
        rwaDensity: result.rwaDensity * 100,
        change: impact,
        k: result.k * 100,
        isTarget: true,
      })
    } catch (error) {
      console.error("Error calculating target RWA:", error)
      setTargetRWA(null)
      setTargetImpact(null)
      setTargetPoint(null)
    }
  }, [showTarget, targetValue, counterparty, selectedParameter, baselineRWA, parseParameterValue])

  // Calculate sensitivity data when parameters change
  useEffect(() => {
    calculateSensitivityData()
  }, [calculateSensitivityData])

  // Calculate target RWA when relevant parameters change
  useEffect(() => {
    calculateTargetRWA()
  }, [calculateTargetRWA])

  // Reset target value when parameter changes
  useEffect(() => {
    setTargetValue("")
    setTargetRWA(null)
    setTargetImpact(null)
    setTargetPoint(null)
  }, [selectedParameter])

  // Format parameter value for display
  const formatParameterValue = useCallback(
    (value) => {
      if (selectedParameter === "pd" || selectedParameter === "lgd" || selectedParameter === "ttcPd") {
        return `${(value * 100).toFixed(2)}%`
      } else if (selectedParameter === "ead") {
        return `$${value.toLocaleString()}`
      } else {
        return value.toFixed(2)
      }
    },
    [selectedParameter],
  )

  // Handle target value input change
  const handleTargetValueChange = useCallback(
    (e) => {
      setTargetValue(e.target.value)

      // Try to parse the value immediately to check if it's valid
      try {
        if (e.target.value.trim() !== "") {
          let parsedValue

          // Parse based on parameter type
          if (selectedParameter === "pd" || selectedParameter === "lgd" || selectedParameter === "ttcPd") {
            // Handle percentage inputs (e.g., "1.5%")
            if (e.target.value.includes("%")) {
              parsedValue = Number.parseFloat(e.target.value.replace("%", "")) / 100
            } else {
              parsedValue = Number.parseFloat(e.target.value)
            }
          } else if (selectedParameter === "ead") {
            // Handle currency inputs (e.g., "$1,000,000")
            parsedValue = Number.parseFloat(e.target.value.replace(/[$,]/g, ""))
          } else {
            parsedValue = Number.parseFloat(e.target.value)
          }

          // Validate the parsed value
          if (!isNaN(parsedValue)) {
            console.log("Valid target value parsed:", parsedValue)
          }
        }
      } catch (error) {
        console.error("Error parsing target value:", error)
      }
    },
    [selectedParameter],
  )

  // Handle range type change
  const handleRangeTypeChange = useCallback((type) => {
    setRangeType(type)
    // Reset range values when changing type
    if (type === "percentage") {
      setRangeMin(0.2)
      setRangeMax(5.0)
    } else {
      setRangeMin(-0.5)
      setRangeMax(0.5)
    }
  }, [])

  // Reset to default range
  const resetToDefault = useCallback(() => {
    setRangeMin(0.5)
    setRangeMax(1.5)
    setSteps(10)
    setRangeType("percentage")
    setCustomRange(false)
    setCustomRangeValues("")
  }, [])

  // Handle custom range input change
  const handleCustomRangeChange = useCallback((e) => {
    setCustomRangeValues(e.target.value)
  }, [])

  // Prepare chart data with baseline and target points
  const chartData = useMemo(() => {
    const data = [...sensitivityData]

    // Ensure baseline point is included
    if (baselinePoint && !data.some((point) => point.isBaseline)) {
      data.push(baselinePoint)
    }

    // Add target point if it exists and isn't already in the data
    if (targetPoint && !data.some((point) => point.isTarget)) {
      data.push(targetPoint)
    }

    // Sort by parameter value
    return data.sort((a, b) => a.parameterValue - b.parameterValue)
  }, [sensitivityData, baselinePoint, targetPoint])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Parameter Selection</CardTitle>
            <CardDescription>Choose a parameter to analyze</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label>Select Parameter</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                  {parameters.map((param) => (
                    <Button
                      key={param.id}
                      variant={selectedParameter === param.id ? "default" : "outline"}
                      onClick={() => setSelectedParameter(param.id)}
                      className="w-full"
                    >
                      {param.name}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label>Range Type</Label>
                  <Button variant="ghost" size="sm" onClick={resetToDefault}>
                    <RotateCcw className="mr-2 h-3.5 w-3.5" />
                    Reset
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <Button
                    variant={rangeType === "percentage" ? "default" : "outline"}
                    onClick={() => handleRangeTypeChange("percentage")}
                    className="w-full"
                  >
                    Percentage
                  </Button>
                  <Button
                    variant={rangeType === "absolute" ? "default" : "outline"}
                    onClick={() => handleRangeTypeChange("absolute")}
                    className="w-full"
                  >
                    Absolute
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="custom-range"
                    checked={customRange}
                    onChange={(e) => setCustomRange(e.target.checked)}
                    className="mr-2"
                  />
                  <Label htmlFor="custom-range">Use Custom Range</Label>
                </div>

                {customRange ? (
                  <div>
                    <Label htmlFor="custom-values">Custom Values (comma separated)</Label>
                    <Input
                      id="custom-values"
                      value={customRangeValues}
                      onChange={handleCustomRangeChange}
                      placeholder="e.g., 0.01, 0.02, 0.05, 0.1"
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Enter raw values (not percentages). For PD, use 0.01 for 1%.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between">
                        <Label htmlFor="range-min">Min Multiplier</Label>
                        <span className="text-sm">
                          {rangeType === "percentage"
                            ? `${(rangeMin * 100).toFixed(0)}%`
                            : rangeType === "absolute" && selectedParameter === "pd"
                              ? `${(rangeMin * 100).toFixed(2)}%`
                              : rangeMin.toFixed(2)}
                        </span>
                      </div>
                      <input
                        type="range"
                        id="range-min"
                        min={rangeType === "percentage" ? 0 : -0.5}
                        max={rangeType === "percentage" ? 1 : 0}
                        step={0.01}
                        value={rangeMin}
                        onChange={(e) => setRangeMin(Number.parseFloat(e.target.value))}
                        className="w-full mt-1"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between">
                        <Label htmlFor="range-max">Max Multiplier</Label>
                        <span className="text-sm">
                          {rangeType === "percentage"
                            ? `${(rangeMax * 100).toFixed(0)}%`
                            : rangeType === "absolute" && selectedParameter === "pd"
                              ? `${(rangeMax * 100).toFixed(2)}%`
                              : rangeMax.toFixed(2)}
                        </span>
                      </div>
                      <input
                        type="range"
                        id="range-max"
                        min={rangeType === "percentage" ? 1 : 0}
                        max={rangeType === "percentage" ? 5 : 0.5}
                        step={0.01}
                        value={rangeMax}
                        onChange={(e) => setRangeMax(Number.parseFloat(e.target.value))}
                        className="w-full mt-1"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between">
                        <Label htmlFor="steps">Number of Steps</Label>
                        <span className="text-sm">{steps}</span>
                      </div>
                      <input
                        type="range"
                        id="steps"
                        min={3}
                        max={30}
                        step={1}
                        value={steps}
                        onChange={(e) => setSteps(Number.parseInt(e.target.value))}
                        className="w-full mt-1"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Target Value Section */}
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <Label htmlFor="show-target">Show Target Value</Label>
                  <Switch id="show-target" checked={showTarget} onCheckedChange={setShowTarget} />
                </div>

                {showTarget && (
                  <div className="space-y-2">
                    <Label htmlFor="target-value">Target {selectedParameterDetails.name} Value</Label>
                    <div className="flex gap-2">
                      <Input
                        id="target-value"
                        value={targetValue}
                        onChange={handleTargetValueChange}
                        placeholder={formatParameterValue(selectedParameterDetails.baseline)}
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setTargetValue(selectedParameterDetails.baseline.toString())}
                        title="Use current value"
                      >
                        <Target className="h-4 w-4" />
                      </Button>
                    </div>

                    {targetRWA !== null && (
                      <div className="mt-2 text-sm">
                        <div className="flex justify-between">
                          <span>Target RWA:</span>
                          <span className="font-medium">${Math.round(targetRWA).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Impact:</span>
                          <span className={`font-medium ${targetImpact >= 0 ? "text-red-600" : "text-green-600"}`}>
                            {targetImpact >= 0 ? "+" : ""}
                            {targetImpact.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle>Parameter Details</CardTitle>
            <CardDescription>Current values and sensitivity analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label>Parameter</Label>
                  <div className="font-medium text-lg">{selectedParameterDetails.name}</div>
                  <div className="text-sm text-muted-foreground">{selectedParameterDetails.description}</div>
                </div>
                <div className="space-y-1">
                  <Label>Current Value</Label>
                  <div className="font-medium text-lg">{formatParameterValue(selectedParameterDetails.baseline)}</div>
                  <div className="text-sm text-muted-foreground">Baseline value</div>
                </div>
                <div className="space-y-1">
                  <Label>Baseline RWA</Label>
                  <div className="font-medium text-lg">${Math.round(baselineRWA).toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Current risk-weighted assets</div>
                </div>
              </div>

              <div className="pt-2">
                <Label>Sensitivity Range</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {sensitivityData.map((point, index) => (
                    <Badge
                      key={index}
                      variant={point.change > 0 ? "outline" : "secondary"}
                      className={`${
                        point.isBaseline
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-400"
                          : point.change > 0
                            ? "bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300"
                            : "bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300"
                      }`}
                    >
                      {formatParameterValue(point.parameterValue)}
                      {point.isBaseline ? " (Baseline)" : `: ${point.change > 0 ? "+" : ""}${point.change.toFixed(2)}%`}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sensitivity Analysis Results</CardTitle>
          <CardDescription>
            Impact of changing {selectedParameterDetails.name} on RWA for {counterparty.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="rwa" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="rwa">RWA</TabsTrigger>
              <TabsTrigger value="density">RWA Density</TabsTrigger>
              <TabsTrigger value="k">Capital Requirement</TabsTrigger>
            </TabsList>
            <TabsContent value="rwa" className="pt-4">
              <div className="h-[400px]">
                <ChartWrapper>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={chartData}
                      margin={{
                        top: 5,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="parameterValue"
                        tickFormatter={formatParameterValue}
                        label={{
                          value: selectedParameterDetails.name,
                          position: "insideBottomRight",
                          offset: -10,
                        }}
                      />
                      <YAxis
                        tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`}
                        label={{ value: "RWA", angle: -90, position: "insideLeft" }}
                      />
                      <Tooltip
                        content={
                          <CustomTooltip
                            formatParameterValue={formatParameterValue}
                            baselineValue={selectedParameterDetails.baseline}
                            targetValue={targetPoint?.parameterValue || null}
                          />
                        }
                      />
                      <Legend />
                      <ReferenceLine
                        x={selectedParameterDetails.baseline}
                        stroke="#3b82f6"
                        strokeDasharray="3 3"
                        label={{ value: "Baseline", position: "top", fill: "#3b82f6" }}
                      />
                      {showTarget && targetPoint && (
                        <ReferenceLine
                          x={targetPoint.parameterValue}
                          stroke="#10b981"
                          strokeDasharray="3 3"
                          label={{ value: "Target", position: "top", fill: "#10b981" }}
                        />
                      )}
                      <Line
                        type="monotone"
                        dataKey="rwa"
                        name="RWA"
                        stroke="#8884d8"
                        activeDot={{ r: 8 }}
                        strokeWidth={2}
                      />
                      {/* Highlight baseline point */}
                      <Scatter
                        name="Baseline"
                        dataKey="rwa"
                        data={[baselinePoint].filter(Boolean)}
                        fill="#3b82f6"
                        shape="circle"
                        legendType="none"
                      >
                        {baselinePoint && (
                          <Scatter
                            cx={baselinePoint.parameterValue}
                            cy={baselinePoint.rwa}
                            r={8}
                            fill="#3b82f6"
                            stroke="#ffffff"
                            strokeWidth={2}
                          />
                        )}
                      </Scatter>
                      {/* Highlight target point if it exists */}
                      {targetPoint && (
                        <Scatter
                          name="Target"
                          dataKey="rwa"
                          data={[targetPoint]}
                          fill="#10b981"
                          shape="circle"
                          legendType="none"
                        >
                          <Scatter
                            cx={targetPoint.parameterValue}
                            cy={targetPoint.rwa}
                            r={8}
                            fill="#10b981"
                            stroke="#ffffff"
                            strokeWidth={2}
                          />
                        </Scatter>
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </ChartWrapper>
              </div>
            </TabsContent>
            <TabsContent value="density" className="pt-4">
              <div className="h-[400px]">
                <ChartWrapper>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={chartData}
                      margin={{
                        top: 5,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="parameterValue"
                        tickFormatter={formatParameterValue}
                        label={{
                          value: selectedParameterDetails.name,
                          position: "insideBottomRight",
                          offset: -10,
                        }}
                      />
                      <YAxis
                        tickFormatter={(value) => `${value.toFixed(1)}%`}
                        label={{ value: "RWA Density", angle: -90, position: "insideLeft" }}
                      />
                      <Tooltip
                        content={
                          <CustomTooltip
                            formatParameterValue={formatParameterValue}
                            baselineValue={selectedParameterDetails.baseline}
                            targetValue={targetPoint?.parameterValue || null}
                          />
                        }
                      />
                      <Legend />
                      <ReferenceLine
                        x={selectedParameterDetails.baseline}
                        stroke="#3b82f6"
                        strokeDasharray="3 3"
                        label={{ value: "Baseline", position: "top", fill: "#3b82f6" }}
                      />
                      {showTarget && targetPoint && (
                        <ReferenceLine
                          x={targetPoint.parameterValue}
                          stroke="#10b981"
                          strokeDasharray="3 3"
                          label={{ value: "Target", position: "top", fill: "#10b981" }}
                        />
                      )}
                      <Line
                        type="monotone"
                        dataKey="rwaDensity"
                        name="RWA Density"
                        stroke="#82ca9d"
                        activeDot={{ r: 8 }}
                        strokeWidth={2}
                      />
                      {/* Highlight baseline point */}
                      <Scatter
                        name="Baseline"
                        dataKey="rwaDensity"
                        data={[baselinePoint].filter(Boolean)}
                        fill="#3b82f6"
                        shape="circle"
                        legendType="none"
                      >
                        {baselinePoint && (
                          <Scatter
                            cx={baselinePoint.parameterValue}
                            cy={baselinePoint.rwaDensity}
                            r={8}
                            fill="#3b82f6"
                            stroke="#ffffff"
                            strokeWidth={2}
                          />
                        )}
                      </Scatter>
                      {/* Highlight target point if it exists */}
                      {targetPoint && (
                        <Scatter
                          name="Target"
                          dataKey="rwaDensity"
                          data={[targetPoint]}
                          fill="#10b981"
                          shape="circle"
                          legendType="none"
                        >
                          <Scatter
                            cx={targetPoint.parameterValue}
                            cy={targetPoint.rwaDensity}
                            r={8}
                            fill="#10b981"
                            stroke="#ffffff"
                            strokeWidth={2}
                          />
                        </Scatter>
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </ChartWrapper>
              </div>
            </TabsContent>
            <TabsContent value="k" className="pt-4">
              <div className="h-[400px]">
                <ChartWrapper>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={chartData}
                      margin={{
                        top: 5,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="parameterValue"
                        tickFormatter={formatParameterValue}
                        label={{
                          value: selectedParameterDetails.name,
                          position: "insideBottomRight",
                          offset: -10,
                        }}
                      />
                      <YAxis
                        tickFormatter={(value) => `${value.toFixed(2)}%`}
                        label={{ value: "Capital Requirement (K)", angle: -90, position: "insideLeft" }}
                      />
                      <Tooltip
                        content={
                          <CustomTooltip
                            formatParameterValue={formatParameterValue}
                            baselineValue={selectedParameterDetails.baseline}
                            targetValue={targetPoint?.parameterValue || null}
                          />
                        }
                      />
                      <Legend />
                      <ReferenceLine
                        x={selectedParameterDetails.baseline}
                        stroke="#3b82f6"
                        strokeDasharray="3 3"
                        label={{ value: "Baseline", position: "top", fill: "#3b82f6" }}
                      />
                      {showTarget && targetPoint && (
                        <ReferenceLine
                          x={targetPoint.parameterValue}
                          stroke="#10b981"
                          strokeDasharray="3 3"
                          label={{ value: "Target", position: "top", fill: "#10b981" }}
                        />
                      )}
                      <Line
                        type="monotone"
                        dataKey="k"
                        name="Capital Requirement"
                        stroke="#ffc658"
                        activeDot={{ r: 8 }}
                        strokeWidth={2}
                      />
                      {/* Highlight baseline point */}
                      <Scatter
                        name="Baseline"
                        dataKey="k"
                        data={[baselinePoint].filter(Boolean)}
                        fill="#3b82f6"
                        shape="circle"
                        legendType="none"
                      >
                        {baselinePoint && (
                          <Scatter
                            cx={baselinePoint.parameterValue}
                            cy={baselinePoint.k}
                            r={8}
                            fill="#3b82f6"
                            stroke="#ffffff"
                            strokeWidth={2}
                          />
                        )}
                      </Scatter>
                      {/* Highlight target point if it exists */}
                      {targetPoint && (
                        <Scatter
                          name="Target"
                          dataKey="k"
                          data={[targetPoint]}
                          fill="#10b981"
                          shape="circle"
                          legendType="none"
                        >
                          <Scatter
                            cx={targetPoint.parameterValue}
                            cy={targetPoint.k}
                            r={8}
                            fill="#10b981"
                            stroke="#ffffff"
                            strokeWidth={2}
                          />
                        </Scatter>
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </ChartWrapper>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
