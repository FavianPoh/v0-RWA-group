export function cn(...inputs: (string | undefined | null | false)[]) {
  return inputs.filter(Boolean).join(" ")
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function calculateCorrelation(ttcPD: number): number {
  // Basel formula for correlation
  const baseCorrelation =
    (0.12 * (1 - Math.exp(-50 * ttcPD))) / (1 - Math.exp(-50)) +
    0.24 * (1 - (1 - Math.exp(-50 * ttcPD)) / (1 - Math.exp(-50)))

  // Apply AVC multiplier
  const finalCorrelation = baseCorrelation //* avcMultiplier  AVC multiplier is already applied in rwa-calculator.ts

  // Ensure correlation is between 0 and 1
  return Math.max(0, Math.min(1, finalCorrelation))
}

// Approximation of the inverse normal cumulative distribution function
export function normInv(p: number): number {
  const a1 = -39.6968302866538,
    a2 = 220.946098424521,
    a3 = -275.928510446969
  const a4 = 138.357751867269,
    a5 = -30.6647980661472,
    a6 = 2.50662827745924
  const b1 = -54.4760987982241,
    b2 = 161.585836858041,
    b3 = -155.698979859887
  const b4 = 66.8013118877197,
    b5 = -13.2806815528857
  const c1 = -7.78489400243029e-3,
    c2 = -0.322396458041136,
    c3 = -2.40075827716184
  const c4 = -2.54973253934373,
    c5 = 4.37466414146497,
    c6 = 2.93816398269878
  const d1 = 7.78469570904146e-3,
    d2 = 0.32246712907004,
    d3 = 2.445134137143
  const d4 = 3.75440866190742
  const p_low = 0.02425,
    p_high = 1 - p_low
  let q, r
  let retVal

  if (p < 0 || p > 1) {
    return 0
  } else if (p < p_low) {
    q = Math.sqrt(-2 * Math.log(p))
    retVal = (((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) / ((((d1 * q + d2) * q + d3) * q + d4) * q + 1)
  } else if (p <= p_high) {
    q = p - 0.5
    r = q * q
    retVal =
      ((((((a1 * r + a2) * r + a3) * r + a4) * r + a5) * r + a6) * q) /
      (((((b1 * r + b2) * r + b3) * r + b4) * r + b5) * r + 1)
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p))
    retVal = -(((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) / ((((d1 * q + d2) * q + d3) * q + d4) * q + 1)
  }
  return retVal
}

// Approximation of the normal cumulative distribution function
export function normCDF(x: number): number {
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
