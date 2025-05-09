// Import any necessary dependencies
import { calculateCorrelation } from "./utils"
import { calculateTtcPd } from "./ttc-pd-calculator"

export function calculateRWA(counterparty, options = {}) {
  // Add null check for counterparty
  if (!counterparty) {
    console.error("Counterparty is undefined in calculateRWA")
    return {
      rwa: 0,
      k: 0,
      correlationR: 0,
      maturityAdjustment: 0,
      riskWeight: 0,
    }
  }

  // Add null checks for counterparty properties using optional chaining and nullish coalescing
  const useCredRatingPd = counterparty.useCredRatingPd ?? false
  const pd = useCredRatingPd ? (counterparty.creditRating?.pd ?? 0.01) : (counterparty.pd ?? 0.01)
  const lgd = counterparty.lgd ?? 0.45
  const ead = counterparty.ead ?? 1000000
  const maturity = counterparty.maturity ?? 2.5

  // Use the options or default values
  const {
    useBaselFormula = true,
    useMaturityAdjustment = true,
    correlationOverride = null,
    pdOverride = null,
    lgdOverride = null,
    eadOverride = null,
    maturityOverride = null,
    ttcPdOverride = null,
  } = options

  // Use overrides if provided
  const effectivePd = pdOverride !== null ? pdOverride : pd
  const effectiveLgd = lgdOverride !== null ? lgdOverride : lgd
  const effectiveEad = eadOverride !== null ? eadOverride : ead
  const effectiveMaturity = maturityOverride !== null ? maturityOverride : maturity

  // Calculate TTC PD if needed
  const ttcPd = ttcPdOverride !== null ? ttcPdOverride : calculateTtcPd(effectivePd)

  // Calculate correlation
  const correlationR = correlationOverride !== null ? correlationOverride : calculateCorrelation(effectivePd)

  // Calculate maturity adjustment
  const maturityAdjustment = useMaturityAdjustment ? (1 + (effectiveMaturity - 2.5) * 0.05) / (1 - 1.5 * 0.05) : 1

  // Calculate capital requirement (K)
  const normalDist = (x) => {
    const a1 = 0.254829592
    const a2 = -0.284496736
    const a3 = 1.421413741
    const a4 = -1.453152027
    const a5 = 1.061405429
    const p = 0.3275911
    const sign = x < 0 ? -1 : 1
    x = Math.abs(x) / Math.sqrt(2.0)
    const t = 1.0 / (1.0 + p * x)
    const erf = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x)
    return 0.5 * (1.0 + sign * erf)
  }

  const inverseNormalDist = (p) => {
    // Approximation of the inverse normal CDF
    if (p <= 0) return Number.NEGATIVE_INFINITY
    if (p >= 1) return Number.POSITIVE_INFINITY

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
      return (
        (q * (((a5 * r + a4) * r + a3) * r + a2) * r + a1) / (((((b5 * r + b4) * r + b3) * r + b2) * r + b1) * r + 1)
      )
    } else {
      if (q <= 0) r = p
      else r = 1 - p

      r = Math.sqrt(-Math.log(r))

      if (r <= 5) {
        r = r - 1.6
        return (
          ((q >= 0 ? 1 : -1) * (((((c6 * r + c5) * r + c4) * r + c3) * r + c2) * r + c1)) /
          ((((d4 * r + d3) * r + d2) * r + d1) * r + 1)
        )
      } else {
        r = r - 5
        return (
          ((q >= 0 ? 1 : -1) * (((((c6 * r + c5) * r + c4) * r + c3) * r + c2) * r + c1)) /
          ((((d4 * r + d3) * r + d2) * r + d1) * r + 1)
        )
      }
    }
  }

  let k
  if (useBaselFormula) {
    // Basel II/III IRB formula
    k =
      effectiveLgd *
      (normalDist(
        inverseNormalDist(effectivePd) / Math.sqrt(1 - correlationR) +
          Math.sqrt(correlationR / (1 - correlationR)) * inverseNormalDist(0.999),
      ) -
        effectivePd) *
      maturityAdjustment
  } else {
    // Simplified formula
    k = effectiveLgd * effectivePd
  }

  // Calculate risk weight and RWA
  const riskWeight = k * 12.5 * 100 // Convert to percentage
  let rwa = effectiveEad * k * 12.5

  // Store the original RWA before any adjustments
  const originalRwa = rwa

  // Apply counterparty-specific RWA adjustment if it exists
  if (counterparty.rwaAdjustment) {
    if (counterparty.rwaAdjustment.type === "multiplicative") {
      rwa *= counterparty.rwaAdjustment.multiplier
    } else if (counterparty.rwaAdjustment.type === "additive") {
      rwa += counterparty.rwaAdjustment.adjustment
    }
  }

  // Apply portfolio-level RWA adjustment if it exists
  if (counterparty.portfolioRwaAdjustment) {
    if (counterparty.portfolioRwaAdjustment.type === "multiplicative") {
      rwa *= counterparty.portfolioRwaAdjustment.multiplier
    } else if (counterparty.portfolioRwaAdjustment.type === "additive") {
      rwa += counterparty.portfolioRwaAdjustment.adjustment
    }
  }

  return {
    rwa,
    originalRwa,
    k,
    correlationR,
    maturityAdjustment,
    riskWeight,
    pd: effectivePd,
    lgd: effectiveLgd,
    ead: effectiveEad,
    maturity: effectiveMaturity,
    ttcPd,
  }
}
