// RWA Calculator implementation

// Constants for Basel calculations
const BASEL_CONFIDENCE_LEVEL = 0.999 // 99.9% confidence level
const NORMAL_INVERSE_CONFIDENCE = normalInverse(BASEL_CONFIDENCE_LEVEL)

export function calculateRWA(counterparty) {
  // Get the appropriate PD based on whether we're using credit rating or calculated PD
  const pd =
    counterparty.useCredRatingPd && counterparty.creditRating
      ? counterparty.creditRatingPd
      : counterparty.ttcPd || counterparty.pd

  // Determine if AVC multiplier should be applied (Basel Cre31)
  const avcMultiplier = determineAVCMultiplier(counterparty)

  // Calculate base correlation based on PD (Basel formula)
  const baseCorrelation = calculateBaseCorrelation(pd)

  // Apply AVC multiplier to correlation if applicable
  const correlation = baseCorrelation * avcMultiplier

  // Calculate maturity adjustment
  const maturityAdjustment = calculateMaturityAdjustment(pd, counterparty.maturity)

  // Calculate capital requirement (K)
  const k = calculateCapitalRequirement(pd, counterparty.lgd, correlation, maturityAdjustment)

  // Calculate RWA
  const rwa = counterparty.ead * k * 12.5

  return {
    pd,
    baseCorrelation,
    avcMultiplier,
    correlation,
    maturityAdjustment,
    k,
    rwa,
  }
}

// Determine if AVC multiplier should be applied (Basel Cre31)
function determineAVCMultiplier(counterparty) {
  // According to Basel Cre31, correlation is multiplied by 1.25 for:
  // - Exposures to financial institutions with assets ≥ $100bn
  // - Exposures to unregulated financial institutions regardless of size

  if (counterparty.isFinancial) {
    if (counterparty.isLargeFinancial || !counterparty.isRegulated) {
      return 1.25 // Apply AVC multiplier
    }
  }

  return 1.0 // No AVC multiplier
}

// Calculate base correlation based on PD (Basel formula)
function calculateBaseCorrelation(pd) {
  return (
    (0.12 * (1 - Math.exp(-50 * pd))) / (1 - Math.exp(-50)) +
    0.24 * (1 - (1 - Math.exp(-50 * pd)) / (1 - Math.exp(-50)))
  )
}

// Calculate maturity adjustment
function calculateMaturityAdjustment(pd, maturity) {
  const b = (0.11852 - 0.05478 * Math.log(pd)) ** 2
  return (1 + (maturity - 2.5) * b) / (1 - 1.5 * b)
}

// Calculate capital requirement (K) using Vasicek formula
function calculateCapitalRequirement(pd, lgd, correlation, maturityAdjustment) {
  const sqrtCorrelation = Math.sqrt(correlation)
  const inverseNormalPD = normalInverse(pd)

  // Basel formula for conditional PD at 99.9% confidence level
  const conditionalPD = normalCDF(
    (inverseNormalPD + sqrtCorrelation * NORMAL_INVERSE_CONFIDENCE) / Math.sqrt(1 - correlation),
  )

  // Capital requirement formula
  const k = lgd * conditionalPD * maturityAdjustment

  return k
}

// Standard Vasicek formula for conditional PD given a systematic factor
export function conditionalDefaultProbability(pd, correlation, systematicFactor) {
  const defaultThreshold = normalInverse(pd)
  return normalCDF((defaultThreshold - Math.sqrt(correlation) * systematicFactor) / Math.sqrt(1 - correlation))
}

// Normal cumulative distribution function (CDF)
function normalCDF(x) {
  const t = 1 / (1 + 0.2316419 * Math.abs(x))
  const d = 0.3989423 * Math.exp((-x * x) / 2)
  let p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))))
  if (x > 0) {
    p = 1 - p
  }
  return p
}

// Normal inverse function (approximation)
function normalInverse(p) {
  if (p <= 0 || p >= 1) {
    throw new Error("Invalid probability for normal inverse")
  }

  // Approximation for the normal inverse function
  const a1 = -39.6968302866538
  const a2 = 220.946098424521
  const a3 = -275.928510446969
  const a4 = 138.357751867269
  const a5 = -30.6647980661472
  const a6 = 2.50662827745924

  const b1 = -54.4760987982241
  const b2 = 161.585836858041
  const b3 = -155.698979859887
  const b4 = 66.8013118877197
  const b5 = -13.2806815528857

  const c1 = -7.78489400243029e-3
  const c2 = -0.322396458041136
  const c3 = -2.40075827716184
  const c4 = -2.54973253934373
  const c5 = 4.37466414146497
  const c6 = 2.93816398269878

  const d1 = 7.78469570904146e-3
  const d2 = 0.32246712907004
  const d3 = 2.445134137143
  const d4 = 3.75440866190742

  const q = p - 0.5
  let r

  if (Math.abs(q) <= 0.42) {
    r = q * q
    return q * (((((a5 * r + a4) * r + a3) * r + a2) * r + a1) / ((((b5 * r + b4) * r + b3) * r + b2) * r + b1))
  } else {
    if (q <= 0) {
      r = p
    } else {
      r = 1 - p
    }

    r = Math.sqrt(-Math.log(r))

    let result
    if (r <= 5) {
      result = (((((c6 * r + c5) * r + c4) * r + c3) * r + c2) * r + c1) / (((d4 * r + d3) * r + d2) * r + d1)
    } else {
      result =
        (1 / (r * Math.sqrt(2 * Math.PI))) *
        Math.exp((-r * r) / 2 + (Math.log(1 / (r * Math.sqrt(2 * Math.PI))) - (r * r) / 2))
    }

    if (q <= 0) {
      return -result
    } else {
      return result
    }
  }
}
