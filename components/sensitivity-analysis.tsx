"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { InfoIcon as InfoCircle, RotateCcw } from "lucide-react"
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export function SensitivityAnalysis({ counterpartyData }) {
  const [activeTab, setActiveTab] = useState("basic")

  // Before calling calculateRWA, ensure counterparty is defined
  const safeCounterparty = counterpartyData || {
    useCredRatingPd: false,
    pd: 0.01,
    lgd: 0.45,
    ead: 1000000,
    maturity: 2.5,
    macroeconomicIndex: 0.5,
    longTermAverage: 0.02,
    cyclicality: 0.5,
    creditRating: "BBB",
    creditRatingPd: 0.01,
    // Add other default properties as needed
  }

  // Calculate baseline RWA for comparison - memoize this to prevent recalculation
  const baselineRWA = calculateRWA(safeCounterparty).rwa

  // Default values for resetting - exact values from counterparty data
  const defaultValues = {
    pdMultiplier: 1,
    lgdMultiplier: 1,
    eadMultiplier: 1,
    ttcPdMultiplier: 1,
    maturity: safeCounterparty.maturity,
    macroeconomicIndex: safeCounterparty.macroeconomicIndex,
    cyclicality: safeCounterparty.cyclicality,
    selectedRating: safeCounterparty.creditRating || "BBB",
    useRatingPd: safeCounterparty.useCredRatingPd || false,
  }

  // Basic parameters
  const [pdMultiplier, setPdMultiplier] = useState(defaultValues.pdMultiplier)
  const [lgdMultiplier, setLgdMultiplier] = useState(defaultValues.lgdMultiplier)
  const [eadMultiplier, setEadMultiplier] = useState(defaultValues.eadMultiplier)
  const [ttcPdMultiplier, setTtcPdMultiplier] = useState(defaultValues.ttcPdMultiplier)

  // Advanced parameters
  const [maturity, setMaturity] = useState(defaultValues.maturity)
  const [macroeconomicIndex, setMacroeconomicIndex] = useState(defaultValues.macroeconomicIndex)
  const [cyclicality, setCyclicality] = useState(defaultValues.cyclicality)

  // Credit rating parameters
  const [selectedRating, setSelectedRating] = useState(defaultValues.selectedRating)
  const [useRatingPd, setUseRatingPd] = useState(defaultValues.useRatingPd)

  // Chart data state
  const [chartData, setChartData] = useState({
    basic: {
      pdSensitivity: [],
      lgdSensitivity: [],
      eadSensitivity: [],
      ttcPdSensitivity: [],
    },
    advanced: {
      maturitySensitivity: [],
      economicSensitivity: [],
      cyclicalitySensitivity: [],
    },
    rating: {
      ratingSensitivity: [],
    },
  })

  // Range analysis state
  const [rangeAnalysisEnabled, setRangeAnalysisEnabled] = useState(false)
  const [rangeParameter, setRangeParameter] = useState("ttcPd")
  const [rangeIncrement, setRangeIncrement] = useState(0.0001) // 1 basis point
  const [rangeMax, setRangeMax] = useState(0.02) // 2%
  const [rangeAnalysisData, setRangeAnalysisData] = useState([])

  // Parameter info tooltips
  const parameterInfo = {
    // Basic parameters
    pdMultiplier: {
      module: "PD Calculator",
      description:
        "Multiplier applied to the Point-in-Time Probability of Default. Adjusting this affects the likelihood of counterparty default.",
    },
    ttcPdMultiplier: {
      module: "TTC PD Calculator",
      description:
        "Multiplier applied to the Through-The-Cycle Probability of Default. This directly affects the PD used in RWA calculations.",
    },
    lgdMultiplier: {
      module: "LGD Calculator",
      description:
        "Multiplier applied to the Loss Given Default percentage. This affects how much exposure is lost when a default occurs.",
    },
    eadMultiplier: {
      module: "EAD Calculator",
      description:
        "Multiplier applied to the Exposure at Default amount. This adjusts the total exposure value at risk.",
    },

    // Advanced parameters
    maturity: {
      module: "Maturity Adjustment",
      description:
        "Effective maturity in years used to calculate the maturity adjustment factor. Longer maturities generally increase risk.",
    },
    macroeconomicIndex: {
      module: "TTC PD Calculator",
      description:
        "Economic conditions index (0-1) where 0 is recession and 1 is strong expansion. Affects the through-the-cycle PD calculation.",
    },
    cyclicality: {
      module: "TTC PD Calculator",
      description:
        "How sensitive the industry is to economic cycles (0-1). Higher values indicate greater sensitivity to economic changes.",
    },

    // Rating parameters
    creditRating: {
      module: "Credit Review",
      description:
        "External credit rating assigned to the counterparty. Each rating corresponds to a specific probability of default.",
    },
    useRatingPd: {
      module: "Credit Review",
      description: "Whether to use the rating-based PD instead of the model TTC PD in RWA calculations.",
    },
  }

  // Reset parameters to default values
  const resetToDefault = () => {
    switch (activeTab) {
      case "basic":
        setPdMultiplier(defaultValues.pdMultiplier)
        setLgdMultiplier(defaultValues.lgdMultiplier)
        setEadMultiplier(defaultValues.eadMultiplier)
        setTtcPdMultiplier(defaultValues.ttcPdMultiplier)
        break
      case "advanced":
        setMaturity(defaultValues.maturity)
        setMacroeconomicIndex(defaultValues.macroeconomicIndex)
        setCyclicality(defaultValues.cyclicality)
        break
      case "rating":
        setSelectedRating(defaultValues.selectedRating)
        setUseRatingPd(defaultValues.useRatingPd)
        break
    }
  }

  // Get available range parameters based on active tab
  const getAvailableRangeParameters = useCallback(() => {
    switch (activeTab) {
      case "basic":
        return [
          { value: "pd", label: "Point-in-Time PD" },
          { value: "ttcPd", label: "Through-The-Cycle PD" },
          { value: "lgd", label: "Loss Given Default" },
          { value: "ead", label: "Exposure at Default" },
        ]
      case "advanced":
        return [
          { value: "maturity", label: "Maturity" },
          { value: "macroeconomicIndex", label: "Economic Index" },
          { value: "cyclicality", label: "Cyclicality" },
        ]
      case "rating":
        return [{ value: "creditRating", label: "Credit Rating" }]
      default:
        return []
    }
  }, [activeTab])

  // Update range parameter when tab changes
  useEffect(() => {
    const availableParams = getAvailableRangeParameters()
    // Check if current parameter is valid for this tab
    const isCurrentParamValid = availableParams.some((param) => param.value === rangeParameter)

    if (!isCurrentParamValid && availableParams.length > 0) {
      // Reset to first available parameter for this tab
      setRangeParameter(availableParams[0].value)

      // Reset range analysis data
      setRangeAnalysisData([])

      // Set appropriate defaults for the new parameter type
      if (availableParams[0].value === "maturity") {
        setRangeIncrement(0.25) // 0.25 years
        setRangeMax(2) // 2 years
      } else if (availableParams[0].value === "macroeconomicIndex" || availableParams[0].value === "cyclicality") {
        setRangeIncrement(0.05) // 0.05 units
        setRangeMax(0.5) // 0.5 units
      } else if (availableParams[0].value === "creditRating") {
        setRangeIncrement(1) // 1 rating step
        setRangeMax(3) // 3 rating steps
      } else {
        setRangeIncrement(0.0001) // 1 basis point
        setRangeMax(0.02) // 2%
      }
    }
  }, [activeTab, getAvailableRangeParameters, rangeParameter])

  // Generate sensitivity data - only when counterpartyData changes
  useEffect(() => {
    // Generate sensitivity data points for basic parameters
    const pdSensitivity = Array.from({ length: 11 }, (_, i) => {
      const multiplier = 0.5 + i * 0.1
      const modifiedPd = safeCounterparty.pd * multiplier

      // Recalculate TTC PD with the modified PD
      const ttcPdInputs = {
        pointInTimePd: modifiedPd,
        macroeconomicIndex: safeCounterparty.macroeconomicIndex,
        longTermAverage: safeCounterparty.longTermAverage,
        cyclicality: safeCounterparty.cyclicality,
      }
      const newTtcPd = calculateTtcPd(ttcPdInputs)

      const modifiedData = {
        ...safeCounterparty,
        pd: modifiedPd,
        ttcPd: newTtcPd,
      }
      const result = calculateRWA(modifiedData)
      return {
        multiplier: multiplier.toFixed(1),
        rwa: result.rwa,
        pd: modifiedPd * 100,
      }
    })

    const ttcPdSensitivity = Array.from({ length: 11 }, (_, i) => {
      const multiplier = 0.5 + i * 0.1
      const modifiedTtcPd = safeCounterparty.ttcPd * multiplier

      const modifiedData = {
        ...safeCounterparty,
        ttcPd: modifiedTtcPd,
      }
      const result = calculateRWA(modifiedData)
      return {
        multiplier: multiplier.toFixed(1),
        rwa: result.rwa,
        ttcPd: modifiedTtcPd * 100,
      }
    })

    const lgdSensitivity = Array.from({ length: 11 }, (_, i) => {
      const multiplier = 0.5 + i * 0.1
      const modifiedData = { ...safeCounterparty, lgd: safeCounterparty.lgd * multiplier }
      const result = calculateRWA(modifiedData)
      return {
        multiplier: multiplier.toFixed(1),
        rwa: result.rwa,
        lgd: modifiedData.lgd * 100,
      }
    })

    const eadSensitivity = Array.from({ length: 11 }, (_, i) => {
      const multiplier = 0.5 + i * 0.1
      const modifiedData = { ...safeCounterparty, ead: safeCounterparty.ead * multiplier }
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
      const modifiedData = { ...safeCounterparty, maturity: maturityValue }
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
        pointInTimePd: safeCounterparty.pd,
        macroeconomicIndex: indexValue,
        longTermAverage: safeCounterparty.longTermAverage,
        cyclicality: safeCounterparty.cyclicality,
      }
      const newTtcPd = calculateTtcPd(ttcPdInputs)
      const modifiedData = { ...safeCounterparty, ttcPd: newTtcPd, macroeconomicIndex: indexValue }
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
        pointInTimePd: safeCounterparty.pd,
        macroeconomicIndex: safeCounterparty.macroeconomicIndex,
        longTermAverage: safeCounterparty.longTermAverage,
        cyclicality: cyclicalityValue,
      }
      const newTtcPd = calculateTtcPd(ttcPdInputs)
      const modifiedData = { ...safeCounterparty, ttcPd: newTtcPd, cyclicality: cyclicalityValue }
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
          ...safeCounterparty,
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

    setChartData({
      basic: {
        pdSensitivity,
        lgdSensitivity,
        eadSensitivity,
        ttcPdSensitivity,
      },
      advanced: {
        maturitySensitivity,
        economicSensitivity,
        cyclicalitySensitivity,
      },
      rating: {
        ratingSensitivity,
      },
    })
  }, [safeCounterparty])

  // Calculate current RWA based on sliders and active tab - memoize this calculation
  const calculateCurrentRWA = useCallback(() => {
    let modifiedData = { ...safeCounterparty }

    if (activeTab === "basic") {
      // Only apply modifications if values differ from defaults
      if (pdMultiplier !== 1 || ttcPdMultiplier !== 1 || lgdMultiplier !== 1 || eadMultiplier !== 1) {
        // First calculate the modified PD
        const modifiedPd = safeCounterparty.pd * pdMultiplier

        // Recalculate TTC PD with the modified PD if PD multiplier is not default
        let newTtcPd = safeCounterparty.ttcPd
        if (pdMultiplier !== 1) {
          const ttcPdInputs = {
            pointInTimePd: modifiedPd,
            macroeconomicIndex: safeCounterparty.macroeconomicIndex,
            longTermAverage: safeCounterparty.longTermAverage,
            cyclicality: safeCounterparty.cyclicality,
          }
          newTtcPd = calculateTtcPd(ttcPdInputs)
        }

        // Apply TTC PD multiplier directly
        if (ttcPdMultiplier !== 1) {
          newTtcPd = newTtcPd * ttcPdMultiplier
        }

        modifiedData = {
          ...safeCounterparty,
          pd: modifiedPd,
          ttcPd: newTtcPd,
          lgd: safeCounterparty.lgd * lgdMultiplier,
          ead: safeCounterparty.ead * eadMultiplier,
        }
      }
    } else if (activeTab === "advanced") {
      // Only apply modifications if values differ from defaults
      if (
        maturity !== safeCounterparty.maturity ||
        macroeconomicIndex !== safeCounterparty.macroeconomicIndex ||
        cyclicality !== safeCounterparty.cyclicality
      ) {
        // Recalculate TTC PD with new parameters
        const ttcPdInputs = {
          pointInTimePd: safeCounterparty.pd,
          macroeconomicIndex,
          longTermAverage: safeCounterparty.longTermAverage,
          cyclicality,
        }
        const newTtcPd = calculateTtcPd(ttcPdInputs)

        modifiedData = {
          ...safeCounterparty,
          ttcPd: newTtcPd,
          maturity,
          macroeconomicIndex,
          cyclicality,
        }
      }
    } else if (activeTab === "rating") {
      // Only apply modifications if values differ from defaults
      if (
        selectedRating !== (safeCounterparty.creditRating || "BBB") ||
        useRatingPd !== (safeCounterparty.useCredRatingPd || false)
      ) {
        const ratingPd = getPdFromRating(selectedRating)
        modifiedData = {
          ...safeCounterparty,
          creditRating: selectedRating,
          creditRatingPd: ratingPd,
          useCredRatingPd: useRatingPd,
        }
      }
    }

    return calculateRWA(modifiedData)
  }, [
    activeTab,
    safeCounterparty,
    pdMultiplier,
    ttcPdMultiplier,
    lgdMultiplier,
    eadMultiplier,
    maturity,
    macroeconomicIndex,
    cyclicality,
    selectedRating,
    useRatingPd,
  ])

  // Generate data for range analysis
  const generateRangeAnalysisData = useCallback(() => {
    if (!rangeAnalysisEnabled || !rangeParameter) return

    // Special handling for credit rating
    if (rangeParameter === "creditRating") {
      generateCreditRatingRangeAnalysis()
      return
    }

    const baseValue = (() => {
      switch (rangeParameter) {
        case "pd":
          return safeCounterparty.pd
        case "ttcPd":
          return safeCounterparty.ttcPd
        case "lgd":
          return safeCounterparty.lgd
        case "ead":
          return safeCounterparty.ead
        case "maturity":
          return safeCounterparty.maturity
        case "macroeconomicIndex":
          return safeCounterparty.macroeconomicIndex
        case "cyclicality":
          return safeCounterparty.cyclicality
        default:
          return 0
      }
    })()

    // Determine max value based on parameter type
    const actualMaxValue = (() => {
      if (rangeParameter === "macroeconomicIndex" || rangeParameter === "cyclicality") {
        return Math.min(1, baseValue + rangeMax)
      } else if (rangeParameter === "maturity") {
        return baseValue + rangeMax
      } else if (rangeParameter === "ead") {
        return baseValue * (1 + rangeMax)
      } else {
        // For PD and LGD, convert from percentage to decimal
        return Math.min(1, baseValue + rangeMax)
      }
    })()

    // Calculate number of steps
    const steps = Math.floor((actualMaxValue - baseValue) / rangeIncrement) + 1

    // Generate data points
    const data = []
    for (let i = 0; i < steps; i++) {
      const paramValue = baseValue + i * rangeIncrement

      // Skip if we've exceeded the max value
      if (paramValue > actualMaxValue) break

      // Create modified data for this parameter value
      const modifiedData = { ...safeCounterparty }

      // Apply the parameter value
      switch (rangeParameter) {
        case "pd":
          modifiedData.pd = paramValue
          // Recalculate TTC PD
          const ttcPdInputs = {
            pointInTimePd: paramValue,
            macroeconomicIndex: modifiedData.macroeconomicIndex,
            longTermAverage: modifiedData.longTermAverage,
            cyclicality: modifiedData.cyclicality,
          }
          modifiedData.ttcPd = calculateTtcPd(ttcPdInputs)
          break
        case "ttcPd":
          modifiedData.ttcPd = paramValue
          break
        case "lgd":
          modifiedData.lgd = paramValue
          break
        case "ead":
          modifiedData.ead = paramValue
          break
        case "maturity":
          modifiedData.maturity = paramValue
          break
        case "macroeconomicIndex":
          modifiedData.macroeconomicIndex = paramValue
          // Recalculate TTC PD
          const ttcInputs = {
            pointInTimePd: modifiedData.pd,
            macroeconomicIndex: paramValue,
            longTermAverage: modifiedData.longTermAverage,
            cyclicality: modifiedData.cyclicality,
          }
          modifiedData.ttcPd = calculateTtcPd(ttcInputs)
          break
        case "cyclicality":
          modifiedData.cyclicality = paramValue
          // Recalculate TTC PD
          const ttcCyclicalityInputs = {
            pointInTimePd: modifiedData.pd,
            macroeconomicIndex: modifiedData.macroeconomicIndex,
            longTermAverage: modifiedData.longTermAverage,
            cyclicality: paramValue,
          }
          modifiedData.ttcPd = calculateTtcPd(ttcCyclicalityInputs)
          break
      }

      // Calculate RWA for this parameter value
      const result = calculateRWA(modifiedData)

      // Format parameter value for display
      let displayValue
      if (rangeParameter === "pd" || rangeParameter === "ttcPd" || rangeParameter === "lgd") {
        displayValue = (paramValue * 100).toFixed(4) + "%"
      } else if (rangeParameter === "ead") {
        displayValue = "$" + Math.round(paramValue).toLocaleString()
      } else if (rangeParameter === "maturity") {
        displayValue = paramValue.toFixed(2) + " years"
      } else {
        displayValue = paramValue.toFixed(2)
      }

      // Add data point
      data.push({
        paramValue,
        displayValue,
        rwa: result.rwa,
        rwaDensity: (result.rwa / modifiedData.ead) * 100,
        increment: i,
      })
    }

    setRangeAnalysisData(data)
  }, [safeCounterparty, rangeAnalysisEnabled, rangeParameter, rangeIncrement, rangeMax])

  // Generate credit rating range analysis
  const generateCreditRatingRangeAnalysis = useCallback(() => {
    // Find current rating index
    const currentRatingIndex = creditRatings.findIndex((r) => r.rating === selectedRating)
    if (currentRatingIndex === -1) return

    // Determine how many steps to go up (worse ratings)
    const steps = Math.min(Math.floor(rangeMax), creditRatings.length - currentRatingIndex - 1)

    const data = []

    // Add current rating
    const baseData = { ...safeCounterparty }
    baseData.creditRating = selectedRating
    baseData.creditRatingPd = getPdFromRating(selectedRating)
    baseData.useCredRatingPd = true

    let result = calculateRWA(baseData)
    data.push({
      paramValue: currentRatingIndex,
      displayValue: `${selectedRating} (${(baseData.creditRatingPd * 100).toFixed(4)}%)`,
      rwa: result.rwa,
      rwaDensity: (result.rwa / baseData.ead) * 100,
      increment: 0,
    })

    // Add worse ratings
    for (let i = 1; i <= steps; i++) {
      const ratingIndex = currentRatingIndex + i
      if (ratingIndex >= creditRatings.length) break

      const rating = creditRatings[ratingIndex]
      const modifiedData = { ...safeCounterparty }
      modifiedData.creditRating = rating.rating
      modifiedData.creditRatingPd = rating.pd
      modifiedData.useCredRatingPd = true

      result = calculateRWA(modifiedData)
      data.push({
        paramValue: ratingIndex,
        displayValue: `${rating.rating} (${(rating.pd * 100).toFixed(4)}%)`,
        rwa: result.rwa,
        rwaDensity: (result.rwa / modifiedData.ead) * 100,
        increment: i,
      })
    }

    setRangeAnalysisData(data)
  }, [safeCounterparty, selectedRating, rangeMax])

  // Format parameter name for display
  const formatParameterName = (param) => {
    switch (param) {
      case "pd":
        return "Point-in-Time PD"
      case "ttcPd":
        return "Through-The-Cycle PD"
      case "lgd":
        return "Loss Given Default"
      case "ead":
        return "Exposure at Default"
      case "maturity":
        return "Maturity"
      case "macroeconomicIndex":
        return "Economic Index"
      case "cyclicality":
        return "Cyclicality"
      case "creditRating":
        return "Credit Rating"
      default:
        return param
    }
  }

  // Parse input value based on parameter type
  const parseRangeInput = (value, param) => {
    if (param === "rangeIncrement") {
      if (rangeParameter === "creditRating") {
        // For credit rating, use integer steps
        return Math.max(1, Number.parseInt(value))
      } else if (rangeParameter === "pd" || rangeParameter === "ttcPd" || rangeParameter === "lgd") {
        // For increment, convert from basis points to decimal
        return Number.parseFloat(value) / 10000
      } else if (rangeParameter === "ead") {
        // For EAD, use absolute values
        return Number.parseFloat(value)
      } else {
        // For other parameters, use direct values
        return Number.parseFloat(value)
      }
    } else if (param === "rangeMax") {
      if (rangeParameter === "creditRating") {
        // For credit rating, use integer steps
        return Math.max(1, Number.parseInt(value))
      } else if (rangeParameter === "pd" || rangeParameter === "ttcPd" || rangeParameter === "lgd") {
        // For percentages, convert from percentage to decimal
        return Number.parseFloat(value) / 100
      } else if (rangeParameter === "ead") {
        // For EAD, use percentage of base value
        return Number.parseFloat(value) / 100
      } else {
        // For other parameters, use direct values
        return Number.parseFloat(value)
      }
    }
    return Number.parseFloat(value)
  }

  // Format input value based on parameter type
  const formatRangeInput = (value, param) => {
    if (param === "rangeIncrement") {
      if (rangeParameter === "creditRating") {
        // For credit rating, use integer steps
        return value.toString()
      } else if (rangeParameter === "pd" || rangeParameter === "ttcPd" || rangeParameter === "lgd") {
        // For increment, convert from decimal to basis points
        return (value * 10000).toString()
      } else if (rangeParameter === "ead") {
        // For EAD, use absolute values
        return value.toString()
      } else {
        // For other parameters, use direct values
        return value.toString()
      }
    } else if (param === "rangeMax") {
      if (rangeParameter === "creditRating") {
        // For credit rating, use integer steps
        return value.toString()
      } else if (rangeParameter === "pd" || rangeParameter === "ttcPd" || rangeParameter === "lgd") {
        // For percentages, convert from decimal to percentage
        return (value * 100).toString()
      } else if (rangeParameter === "ead") {
        // For EAD, use percentage of base value
        return (value * 100).toString()
      } else {
        // For other parameters, use direct values
        return value.toString()
      }
    }

    return value.toString()
  }

  // Calculate current RWA only when needed
  const currentRWA = calculateCurrentRWA()
  const rwaChange = (currentRWA.rwa / baselineRWA - 1) * 100

  // Helper component for parameter labels with tooltips
  const ParameterLabel = ({ htmlFor, children, paramKey }) => {
    const info = parameterInfo[paramKey]
    return (
      <div className="flex items-center gap-1">
        <Label htmlFor={htmlFor}>{children}</Label>
        <TooltipProvider delayDuration={0}>
          <UITooltip>
            <TooltipTrigger asChild>
              <div className="cursor-help">
                <InfoCircle className="h-4 w-4 text-muted-foreground" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" align="start" className="max-w-xs p-2 bg-popover text-popover-foreground">
              <div className="font-medium text-xs mb-1">Module: {info.module}</div>
              <div className="text-xs">{info.description}</div>
            </TooltipContent>
          </UITooltip>
        </TooltipProvider>
      </div>
    )
  }

  // Get current active chart data based on tab and parameters
  const getActiveChartData = useCallback(() => {
    if (activeTab === "basic") {
      return [
        {
          name: "PD Sensitivity",
          data: chartData.basic.pdSensitivity,
          color: "#f97316",
          active: true,
          currentValue: pdMultiplier.toFixed(1),
          dataKey: "multiplier",
        },
        {
          name: "TTC PD Sensitivity",
          data: chartData.basic.ttcPdSensitivity,
          color: "#ef4444",
          active: true,
          currentValue: ttcPdMultiplier.toFixed(1),
          dataKey: "multiplier",
        },
        {
          name: "LGD Sensitivity",
          data: chartData.basic.lgdSensitivity,
          color: "#8b5cf6",
          active: true,
          currentValue: lgdMultiplier.toFixed(1),
          dataKey: "multiplier",
        },
        {
          name: "EAD Sensitivity",
          data: chartData.basic.eadSensitivity,
          color: "#06b6d4",
          active: true,
          currentValue: eadMultiplier.toFixed(1),
          dataKey: "multiplier",
        },
      ]
    } else if (activeTab === "advanced") {
      return [
        {
          name: "Maturity Sensitivity",
          data: chartData.advanced.maturitySensitivity,
          color: "#f59e0b",
          active: true,
          currentValue: maturity.toFixed(1),
          dataKey: "value",
        },
        {
          name: "Economic Index Sensitivity",
          data: chartData.advanced.economicSensitivity,
          color: "#10b981",
          active: true,
          currentValue: macroeconomicIndex.toFixed(1),
          dataKey: "value",
        },
        {
          name: "Cyclicality Sensitivity",
          data: chartData.advanced.cyclicalitySensitivity,
          color: "#ec4899",
          active: true,
          currentValue: cyclicality.toFixed(1),
          dataKey: "value",
        },
      ]
    } else if (activeTab === "rating") {
      return [
        {
          name: "Credit Rating Sensitivity",
          data: chartData.rating.ratingSensitivity,
          color: "#8b5cf6",
          active: true,
          currentValue: selectedRating,
          dataKey: "value",
        },
      ]
    }
    return []
  }, [
    activeTab,
    chartData,
    pdMultiplier,
    ttcPdMultiplier,
    lgdMultiplier,
    eadMultiplier,
    maturity,
    macroeconomicIndex,
    cyclicality,
    selectedRating,
  ])

  const activeChartData = getActiveChartData()

  // Generate range analysis data when enabled or parameters change
  useEffect(() => {
    if (rangeAnalysisEnabled) {
      generateRangeAnalysisData()
    }
  }, [rangeAnalysisEnabled, rangeParameter, rangeIncrement, rangeMax, generateRangeAnalysisData])

  // Get range parameter input label based on parameter type
  const getRangeIncrementLabel = () => {
    if (rangeParameter === "pd" || rangeParameter === "ttcPd" || rangeParameter === "lgd") {
      return "Increment (basis points)"
    } else if (rangeParameter === "ead") {
      return "Increment ($)"
    } else if (rangeParameter === "maturity") {
      return "Increment (years)"
    } else if (rangeParameter === "creditRating") {
      return "Rating steps"
    } else {
      return "Increment (value)"
    }
  }

  // Get range max label based on parameter type
  const getRangeMaxLabel = () => {
    if (rangeParameter === "pd" || rangeParameter === "ttcPd" || rangeParameter === "lgd") {
      return "Maximum Range (%)"
    } else if (rangeParameter === "ead") {
      return "Maximum Range (% of EAD)"
    } else if (rangeParameter === "maturity") {
      return "Maximum Range (years)"
    } else if (rangeParameter === "creditRating") {
      return "Maximum Rating Steps"
    } else {
      return "Maximum Range (value)"
    }
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
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle>Parameter Adjustments</CardTitle>
                <CardDescription>Adjust risk parameters to see how they affect the RWA calculation</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={resetToDefault}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset to Default
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <ParameterLabel htmlFor="pd-slider" paramKey="pdMultiplier">
                    PD Multiplier: {pdMultiplier.toFixed(2)}x
                  </ParameterLabel>
                  <span className="text-sm font-medium">{(safeCounterparty.pd * pdMultiplier * 100).toFixed(4)}%</span>
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
                  <ParameterLabel htmlFor="ttc-pd-slider" paramKey="ttcPdMultiplier">
                    TTC PD Multiplier: {ttcPdMultiplier.toFixed(2)}x
                  </ParameterLabel>
                  <span className="text-sm font-medium">
                    {(safeCounterparty.ttcPd * ttcPdMultiplier * 100).toFixed(4)}%
                  </span>
                </div>
                <Slider
                  id="ttc-pd-slider"
                  min={0.5}
                  max={1.5}
                  step={0.01}
                  value={[ttcPdMultiplier]}
                  onValueChange={(value) => setTtcPdMultiplier(value[0])}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <ParameterLabel htmlFor="lgd-slider" paramKey="lgdMultiplier">
                    LGD Multiplier: {lgdMultiplier.toFixed(2)}x
                  </ParameterLabel>
                  <span className="text-sm font-medium">
                    {(safeCounterparty.lgd * lgdMultiplier * 100).toFixed(2)}%
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
                    ${Math.round(safeCounterparty.ead * eadMultiplier).toLocaleString()}
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

          {/* Range Analysis Card for Basic Parameters */}
          <Card className="mt-6">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle>Range Analysis</CardTitle>
                <CardDescription>Analyze parameter changes in small increments up to a specified range</CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <Label htmlFor="range-analysis-toggle">Enable</Label>
                <Switch
                  id="range-analysis-toggle"
                  checked={rangeAnalysisEnabled}
                  onCheckedChange={setRangeAnalysisEnabled}
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="range-parameter">Parameter to Analyze</Label>
                    <Select
                      id="range-parameter"
                      value={rangeParameter}
                      onValueChange={setRangeParameter}
                      disabled={!rangeAnalysisEnabled}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select parameter" />
                      </SelectTrigger>
                      <SelectContent>
                        {getAvailableRangeParameters().map((param) => (
                          <SelectItem key={param.value} value={param.value}>
                            {param.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="range-increment">{getRangeIncrementLabel()}</Label>
                    <Input
                      id="range-increment"
                      value={formatRangeInput(rangeIncrement, "rangeIncrement")}
                      onChange={(e) => setRangeIncrement(parseRangeInput(e.target.value, "rangeIncrement"))}
                      disabled={!rangeAnalysisEnabled}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="range-max">{getRangeMaxLabel()}</Label>
                    <Input
                      id="range-max"
                      value={formatRangeInput(rangeMax, "rangeMax")}
                      onChange={(e) => setRangeMax(parseRangeInput(e.target.value, "rangeMax"))}
                      disabled={!rangeAnalysisEnabled}
                    />
                  </div>

                  <div className="flex items-end">
                    <Button onClick={generateRangeAnalysisData} disabled={!rangeAnalysisEnabled}>
                      Generate Analysis
                    </Button>
                  </div>
                </div>

                {rangeAnalysisEnabled && rangeAnalysisData.length > 0 && (
                  <div className="mt-4">
                    <div className="text-sm font-medium mb-2">
                      Analysis of {formatParameterName(rangeParameter)} in{" "}
                      {rangeParameter === "creditRating"
                        ? `${rangeIncrement} rating step${rangeIncrement > 1 ? "s" : ""}`
                        : rangeParameter === "pd" || rangeParameter === "ttcPd" || rangeParameter === "lgd"
                          ? `${rangeIncrement * 10000} basis point`
                          : rangeParameter === "maturity"
                            ? `${rangeIncrement} year`
                            : `${rangeIncrement}`}{" "}
                      increments
                    </div>
                    <div className="h-[300px]">
                      <ChartWrapper>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                              dataKey="displayValue"
                              type="category"
                              label={{
                                value: formatParameterName(rangeParameter),
                                position: "insideBottom",
                                offset: -5,
                              }}
                            />
                            <YAxis
                              label={{ value: "RWA", angle: -90, position: "insideLeft" }}
                              tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`}
                            />
                            <YAxis
                              yAxisId={1}
                              orientation="right"
                              label={{ value: "RWA Density (%)", angle: 90, position: "insideRight" }}
                              tickFormatter={(value) => `${value.toFixed(0)}%`}
                            />
                            <Tooltip
                              formatter={(value, name) => {
                                if (name === "RWA") {
                                  return [`$${Math.round(value).toLocaleString()}`, name]
                                } else if (name === "RWA Density") {
                                  return [`${value.toFixed(2)}%`, name]
                                }
                                return [value, name]
                              }}
                            />
                            <Legend />
                            <Line
                              name="RWA"
                              data={rangeAnalysisData}
                              dataKey="rwa"
                              stroke="#8884d8"
                              strokeWidth={2}
                              dot={{ r: 1 }}
                              activeDot={{ r: 6 }}
                            />
                            <Line
                              name="RWA Density"
                              data={rangeAnalysisData}
                              dataKey="rwaDensity"
                              stroke="#82ca9d"
                              strokeWidth={2}
                              dot={{ r: 1 }}
                              activeDot={{ r: 6 }}
                              yAxisId={1}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </ChartWrapper>
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      Analysis shows RWA changes as {formatParameterName(rangeParameter)} increases from{" "}
                      {rangeAnalysisData[0]?.displayValue} to{" "}
                      {rangeAnalysisData[rangeAnalysisData.length - 1]?.displayValue}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle>Advanced Parameter Adjustments</CardTitle>
                <CardDescription>
                  Adjust advanced risk parameters to see how they affect the RWA calculation
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={resetToDefault}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset to Default
              </Button>
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

          {/* Range Analysis Card for Advanced Parameters */}
          <Card className="mt-6">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle>Range Analysis</CardTitle>
                <CardDescription>Analyze parameter changes in small increments up to a specified range</CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <Label htmlFor="range-analysis-toggle-advanced">Enable</Label>
                <Switch
                  id="range-analysis-toggle-advanced"
                  checked={rangeAnalysisEnabled}
                  onCheckedChange={setRangeAnalysisEnabled}
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="range-parameter-advanced">Parameter to Analyze</Label>
                    <Select
                      id="range-parameter-advanced"
                      value={rangeParameter}
                      onValueChange={setRangeParameter}
                      disabled={!rangeAnalysisEnabled}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select parameter" />
                      </SelectTrigger>
                      <SelectContent>
                        {getAvailableRangeParameters().map((param) => (
                          <SelectItem key={param.value} value={param.value}>
                            {param.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="range-increment-advanced">{getRangeIncrementLabel()}</Label>
                    <Input
                      id="range-increment-advanced"
                      value={formatRangeInput(rangeIncrement, "rangeIncrement")}
                      onChange={(e) => setRangeIncrement(parseRangeInput(e.target.value, "rangeIncrement"))}
                      disabled={!rangeAnalysisEnabled}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="range-max-advanced">{getRangeMaxLabel()}</Label>
                    <Input
                      id="range-max-advanced"
                      value={formatRangeInput(rangeMax, "rangeMax")}
                      onChange={(e) => setRangeMax(parseRangeInput(e.target.value, "rangeMax"))}
                      disabled={!rangeAnalysisEnabled}
                    />
                  </div>

                  <div className="flex items-end">
                    <Button onClick={generateRangeAnalysisData} disabled={!rangeAnalysisEnabled}>
                      Generate Analysis
                    </Button>
                  </div>
                </div>

                {rangeAnalysisEnabled && rangeAnalysisData.length > 0 && (
                  <div className="mt-4">
                    <div className="text-sm font-medium mb-2">
                      Analysis of {formatParameterName(rangeParameter)} in{" "}
                      {rangeParameter === "maturity" ? `${rangeIncrement} year` : `${rangeIncrement}`} increments
                    </div>
                    <div className="h-[300px]">
                      <ChartWrapper>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                              dataKey="displayValue"
                              type="category"
                              label={{
                                value: formatParameterName(rangeParameter),
                                position: "insideBottom",
                                offset: -5,
                              }}
                            />
                            <YAxis
                              label={{ value: "RWA", angle: -90, position: "insideLeft" }}
                              tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`}
                            />
                            <YAxis
                              yAxisId={1}
                              orientation="right"
                              label={{ value: "RWA Density (%)", angle: 90, position: "insideRight" }}
                              tickFormatter={(value) => `${value.toFixed(0)}%`}
                            />
                            <Tooltip
                              formatter={(value, name) => {
                                if (name === "RWA") {
                                  return [`$${Math.round(value).toLocaleString()}`, name]
                                } else if (name === "RWA Density") {
                                  return [`${value.toFixed(2)}%`, name]
                                }
                                return [value, name]
                              }}
                            />
                            <Legend />
                            <Line
                              name="RWA"
                              data={rangeAnalysisData}
                              dataKey="rwa"
                              stroke="#8884d8"
                              strokeWidth={2}
                              dot={{ r: 1 }}
                              activeDot={{ r: 6 }}
                            />
                            <Line
                              name="RWA Density"
                              data={rangeAnalysisData}
                              dataKey="rwaDensity"
                              stroke="#82ca9d"
                              strokeWidth={2}
                              dot={{ r: 1 }}
                              activeDot={{ r: 6 }}
                              yAxisId={1}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </ChartWrapper>
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      Analysis shows RWA changes as {formatParameterName(rangeParameter)} increases from{" "}
                      {rangeAnalysisData[0]?.displayValue} to{" "}
                      {rangeAnalysisData[rangeAnalysisData.length - 1]?.displayValue}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rating" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle>Credit Rating Adjustments</CardTitle>
                <CardDescription>Adjust credit rating to see how it affects the RWA calculation</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={resetToDefault}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset to Default
              </Button>
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
                    : `Using model TTC PD: ${(safeCounterparty.ttcPd * 100).toFixed(4)}%`}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Range Analysis Card for Rating Parameters */}
          <Card className="mt-6">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle>Range Analysis</CardTitle>
                <CardDescription>Analyze rating downgrades and their impact on RWA</CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <Label htmlFor="range-analysis-toggle-rating">Enable</Label>
                <Switch
                  id="range-analysis-toggle-rating"
                  checked={rangeAnalysisEnabled}
                  onCheckedChange={setRangeAnalysisEnabled}
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="range-parameter-rating">Parameter to Analyze</Label>
                    <Select
                      id="range-parameter-rating"
                      value={rangeParameter}
                      onValueChange={setRangeParameter}
                      disabled={!rangeAnalysisEnabled}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select parameter" />
                      </SelectTrigger>
                      <SelectContent>
                        {getAvailableRangeParameters().map((param) => (
                          <SelectItem key={param.value} value={param.value}>
                            {param.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="range-max-rating">Maximum Rating Steps</Label>
                    <Input
                      id="range-max-rating"
                      value={formatRangeInput(rangeMax, "rangeMax")}
                      onChange={(e) => setRangeMax(parseRangeInput(e.target.value, "rangeMax"))}
                      disabled={!rangeAnalysisEnabled}
                    />
                    <div className="text-xs text-muted-foreground">Number of rating downgrades to analyze</div>
                  </div>

                  <div className="flex items-end">
                    <Button onClick={generateRangeAnalysisData} disabled={!rangeAnalysisEnabled}>
                      Generate Analysis
                    </Button>
                  </div>
                </div>

                {rangeAnalysisEnabled && rangeAnalysisData.length > 0 && (
                  <div className="mt-4">
                    <div className="text-sm font-medium mb-2">
                      Analysis of Credit Rating downgrades from {selectedRating}
                    </div>
                    <div className="h-[300px]">
                      <ChartWrapper>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                              dataKey="displayValue"
                              type="category"
                              label={{
                                value: "Credit Rating",
                                position: "insideBottom",
                                offset: -5,
                              }}
                            />
                            <YAxis
                              label={{ value: "RWA", angle: -90, position: "insideLeft" }}
                              tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`}
                            />
                            <YAxis
                              yAxisId={1}
                              orientation="right"
                              label={{ value: "RWA Density (%)", angle: 90, position: "insideRight" }}
                              tickFormatter={(value) => `${value.toFixed(0)}%`}
                            />
                            <Tooltip
                              formatter={(value, name) => {
                                if (name === "RWA") {
                                  return [`$${Math.round(value).toLocaleString()}`, name]
                                } else if (name === "RWA Density") {
                                  return [`${value.toFixed(2)}%`, name]
                                }
                                return [value, name]
                              }}
                            />
                            <Legend />
                            <Line
                              name="RWA"
                              data={rangeAnalysisData}
                              dataKey="rwa"
                              stroke="#8884d8"
                              strokeWidth={2}
                              dot={{ r: 1 }}
                              activeDot={{ r: 6 }}
                            />
                            <Line
                              name="RWA Density"
                              data={rangeAnalysisData}
                              dataKey="rwaDensity"
                              stroke="#82ca9d"
                              strokeWidth={2}
                              dot={{ r: 1 }}
                              activeDot={{ r: 6 }}
                              yAxisId={1}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </ChartWrapper>
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      Analysis shows RWA changes as Credit Rating downgrades from {selectedRating} to{" "}
                      {rangeAnalysisData[rangeAnalysisData.length - 1]?.displayValue.split(" ")[0]}
                    </div>
                  </div>
                )}
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
                  <YAxis
                    label={{ value: "RWA", angle: -90, position: "insideLeft" }}
                    tickFormatter={(value) => `$${(value / 1000000).toFixed(0)}M`}
                  />
                  <Tooltip
                    formatter={(value, name) => {
                      if (name.includes("Sensitivity")) {
                        return [`$${Math.round(value).toLocaleString()}`, name]
                      }
                      return [value, name]
                    }}
                    labelFormatter={(label) => {
                      if (activeTab === "advanced") {
                        const series = activeChartData.find((s) => s.data.some((d) => d.value === label))
                        if (series) {
                          const point = series.data.find((d) => d.value === label)
                          return point?.label || label
                        }
                      }
                      return label
                    }}
                  />
                  <Legend />

                  {activeChartData.map((series, index) => (
                    <Line
                      key={series.name}
                      name={series.name}
                      data={series.data}
                      dataKey="rwa"
                      stroke={series.color}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  ))}

                  {/* Add markers for current parameter values */}
                  {activeChartData.map((series) => {
                    if (!series.active) return null

                    const currentPoint = series.data.find((point) => point[series.dataKey] === series.currentValue)

                    if (!currentPoint) return null

                    return (
                      <Line
                        key={`current-${series.name}`}
                        data={[currentPoint]}
                        dataKey="rwa"
                        stroke="none"
                        dot={{
                          r: 6,
                          fill: "#fff",
                          stroke: series.color,
                          strokeWidth: 3,
                        }}
                      />
                    )
                  })}
                </LineChart>
              </ResponsiveContainer>
            </ChartWrapper>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
