// This file contains the main RWA calculation logic
// It implements the Basel IRB approach for credit risk

import { normInv, normCDF } from "@/lib/utils"

// Main RWA calculation function
export function calculateRWA(counterparty) {
  // Add debug logging for the input counterparty
  console.log("calculateRWA input:", {
    counterparty,
    hasRwaAdjustment: !!counterparty?.rwaAdjustment,
    hasPortfolioAdjustment: !!counterparty?.portfolioRwaAdjustment,
  })

  // Extract parameters from counterparty
  const {
    pd: rawPitPd,
    ttcPd: rawTtcPd,
    lgd: rawLgd,
    ead: rawEad,
    maturity: rawMaturity,
    isFinancial,
    isLargeFinancial,
    isRegulated,
    useCredRatingPd,
    creditRatingPd,
    rwaAdjustment,
    portfolioRwaAdjustment,
  } = counterparty || {}

  // Ensure we have numeric values with fallbacks
  const pitPd = ensureNumber(rawPitPd, 0.01) // Default PIT PD of 1% if not provided
  const ttcPd = useCredRatingPd && creditRatingPd ? ensureNumber(creditRatingPd) : ensureNumber(rawTtcPd || rawPitPd)
  const lgd = ensureNumber(rawLgd, 0.45) // Default LGD of 45% if not provided
  const ead = ensureNumber(rawEad, 0)
  const maturity = ensureNumber(rawMaturity, 2.5) // Default maturity of 2.5 years if not provided

  // Calculate correlation using Basel formula
  const baseCorrelation = calculateBaseCorrelation(ttcPd)

  // Apply AVC multiplier for financial institutions
  const avcMultiplier = calculateAVCMultiplier(isFinancial, isLargeFinancial, isRegulated)
  const correlation = baseCorrelation * avcMultiplier

  // Calculate maturity adjustment
  const maturityAdjustment = calculateMaturityAdjustment(ttcPd, maturity)

  // Calculate capital requirement (K)
  const k = calculateCapitalRequirement(ttcPd, lgd, correlation, maturityAdjustment)

  // Calculate RWA
  const baseRWA = k * 12.5 * ead

  // Apply any adjustments
  let hasAdjustment = false
  let hasPortfolioAdjustment = false
  let adjustedRWA = baseRWA
  let originalRwa = baseRWA

  // Apply counterparty-specific adjustment if present
  if (rwaAdjustment) {
    hasAdjustment = true
    originalRwa = baseRWA

    console.log("Applying counterparty adjustment:", rwaAdjustment)

    if (rwaAdjustment.type === "absolute") {
      // For absolute adjustments, use the provided adjustedRWA directly
      adjustedRWA = ensureNumber(rwaAdjustment.adjustedRWA, baseRWA)
    } else if (rwaAdjustment.type === "additive") {
      // For additive adjustments, add the adjustment to the base RWA
      const adjustment = ensureNumber(rwaAdjustment.adjustment, 0)
      adjustedRWA = baseRWA + adjustment
    } else if (rwaAdjustment.type === "multiplicative") {
      // For multiplicative adjustments, multiply the base RWA by the multiplier
      const multiplier = ensureNumber(rwaAdjustment.multiplier, 1)
      adjustedRWA = baseRWA * multiplier
    } else if (rwaAdjustment.type === "percentage") {
      // For percentage adjustments, calculate based on percentage value
      const percentageValue = ensureNumber(rwaAdjustment.value, 0)
      adjustedRWA = baseRWA * (1 + percentageValue / 100)
    }

    console.log("After counterparty adjustment:", {
      baseRWA,
      adjustedRWA,
      change: adjustedRWA - baseRWA,
      percentChange: (adjustedRWA / baseRWA - 1) * 100,
    })
  }

  // Apply portfolio-level adjustment if present
  if (portfolioRwaAdjustment) {
    hasPortfolioAdjustment = true

    if (!hasAdjustment) {
      originalRwa = baseRWA
    }

    // Debug log to check portfolio adjustment values
    console.log("Applying portfolio adjustment:", portfolioRwaAdjustment)

    const beforePortfolioAdjustment = adjustedRWA

    if (portfolioRwaAdjustment.type === "absolute") {
      // For absolute adjustments, use the provided adjustedRWA directly
      adjustedRWA = ensureNumber(portfolioRwaAdjustment.adjustedRWA, adjustedRWA)
    } else if (portfolioRwaAdjustment.type === "additive") {
      // For additive adjustments, add the adjustment to the current RWA
      const adjustment = ensureNumber(portfolioRwaAdjustment.adjustment, 0)
      adjustedRWA = adjustedRWA + adjustment
    } else if (portfolioRwaAdjustment.type === "multiplicative") {
      // For multiplicative adjustments, multiply the current RWA by the multiplier
      const multiplier = ensureNumber(portfolioRwaAdjustment.multiplier, 1)
      adjustedRWA = adjustedRWA * multiplier
    } else if (portfolioRwaAdjustment.counterpartyAdjustment) {
      // Handle counterparty-specific adjustment from portfolio adjustment
      const counterpartyAdj = portfolioRwaAdjustment.counterpartyAdjustment

      if (counterpartyAdj.type === "multiplicative" && counterpartyAdj.multiplier) {
        adjustedRWA = baseRWA * ensureNumber(counterpartyAdj.multiplier, 1)
      } else if (counterpartyAdj.type === "additive" && counterpartyAdj.adjustment) {
        adjustedRWA = baseRWA + ensureNumber(counterpartyAdj.adjustment, 0)
      } else if (counterpartyAdj.adjustedRWA) {
        adjustedRWA = ensureNumber(counterpartyAdj.adjustedRWA, baseRWA)
      }
    }

    console.log("After portfolio adjustment:", {
      beforePortfolioAdjustment,
      adjustedRWA,
      change: adjustedRWA - beforePortfolioAdjustment,
      percentChange: (adjustedRWA / beforePortfolioAdjustment - 1) * 100,
    })
  }

  // Calculate RWA density (RWA as percentage of EAD)
  const rwaDensity = ead > 0 ? adjustedRWA / ead : 0

  // Log the calculation for debugging
  console.log("RWA Calculation results:", {
    pitPd,
    ttcPd,
    lgd,
    ead,
    correlation,
    maturityAdjustment,
    k,
    baseRWA,
    adjustedRWA,
    rwaDensity,
    hasAdjustment,
    hasPortfolioAdjustment,
  })

  // Return the results
  return {
    pd: pitPd,
    ttcPd,
    lgd,
    ead,
    baseCorrelation,
    avcMultiplier,
    correlation,
    maturityAdjustment,
    k,
    rwa: adjustedRWA,
    originalRwa: hasAdjustment || hasPortfolioAdjustment ? originalRwa : adjustedRWA,
    hasAdjustment: hasAdjustment || hasPortfolioAdjustment,
    hasPortfolioAdjustment,
    rwaDensity,
  }
}

