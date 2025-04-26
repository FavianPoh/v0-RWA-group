// This file provides the source code for each module in the RWA model

export function getModuleCode(moduleId: string): string {
  const moduleCode = moduleCodeMap[moduleId.toLowerCase()]
  return moduleCode || "// Code not available for this module"
}

const moduleCodeMap: Record<string, string> = {
  pd: `/**
 * PD (Probability of Default) Calculator Module
 * 
 * This module calculates the probability of default based on
 * counterparty financial data and market conditions.
 */
export function calculatePD(
  financialRatio: number,
  marketCondition: number,
  industryFactor: number
): number {
  // Base PD calculation using logistic function
  const basePD = 1 / (1 + Math.exp(-1 * (financialRatio * 2.5 - 1.2)))
  
  // Apply market condition adjustment
  const marketAdjustedPD = basePD * (1 + (marketCondition - 0.5) * 0.4)
  
  // Apply industry factor
  const finalPD = marketAdjustedPD * industryFactor
  
  // Ensure PD is between 0 and 1
  return Math.max(0, Math.min(1, finalPD))
}`,

  ttcpd: `/**
 * TTC PD (Through-The-Cycle Probability of Default) Calculator
 * 
 * Converts point-in-time PD to through-the-cycle PD by
 * applying cyclical adjustments based on economic data.
 */
export function calculateTTCPD(
  pointInTimePD: number,
  economicCycle: number,
  longTermAverage: number
): number {
  // Calculate the cyclical adjustment factor
  const cyclicalFactor = (economicCycle > 0.5) 
    ? Math.pow(economicCycle, -0.5) 
    : Math.pow(1 - economicCycle, -0.5)
  
  // Apply the cyclical adjustment to move towards long-term average
  const ttcPD = pointInTimePD * (1 - 0.4) + longTermAverage * 0.4
  
  // Apply the cyclical factor
  const adjustedPD = ttcPD * cyclicalFactor
  
  // Ensure PD is between 0 and 1
  return Math.max(0, Math.min(1, adjustedPD))
}`,

  creditreview: `/**
 * Credit Review Module
 * 
 * Converts external credit ratings to internal PD values
 * and allows for expert judgment overrides.
 */
export function creditRatingToPD(
  rating: string,
  ratingAgency: string = "S&P"
): number {
  // S&P rating to PD mapping (simplified)
  const ratingToPD: Record<string, number> = {
    "AAA": 0.0001,
    "AA+": 0.0002,
    "AA": 0.0003,
    "AA-": 0.0004,
    "A+": 0.0005,
    "A": 0.0007,
    "A-": 0.0009,
    "BBB+": 0.0011,
    "BBB": 0.0015,
    "BBB-": 0.0030,
    "BB+": 0.0050,
    "BB": 0.0070,
    "BB-": 0.0100,
    "B+": 0.0150,
    "B": 0.0200,
    "B-": 0.0400,
    "CCC+": 0.0600,
    "CCC": 0.0900,
    "CCC-": 0.1300,
    "CC": 0.2000,
    "C": 0.3500,
    "D": 1.0000
  }
  
  // Return the mapped PD or a default value
  return ratingToPD[rating] || 0.05
}`,

  avc: `/**
 * AVC (Asset Value Correlation) Module
 * 
 * Calculates the asset value correlation multiplier
 * based on counterparty size and systemic importance.
 */
export function calculateAVCMultiplier(
  counterpartySize: number,
  systemicImportance: number
): number {
  // Base multiplier
  let multiplier = 1.0
  
  // Adjust for counterparty size (larger counterparties get higher correlation)
  if (counterpartySize > 50000000) {
    multiplier *= 1.25
  }
  
  // Adjust for systemic importance
  multiplier *= (1 + systemicImportance * 0.5)
  
  // Cap the multiplier
  return Math.min(1.5, multiplier)
}`,

  correlation: `/**
 * Correlation Module
 * 
 * Calculates asset correlation based on PD and AVC multiplier
 * following Basel regulatory formulas.
 */
export function calculateCorrelation(
  ttcPD: number,
  avcMultiplier: number
): number {
  // Basel formula for correlation
  const baseCorrelation = 0.12 * (1 - Math.exp(-50 * ttcPD)) / (1 - Math.exp(-50)) +
                          0.24 * (1 - (1 - Math.exp(-50 * ttcPD)) / (1 - Math.exp(-50)))
  
  // Apply AVC multiplier
  const finalCorrelation = baseCorrelation * avcMultiplier
  
  // Ensure correlation is between 0 and 1
  return Math.max(0, Math.min(1, finalCorrelation))
}`,

  lgd: `/**
 * LGD (Loss Given Default) Calculator
 * 
 * Calculates the loss given default based on collateral,
 * seniority, and industry recovery rates.
 */
export function calculateLGD(
  collateralValue: number,
  exposure: number,
  seniority: string,
  industryRecoveryRate: number
): number {
  // Base LGD calculation
  let baseLGD = 0.45 // Unsecured baseline
  
  // Adjust for collateral
  const collateralRatio = Math.min(1, collateralValue / exposure)
  baseLGD *= (1 - collateralRatio * 0.8) // Collateral reduces LGD
  
  // Adjust for seniority
  const seniorityFactor = {
    "senior": 0.75,
    "subordinated": 1.2,
    "junior": 1.5
  }[seniority] || 1.0
  
  baseLGD *= seniorityFactor
  
  // Adjust for industry recovery rates
  const industryAdjustedLGD = baseLGD * (1 - industryRecoveryRate * 0.5)
  
  // Ensure LGD is between 0 and 1
  return Math.max(0, Math.min(1, industryAdjustedLGD))
}`,

  ead: `/**
 * EAD (Exposure at Default) Calculator
 * 
 * Calculates the exposure at default based on current exposure,
 * undrawn commitments, and credit conversion factors.
 */
export function calculateEAD(
  drawnAmount: number,
  undrawnAmount: number,
  ccf: number, // Credit Conversion Factor
  volatilityFactor: number
): number {
  // Calculate EAD using drawn amount plus a portion of undrawn
  const baseEAD = drawnAmount + undrawnAmount * ccf
  
  // Apply volatility factor for potential exposure increase
  const finalEAD = baseEAD * (1 + volatilityFactor)
  
  return Math.max(0, finalEAD)
}`,

  maturity: `/**
 * Maturity Adjustment Module
 * 
 * Calculates the maturity adjustment factor based on
 * effective maturity and PD following Basel formulas.
 */
export function calculateMaturityAdjustment(
  effectiveMaturity: number,
  ttcPD: number
): number {
  // Basel formula for maturity adjustment
  const b = (0.11852 - 0.05478 * Math.log(ttcPD)) ** 2
  
  // Calculate maturity adjustment
  const maturityAdjustment = (1 + (effectiveMaturity - 2.5) * b) / 
                             (1 - 1.5 * b)
  
  return Math.max(1, maturityAdjustment)
}`,

  rwa: `/**
 * RWA (Risk-Weighted Assets) Calculator
 * 
 * Calculates risk-weighted assets based on PD, LGD, EAD,
 * correlation, and maturity adjustment following Basel formulas.
 */
export function calculateRWA(
  pd: number,
  lgd: number,
  ead: number,
  correlation: number,
  maturityAdjustment: number,
  confidenceLevel: number = 0.999 // 99.9% confidence level
): number {
  // Calculate capital requirement (K)
  const normalDistInverse = (p: number) => {
    // Approximation of the inverse of the normal cumulative distribution function
    const a1 = -39.6968302866538, a2 = 220.946098424521, a3 = -275.928510446969
    const a4 = 138.357751867269, a5 = -30.6647980661472, a6 = 2.50662827745924
    const b1 = -54.4760987982241, b2 = 161.585836858041, b3 = -155.698979859887
    const b4 = 66.8013118877197, b5 = -13.2806815528857
    const c1 = -7.78489400243029E-03, c2 = -0.322396458041136, c3 = -2.40075827716184
    const c4 = -2.54973253934373, c5 = 4.37466414146497, c6 = 2.93816398269878
    const d1 = 7.78469570904146E-03, d2 = 0.32246712907004, d3 = 2.445134137143
    const d4 = 3.75440866190742
    const p_low = 0.02425, p_high = 1 - p_low
    let q, r
    let retVal
    
    if ((p < 0) || (p > 1)) {
      return 0
    } else if (p < p_low) {
      q = Math.sqrt(-2 * Math.log(p))
      retVal = (((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) / ((((d1 * q + d2) * q + d3) * q + d4) * q + 1)
    } else if (p <= p_high) {
      q = p - 0.5
      r = q * q
      retVal = (((((a1 * r + a2) * r + a3) * r + a4) * r + a5) * r + a6) * q / (((((b1 * r + b2) * r + b3) * r + b4) * r + b5) * r + 1)
    } else {
      q = Math.sqrt(-2 * Math.log(1 - p))
      retVal = -(((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) / ((((d1 * q + d2) * q + d3) * q + d4) * q + 1)
    }
    return retVal
  }
  
  // Basel formula for capital requirement
  const k = lgd * (
    normalDistInverse(pd * (1 + (effectiveMaturity - 2.5) * b) / (1 - 1.5 * b)) * 
    Math.sqrt((1 - correlation) / correlation) + 
    normalDistInverse(confidenceLevel) * Math.sqrt(correlation)
  ) - pd * lgd
  
  // Apply maturity adjustment
  const kWithMaturity = k * maturityAdjustment
  
  // Calculate RWA
  const rwa = ead * kWithMaturity * 12.5
  
  return Math.max(0, rwa)
}`,
}
