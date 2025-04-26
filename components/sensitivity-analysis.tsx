"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { calculateRWA } from "@/lib/rwa-calculator"
import { calculateTtcPd } from "@/lib/ttc-pd-calculator"
import { creditRatings, getPdFromRating } from "@/lib/credit-ratings"
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
} from "@/components/ui/chart"
import { InfoIcon as InfoCircle } from "lucide-react"
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export function SensitivityAnalysis({ counterpartyData }) {
  const [activeTab, setActiveTab] = useState("basic")

  // Basic parameters
  const [pdMultiplier, setPdMultiplier] = useState(1)
  const [lgdMultiplier, setLgdMultiplier] = useState(1)
  const [eadMultiplier, setEadMultiplier] = useState(1)

  // Advanced parameters
  const [maturity, setMaturity] = useState(counterpartyData.maturity)
  const [macroeconomicIndex, setMacroeconomicIndex] = useState(counterpartyData.macroeconomicIndex)
  const [cyclicality, setCyclicality] = useState(counterpartyData.cyclicality)

  // Credit rating parameters
  const [selectedRating, setSelectedRating] = useState(counterpartyData.creditRating || "BBB")
  const [useRatingPd, setUseRatingPd] = useState(counterpartyData.useCredRatingPd || false)

  // Parameter info tooltips
  const parameterInfo = {
    pdMultiplier: {
      module: "PD Calculator",
      description: "Multiplier applied to the Point-in-Time Probability of Default",
    },
    lgdMultiplier: {
      module: "LGD Calculator",
      description: "Multiplier applied to the Loss Given Default percentage",
    },
    eadMultiplier: {
      module: "EAD Calculator",
      description: "Multiplier applied to the Exposure at Default amount",
    },
    maturity: {
      module: "Maturity Adjustment",
      description: "Effective maturity in years used to calculate the maturity adjustment factor",
    },
    macroeconomicIndex: {
      module: "TTC PD",
      description: "Economic conditions index (0-1) where 0 is recession and 1 is strong expansion",
    },
    cyclicality: {
      module: "TTC PD",
      description: "How sensitive the industry is to economic cycles (0-1)",
    },
    creditRating: {
      module: "Credit Review",
      description: "External credit rating assigned to the counterparty",
    },
    useRatingPd: {
      module: "Credit Review",
      description: "Whether to use the rating-based PD instead of the model TTC PD",
    },
  }

  // Generate sensitivity data points for basic parameters
  const pdSensitivity = Array.from({ length: 11 }, (_, i) => {
    const multiplier = 0.5 + i * 0.1
    const modifiedData = { ...counterpartyData, pd: counterpartyData.pd * multiplier }
    const result = calculateRWA(modifiedData)
    return {
      multiplier: multiplier.toFixed(1),
      rwa: result.rwa,
      pd: modifiedData.pd * 100,
    }
  })

  const lgdSensitivity = Array.from({ length: 11 }, (_, i) => {
    const multiplier = 0.5 + i * 0.1
    const modifiedData = { ...counterpartyData, lgd: counterpartyData.lgd * multiplier }
    const result = calculateRWA(modifiedData)
    return {
      multiplier: multiplier.toFixed(1),
      rwa: result.rwa,
      lgd: modifiedData.lgd * 100,
    }
  })

  const eadSensitivity = Array.from({ length: 11 }, (_, i) => {
    const multiplier = 0.5 + i * 0.1
    const modifiedData = { ...counterpartyData, ead: counterpartyData.ead * multiplier }
    const result = calculateRWA(modifiedData)
    return {
      multiplier: multiplier.toFixed(1),
      rwa: result.rwa,
      ead: modifiedData.ead,
    }
  })

  // Generate sensitivity data for advanced parameters
  const maturitySensitivity = Array.from({ length: 11 }, (_, i) => {
    const maturityValue = 0.5 + i * 0.5 // 0.5 to 5.5 years
    const modifiedData = { ...counterpartyData, maturity: maturityValue }
    const result = calculateRWA(modifiedData)
    return {
      value: maturityValue.toFixed(1),
      rwa: result.rwa,
      label: `${maturityValue.toFixed(1)} years`,
    }
  })

  const economicSensitivity = Array.from({ length: 11 }, (_, i) => {
    const indexValue = i * 0.1 // 0.0 to 1.0
    // Recalculate TTC PD with new economic index
    const ttcPdInputs = {
      pointInTimePd: counterpartyData.pd,
      macroeconomicIndex: indexValue,
      longTermAverage: counterpartyData.longTermAverage,
      cyclicality: counterpartyData.cyclicality,
    }
    const newTtcPd = calculateTtcPd(ttcPdInputs)
    const modifiedData = { ...counterpartyData, ttcPd: newTtcPd, macroeconomicIndex: indexValue }
    const result = calculateRWA(modifiedData)
    return {
      value: indexValue.toFixed(1),
      rwa: result.rwa,
      label: indexValue === 0.5 ? "Neutral" : indexValue < 0.5 ? "Recession" : "Expansion",
    }
  })

  const cyclicalitySensitivity = Array.from({ length: 11 }, (_, i) => {
    const cyclicalityValue = i * 0.1 // 0.0 to 1.0
    // Recalculate TTC PD with new cyclicality
    const ttcPdInputs = {
      pointInTimePd: counterpartyData.pd,
      macroeconomicIndex: counterpartyData.macroeconomicIndex,
      longTermAverage: counterpartyData.longTermAverage,
      cyclicality: cyclicalityValue,
    }
    const newTtcPd = calculateTtcPd(ttcPdInputs)
    const modifiedData = { ...counterpartyData, ttcPd: newTtcPd, cyclicality: cyclicalityValue }
    const result = calculateRWA(modifiedData)
    return {
      value: cyclicalityValue.toFixed(1),
      rwa: result.rwa,
      label: cyclicalityValue < 0.3 ? "Low" : cyclicalityValue < 0.7 ? "Medium" : "High",
    }
  })

  // Generate sensitivity data for credit ratings
  const ratingSensitivity = creditRatings
    .filter((_, i) => i % 2 === 0)
    .map((rating) => {
      const ratingPd = rating.pd
      const modifiedData = {
        ...counterpartyData,
        creditRating: rating.rating,
        creditRatingPd: ratingPd,
        useCredRatingPd: true,
      }
      const result = calculateRWA(modifiedData)
      return {
        value: rating.rating,
        rwa: result.rwa,
        pd: ratingPd * 100,
      }
    })

  // Calculate current RWA based on sliders and active tab
  let modifiedData = { ...counterpartyData }

  if (activeTab === "basic") {
    modifiedData = {
      ...counterpartyData,
      pd: counterpartyData.pd * pdMultiplier,
      lgd: counterpartyData.lgd * lgdMultiplier,
      ead: counterpartyData.ead * eadMultiplier,
    }
  } else if (activeTab === "advanced") {
    // Recalculate TTC PD with new parameters
    const ttcPdInputs = {
      pointInTimePd: counterpartyData.pd,
      macroeconomicIndex,
      longTermAverage: counterpartyData.longTermAverage,
      cyclicality,
    }
    const newTtcPd = calculateTtcPd(ttcPdInputs)

    modifiedData = {
      ...counterpartyData,
      ttcPd: newTtcPd,
      maturity,
      macroeconomicIndex,
      cyclicality,
    }
  } else if (activeTab === "rating") {
    const ratingPd = getPdFromRating(selectedRating)
    modifiedData = {
      ...counterpartyData,
      creditRating: selectedRating,
      creditRatingPd: ratingPd,
      useCredRatingPd: useRatingPd,
    }
  }

  const currentRWA = calculateRWA(modifiedData)
  const baselineRWA = calculateRWA(counterpartyData)
  const rwaChange = (currentRWA.rwa / baselineRWA.rwa - 1) * 100

  // Helper component for parameter labels with tooltips
  const ParameterLabel = ({ htmlFor, children, paramKey }) => {
    const info = parameterInfo[paramKey]
    return (
      <div className="flex items-center gap-1">
        <Label htmlFor={htmlFor}>{children}</Label>
        <TooltipProvider>
          <UITooltip>
            <TooltipTrigger asChild>
              <InfoCircle className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <div className="font-medium text-xs mb-1">Module: {info.module}</div>
              <div className="text-xs">{info.description}</div>
            </TooltipContent>
          </UITooltip>
        </TooltipProvider>
      </div>
    )
  }

  return (
    <div className="grid gap-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="basic">Basic Parameters</TabsTrigger>
          <TabsTrigger value="advanced">Advanced Parameters</TabsTrigger>
          <TabsTrigger value="rating">Credit Rating</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Parameter Adjustments</CardTitle>
              <CardDescription>Adjust risk parameters to see how they affect the RWA calculation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <ParameterLabel htmlFor="pd-slider" paramKey="pdMultiplier">
                    PD Multiplier: {pdMultiplier.toFixed(2)}x
                  </ParameterLabel>
                  <span className="text-sm font-medium">{(counterpartyData.pd * pdMultiplier * 100).toFixed(2)}%</span>
                </div>
                <Slider
                  id="pd-slider"
                  min={0.5}
                  max={1.5}
                  step={0.01}
                  value={[pdMultiplier]}
                  onValueChange={(value) => setPdMultiplier(value[0])}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <ParameterLabel htmlFor="lgd-slider" paramKey="lgdMultiplier">
                    LGD Multiplier: {lgdMultiplier.toFixed(2)}x
                  </ParameterLabel>
                  <span className="text-sm font-medium">
                    {(counterpartyData.lgd * lgdMultiplier * 100).toFixed(2)}%
                  </span>
                </div>
                <Slider
                  id="lgd-slider"
                  min={0.5}
                  max={1.5}
                  step={0.01}
                  value={[lgdMultiplier]}
                  onValueChange={(value) => setLgdMultiplier(value[0])}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <ParameterLabel htmlFor="ead-slider" paramKey="eadMultiplier">
                    EAD Multiplier: {eadMultiplier.toFixed(2)}x
                  </ParameterLabel>
                  <span className="text-sm font-medium">
                    ${Math.round(counterpartyData.ead * eadMultiplier).toLocaleString()}
                  </span>
                </div>
                <Slider
                  id="ead-slider"
                  min={0.5}
                  max={1.5}
                  step={0.01}
                  value={[eadMultiplier]}
                  onValueChange={(value) => setEadMultiplier(value[0])}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Parameter Adjustments</CardTitle>
              <CardDescription>
                Adjust advanced risk parameters to see how they affect the RWA calculation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <ParameterLabel htmlFor="maturity-slider" paramKey="maturity">
                    Effective Maturity: {maturity.toFixed(2)} years
                  </ParameterLabel>
                </div>
                <Slider
                  id="maturity-slider"
                  min={0.5}
                  max={5.5}
                  step={0.1}
                  value={[maturity]}
                  onValueChange={(value) => setMaturity(value[0])}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <ParameterLabel htmlFor="economic-slider" paramKey="macroeconomicIndex">
                    Economic Index: {macroeconomicIndex.toFixed(2)}
                  </ParameterLabel>
                  <span className="text-sm font-medium">
                    {macroeconomicIndex < 0.4 ? "Recession" : macroeconomicIndex > 0.6 ? "Expansion" : "Neutral"}
                  </span>
                </div>
                <Slider
                  id="economic-slider"
                  min={0}
                  max={1}
                  step={0.01}
                  value={[macroeconomicIndex]}
                  onValueChange={(value) => setMacroeconomicIndex(value[0])}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <ParameterLabel htmlFor="cyclicality-slider" paramKey="cyclicality">
                    Industry Cyclicality: {cyclicality.toFixed(2)}
                  </ParameterLabel>
                  <span className="text-sm font-medium">
                    {cyclicality < 0.3 ? "Low" : cyclicality < 0.7 ? "Medium" : "High"}
                  </span>
                </div>
                <Slider
                  id="cyclicality-slider"
                  min={0}
                  max={1}
                  step={0.01}
                  value={[cyclicality]}
                  onValueChange={(value) => setCyclicality(value[0])}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rating" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Credit Rating Adjustments</CardTitle>
              <CardDescription>Adjust credit rating to see how it affects the RWA calculation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <ParameterLabel htmlFor="rating" paramKey="creditRating">
                  Credit Rating
                </ParameterLabel>
                <Select value={selectedRating} onValueChange={setSelectedRating}>
                  <SelectTrigger id="rating">
                    <SelectValue placeholder="Select rating" />
                  </SelectTrigger>
                  <SelectContent>
                    {creditRatings.map((rating) => (
                      <SelectItem key={rating.rating} value={rating.rating}>
                        {rating.rating} ({(rating.pd * 100).toFixed(4)}%)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <ParameterLabel htmlFor="use-rating" paramKey="useRatingPd">
                    Use Rating PD for Calculation
                  </ParameterLabel>
                  <Switch id="use-rating" checked={useRatingPd} onCheckedChange={setUseRatingPd} />
                </div>
                <div className="text-sm text-muted-foreground">
                  {useRatingPd
                    ? `Using credit rating PD: ${(getPdFromRating(selectedRating) * 100).toFixed(4)}%`
                    : `Using model TTC PD: ${(counterpartyData.ttcPd * 100).toFixed(4)}%`}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>RWA Impact</CardTitle>
          <CardDescription>Effect of parameter changes on Risk-Weighted Assets</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Current RWA</div>
              <div className="text-2xl font-bold">${Math.round(currentRWA.rwa).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Change from Baseline</div>
              <div className={`text-2xl font-bold ${rwaChange >= 0 ? "text-green-600" : "text-red-600"}`}>
                {rwaChange >= 0 ? "+" : ""}
                {rwaChange.toFixed(2)}%
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sensitivity Analysis</CardTitle>
          <CardDescription>How RWA changes with different parameter values</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ChartWrapper>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey={activeTab === "basic" ? "multiplier" : "value"}
                    type="category"
                    allowDuplicatedCategory={false}
                    label={{
                      value:
                        activeTab === "basic"
                          ? "Parameter Multiplier"
                          : activeTab === "rating"
                            ? "Credit Rating"
                            : "Parameter Value",
                      position: "insideBottom",
                      offset: -5,
                    }}
                  />
                  <YAxis label={{ value: "RWA", angle: -90, position: "insideLeft" }} />
                  <Tooltip
                    formatter={(value, name) => {
                      if (name === "RWA") return [`${Math.round(value).toLocaleString()}`, "RWA"]
                      return [value, name]
                    }}
                  />
                  <Legend />
                  {activeTab === "basic" && (
                    <>
                      <Line
                        name="PD Sensitivity"
                        data={pdSensitivity}
                        dataKey="rwa"
                        stroke="#f97316"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                      <Line
                        name="LGD Sensitivity"
                        data={lgdSensitivity}
                        dataKey="rwa"
                        stroke="#8b5cf6"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                      <Line
                        name="EAD Sensitivity"
                        data={eadSensitivity}
                        dataKey="rwa"
                        stroke="#06b6d4"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </>
                  )}
                  {activeTab === "advanced" && (
                    <>
                      <Line
                        name="Maturity Sensitivity"
                        data={maturitySensitivity}
                        dataKey="rwa"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                      <Line
                        name="Economic Index Sensitivity"
                        data={economicSensitivity}
                        dataKey="rwa"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                      <Line
                        name="Cyclicality Sensitivity"
                        data={cyclicalitySensitivity}
                        dataKey="rwa"
                        stroke="#ec4899"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </>
                  )}
                  {activeTab === "rating" && (
                    <Line
                      name="Credit Rating Sensitivity"
                      data={ratingSensitivity}
                      dataKey="rwa"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </ChartWrapper>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