// Helper function to ensure a value is a valid number
function ensureNumber(value, defaultValue = 0) {
  if (value === undefined || value === null) return defaultValue
  const num = Number(value)
  return isNaN(num) ? defaultValue : num
}

// Calculate base correlation using Basel formula
function calculateBaseCorrelation(pd) {
  const term1 = (0.12 * (1 - Math.exp(-50 * pd))) / (1 - Math.exp(-50))
  const term2 = 0.24 * (1 - (1 - Math.exp(-50 * pd)) / (1 - Math.exp(-50)))
  return term1 + term2
}

// Calculate AVC multiplier for financial institutions
function calculateAVCMultiplier(isFinancial, isLargeFinancial, isRegulated) {
  if (isFinancial && (isLargeFinancial || !isRegulated)) {
    return 1.25 // AVC multiplier for large or unregulated financials
  }
  return 1.0
}

// Calculate maturity adjustment
function calculateMaturityAdjustment(pd, maturity) {
  // Ensure maturity is within bounds (1-5 years)
  const effectiveMaturity = Math.max(1, Math.min(5, maturity))

  // Calculate b parameter
  const b = Math.pow(0.11852 - 0.05478 * Math.log(pd), 2)

  // Calculate maturity adjustment
  return (1 + (effectiveMaturity - 2.5) * b) / (1 - 1.5 * b)
}

// Calculate capital requirement (K)
function calculateCapitalRequirement(pd, lgd, correlation, maturityAdjustment) {
  const term1 = normInv(pd)
  const term2 = Math.sqrt(correlation) * normInv(0.999)
  const term3 = Math.sqrt(1 - correlation)

  const conditionalPD = normCDF((term1 + term2) / term3)

  // Calculate capital requirement before maturity adjustment
  let k = lgd * conditionalPD

  // Apply maturity adjustment
  k *= maturityAdjustment

  return k
}
