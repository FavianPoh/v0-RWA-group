// This file contains the main RWA calculation logic
// It implements the Basel IRB approach for credit risk

import { normInv, normCDF } from "@/lib/utils"

// Main RWA calculation function
export function calculateRWA(counterparty) {
  // Extract parameters from counterparty
  const {
    pd: rawPd,
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
  } = counterparty

  // Ensure we have numeric values
  const pd = useCredRatingPd && creditRatingPd ? Number(creditRatingPd) : Number(rawTtcPd || rawPd)
  const lgd = Number(rawLgd) || 0.45 // Default LGD of 45% if not provided
  const ead = Number(rawEad) || 0
  const maturity = Number(rawMaturity) || 2.5 // Default maturity of 2.5 years if not provided

  // Calculate correlation using Basel formula
  const baseCorrelation = calculateBaseCorrelation(pd)

  // Apply AVC multiplier for financial institutions
  const avcMultiplier = calculateAVCMultiplier(isFinancial, isLargeFinancial, isRegulated)
  const correlation = baseCorrelation * avcMultiplier

  // Calculate maturity adjustment
  const maturityAdjustment = calculateMaturityAdjustment(pd, maturity)

  // Calculate capital requirement (K)
  const k = calculateCapitalRequirement(pd, lgd, correlation, maturityAdjustment)

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

    if (rwaAdjustment.type === "absolute") {
      adjustedRWA = Number(rwaAdjustment.adjustedRWA)
    } else if (rwaAdjustment.type === "additive") {
      adjustedRWA = baseRWA + Number(rwaAdjustment.adjustment)
    } else if (rwaAdjustment.type === "multiplicative") {
      adjustedRWA = baseRWA * Number(rwaAdjustment.multiplier)
    }
  }

  // Apply portfolio-level adjustment if present
  if (portfolioRwaAdjustment) {
    hasPortfolioAdjustment = true

    if (!hasAdjustment) {
      originalRwa = baseRWA
    }

    if (portfolioRwaAdjustment.type === "absolute") {
      adjustedRWA = Number(portfolioRwaAdjustment.adjustedRWA)
    } else if (portfolioRwaAdjustment.type === "additive") {
      adjustedRWA = adjustedRWA + Number(portfolioRwaAdjustment.adjustment)
    } else if (portfolioRwaAdjustment.type === "multiplicative") {
      adjustedRWA = adjustedRWA * Number(portfolioRwaAdjustment.multiplier)
    }
  }

  // Calculate RWA density (RWA as percentage of EAD)
  const rwaDensity = ead > 0 ? adjustedRWA / ead : 0

  // Log the calculation for debugging
  console.log("RWA Calculation:", {
    pd,
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
    pd,
    lgd,
    ead,
    baseCorrelation,
    avcMultiplier,
    correlation,
    maturityAdjustment,
    k,
    rwa: adjustedRWA,
    originalRwa: hasAdjustment || hasPortfolioAdjustment ? originalRwa : adjustedRWA,
    hasAdjustment,
    hasPortfolioAdjustment,
    rwaDensity,
  }
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
