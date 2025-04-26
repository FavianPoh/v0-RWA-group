// Through-The-Cycle (TTC) PD Calculator

// Function to calculate TTC PD based on various inputs
export function calculateTtcPd(inputs: {
  pointInTimePd: number
  macroeconomicIndex: number // Index representing current economic conditions (0-1, where 1 is strong economy)
  longTermAverage: number // Long-term average default rate for the sector
  cyclicality: number // How cyclical the industry is (0-1, where 1 is highly cyclical)
}): number {
  const { pointInTimePd, macroeconomicIndex, longTermAverage, cyclicality } = inputs

  // Calculate economic adjustment factor
  // When economy is strong (index close to 1), PIT PD is lower than TTC PD
  // When economy is weak (index close to 0), PIT PD is higher than TTC PD
  const economicDeviation = 0.5 - macroeconomicIndex // Deviation from neutral economy

  // Calculate adjustment based on cyclicality and economic conditions
  const adjustment = 1 + economicDeviation * cyclicality * 2

  // Calculate TTC PD by adjusting PIT PD with the economic cycle
  let ttcPd = pointInTimePd * adjustment

  // Blend with long-term average to ensure stability
  ttcPd = ttcPd * 0.7 + longTermAverage * 0.3

  // Ensure PD is within reasonable bounds
  return Math.max(0.0001, Math.min(1, ttcPd))
}

// Function to generate synthetic TTC PD inputs for a counterparty
export function generateTtcPdInputs(counterparty) {
  // Generate realistic inputs based on counterparty data
  const industry = counterparty.industry

  // Assign cyclicality based on industry
  let cyclicality = 0.5 // Default moderate cyclicality

  if (["Banking", "Real Estate", "Construction", "Automotive"].includes(industry)) {
    cyclicality = 0.8 // Highly cyclical industries
  } else if (["Healthcare", "Utilities", "Consumer Staples"].includes(industry)) {
    cyclicality = 0.3 // Less cyclical industries
  } else if (["Technology", "Telecommunications"].includes(industry)) {
    cyclicality = 0.6 // Moderately cyclical
  }

  // Generate macroeconomic index (current economic conditions)
  // For simplicity, we'll use a fixed value representing current conditions
  // In a real system, this would come from economic forecasts
  const macroeconomicIndex = 0.6 // Slightly above neutral economy

  // Generate long-term average default rate based on industry
  let longTermAverage = 0.02 // Default 2%

  if (["Banking", "Financial Services", "Insurance"].includes(industry)) {
    longTermAverage = 0.015 // 1.5% for financial industries
  } else if (["Healthcare", "Utilities"].includes(industry)) {
    longTermAverage = 0.01 // 1% for stable industries
  } else if (["Retail", "Manufacturing"].includes(industry)) {
    longTermAverage = 0.025 // 2.5% for traditional industries
  } else if (["Technology", "Telecommunications"].includes(industry)) {
    longTermAverage = 0.03 // 3% for tech industries
  }

  return {
    pointInTimePd: counterparty.pd,
    macroeconomicIndex,
    longTermAverage,
    cyclicality,
  }
}
