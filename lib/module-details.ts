export type ModuleType = "input" | "calculation" | "output"

import { getRatingFromPd } from "./credit-ratings"

export function getModuleDetails(moduleId, data, results) {
  // Ensure data and results are objects to prevent null reference errors
  const safeData = data || {}
  const safeResults = results || {}

  if (moduleId === "pd") {
    return getPITPDModuleDetails(safeData)
  } else if (moduleId === "ttcpd") {
    return getTtcPDModuleDetails(safeData)
  } else if (moduleId === "creditreview") {
    return getCreditReviewModuleDetails(safeData)
  } else if (moduleId === "lgd") {
    return getLGDModuleDetails(safeData)
  } else if (moduleId === "ead") {
    return getEADModuleDetails(safeData)
  } else if (moduleId === "correlation") {
    return getCorrelationModuleDetails(safeData, safeResults)
  } else if (moduleId === "maturity") {
    return getMaturityModuleDetails(safeData, safeResults)
  } else if (moduleId === "avc") {
    return getAVCModuleDetails(safeData, safeResults)
  } else if (moduleId === "rwa") {
    return getRWAModuleDetails(data, results)
  } else {
    return null
  }
}

function getPITPDModuleDetails(data) {
  // Ensure we have a valid PIT PD value
  const pitPd = data.pd !== undefined && !isNaN(data.pd) ? data.pd : 0.01

  return {
    title: "Point-in-Time Probability of Default (PIT PD) Calculator",
    description:
      "Calculates the probability that a counterparty will default within a one-year period based on current conditions",
    overview:
      "<p>The Point-in-Time (PIT) Probability of Default (PD) represents the likelihood of a counterparty defaulting within the next 12 months, considering current economic conditions.</p><p>This module uses financial data, market indicators, and current economic conditions to estimate default probability.</p>",
    formula: "PIT PD = f(Financial Ratios, Market Indicators, Current Economic Conditions)",
    keyConsiderations: [
      "PIT PD reflects current economic conditions and is more volatile than TTC PD",
      "Higher values indicate greater default risk",
      "Typically ranges from 0.01% (very safe) to 20%+ (distressed)",
      "Used as input to the TTC PD calculation",
    ],
    inputs: [
      {
        name: "Financial Statements",
        value: "Historical data",
        description: "Historical financial data used to assess creditworthiness",
      },
      {
        name: "Industry Risk",
        value: data.industry || "Unknown",
        description: "Industry-specific risk factors",
      },
      {
        name: "Market Data",
        value: "Credit spreads, equity prices",
        description: "Market-based indicators of default risk",
      },
      {
        name: "Current Economic Conditions",
        value: data.macroeconomicIndex ? data.macroeconomicIndex.toFixed(2) : "N/A",
        rawValue: data.macroeconomicIndex,
        description: "Current state of the economy (higher values indicate stronger economy)",
      },
    ],
    outputs: [
      {
        name: "PIT PD",
        value: pitPd ? (pitPd * 100).toFixed(4) + "%" : "N/A",
        rawValue: pitPd,
        description: "Point-in-Time Probability of Default over a one-year period",
      },
      {
        name: "Equivalent Rating",
        value: pitPd ? getRatingFromPd(pitPd) : "N/A",
        description: "Approximate credit rating equivalent to this PD",
      },
    ],
    code: "// Point-in-Time PD Model Implementation\n\nfunction calculatePointInTimePD(financialData, marketData, economicData) {\n  // Financial ratios have the strongest influence on PD\n  const financialScore = calculateFinancialScore(financialData);\n  \n  // Market data provides forward-looking signals\n  const marketScore = calculateMarketScore(marketData);\n  \n  // Economic data captures current conditions\n  const economicScore = calculateEconomicScore(economicData);\n  \n  // Combine scores with appropriate weights\n  const combinedScore = (\n    financialScore * 0.6 + \n    marketScore * 0.3 + \n    economicScore * 0.1\n  );\n  \n  // Convert score to PD using a calibrated function\n  return scoreToDefaultProbability(combinedScore);\n}",
  }
}

function getTtcPDModuleDetails(data) {
  // Generate TTC PD inputs for display
  const ttcInputs = {
    pointInTimePd: data.pd,
    macroeconomicIndex: data.macroeconomicIndex,
    longTermAverage: data.longTermAverage,
    cyclicality: data.cyclicality,
  }

  // Ensure we have a valid TTC PD value
  const ttcPd = data.ttcPd !== undefined && !isNaN(data.ttcPd) ? data.ttcPd : 0.01

  return {
    title: "Through-The-Cycle (TTC) Probability of Default Calculator",
    description: "Calculates the probability of default adjusted for economic cycles",
    overview:
      "<p>The Through-The-Cycle (TTC) PD adjusts the Point-in-Time PD to account for economic cycles, providing a more stable, long-term view of default risk.</p><p>This module normalizes the PD by considering where we are in the economic cycle and how cyclical the industry is.</p>",
    formula: "TTC PD = PIT PD × (1 + (0.5 - Economic Index) × Cyclicality × 2) × 0.7 + Long-Term Average × 0.3",
    keyConsiderations: [
      "TTC PD is higher than PIT PD during economic booms (when Economic Index > 0.5)",
      "TTC PD is lower than PIT PD during economic downturns (when Economic Index < 0.5)",
      "More cyclical industries (higher Cyclicality) experience greater adjustment",
      "The final value is blended with the long-term industry average for stability",
    ],
    inputs: [
      {
        name: "Point-in-Time PD",
        value: data.pd ? (data.pd * 100).toFixed(4) + "%" : "N/A",
        rawValue: data.pd,
        description: "Current PD based on present economic conditions",
      },
      {
        name: "Economic Index",
        value: data.macroeconomicIndex ? data.macroeconomicIndex.toFixed(2) : "N/A",
        rawValue: data.macroeconomicIndex,
        description: "Current position in the economic cycle (0-1, where 1 is strong economy)",
      },
      {
        name: "Long-Term Average Default Rate",
        value: data.longTermAverage ? (data.longTermAverage * 100).toFixed(2) + "%" : "N/A",
        rawValue: data.longTermAverage,
        description: "Historical average default rate for this industry/sector",
      },
      {
        name: "Cyclicality",
        value: data.cyclicality ? data.cyclicality.toFixed(2) : "N/A",
        rawValue: data.cyclicality,
        description: "How sensitive the industry is to economic cycles (0-1)",
      },
    ],
    outputs: [
      {
        name: "TTC PD",
        value: ttcPd ? (ttcPd * 100).toFixed(4) + "%" : "N/A",
        rawValue: ttcPd,
        description: "Through-The-Cycle Probability of Default",
      },
      {
        name: "Adjustment Factor",
        value:
          data.macroeconomicIndex && data.cyclicality
            ? (1 + (0.5 - data.macroeconomicIndex) * data.cyclicality * 2).toFixed(4)
            : "N/A",
        description: "Factor applied to PIT PD to adjust for economic cycle",
      },
      {
        name: "Equivalent Rating",
        value: ttcPd ? getRatingFromPd(ttcPd) : "N/A",
        description: "Approximate credit rating equivalent to this TTC PD",
      },
    ],
    code: "function calculateTtcPd(inputs) {\n  const { pointInTimePd, macroeconomicIndex, longTermAverage, cyclicality } = inputs;\n  \n  // Calculate economic adjustment factor\n  const economicDeviation = 0.5 - macroeconomicIndex;\n  \n  // Calculate adjustment based on cyclicality and economic conditions\n  const adjustment = 1 + (economicDeviation * cyclicality * 2);\n  \n  // Calculate TTC PD by adjusting PIT PD with the economic cycle\n  let ttcPd = pointInTimePd * adjustment;\n  \n  // Blend with long-term average to ensure stability\n  ttcPd = ttcPd * 0.7 + longTermAverage * 0.3;\n  \n  return Math.max(0.0001, Math.min(1, ttcPd));\n}",
  }
}

function getCreditReviewModuleDetails(data) {
  return {
    title: "Credit Review Module",
    description: "Assigns credit ratings and corresponding PDs based on expert judgment",
    overview:
      "<p>The Credit Review module allows risk managers to override model-calculated PDs with expert judgment by assigning a credit rating.</p><p>This module maps credit ratings (like AAA, AA, etc.) to standardized PD values based on historical default rates.</p>",
    formula: "If Credit Rating is used: Final PD = Rating-Based PD\nOtherwise: Final PD = Model TTC PD",
    keyConsiderations: [
      "Credit ratings provide a standardized assessment of creditworthiness",
      "Each rating corresponds to a specific probability of default based on historical data",
      "Ratings can override model-calculated PDs when expert judgment is needed",
      "The system allows choosing between rating-based PD and model-calculated TTC PD",
    ],
    inputs: [
      {
        name: "Counterparty",
        value: data.name || "Unknown",
        description: "Entity being assessed",
      },
      {
        name: "Industry",
        value: data.industry || "Unknown",
        description: "Counterparty's industry sector",
      },
      {
        name: "Model TTC PD",
        value: data.ttcPd ? (data.ttcPd * 100).toFixed(4) + "%" : "N/A",
        rawValue: data.ttcPd,
        description: "PD calculated by the TTC model",
      },
      {
        name: "Credit Rating",
        value: data.creditRating || "Not Reviewed",
        rawValue: data.creditRating,
        description: "Credit rating assigned during review",
      },
    ],
    outputs: [
      {
        name: "Assigned Credit Rating",
        value: data.creditRating || "Not Reviewed",
        description: "Credit rating assigned during review",
      },
      {
        name: "Rating-Based PD",
        value: data.creditRatingPd ? (data.creditRatingPd * 100).toFixed(4) + "%" : "N/A",
        description: "PD corresponding to the assigned rating",
      },
      {
        name: "Review Date",
        value: data.creditReviewDate || "N/A",
        description: "Date when the credit review was performed",
      },
      {
        name: "PD Used in Calculation",
        value: data.useCredRatingPd ? "Rating-Based PD" : "Model TTC PD",
        description: "Which PD is being used for RWA calculation",
      },
    ],
    code: 'function getPdFromRating(rating) {\n  // Mapping of ratings to approximate PD values\n  const ratingToPdMap = {\n    "AAA": 0.0001,   // 0.01%\n    "AA+": 0.0002,   // 0.02%\n    "AA": 0.0003,    // 0.03%\n    "AA-": 0.0004,   // 0.04%\n    "A+": 0.0005,    // 0.05%\n    "A": 0.0007,     // 0.07%\n    "A-": 0.0009,    // 0.09%\n    "BBB+": 0.0012,  // 0.12%\n    "BBB": 0.0022,   // 0.22%\n    "BBB-": 0.0035,  // 0.35%\n    "BB+": 0.0065,   // 0.65%\n    "BB": 0.0120,    // 1.20%\n    "BB-": 0.0190,   // 1.90%\n    "B+": 0.0290,    // 2.90%\n    "B": 0.0450,     // 4.50%\n    "B-": 0.0650,    // 6.50%\n    "CCC+": 0.0950,  // 9.50%\n    "CCC": 0.1400,   // 14.00%\n    "CCC-": 0.1900,  // 19.00%\n    "CC": 0.2500,    // 25.00%\n    "C": 0.3500,     // 35.00%\n    "D": 1.0000      // 100.00% (default)\n  };\n  \n  return ratingToPdMap[rating] || 0.01; // Default to 1% if rating not found\n}',
  }
}

function getLGDModuleDetails(data) {
  return {
    title: "Loss Given Default (LGD) Calculator",
    description: "Calculates the percentage of exposure expected to be lost if a default occurs",
    overview:
      "<p>Loss Given Default (LGD) estimates the percentage of exposure that will not be recovered if a default occurs.</p><p>This module considers factors like collateral, seniority, and industry recovery rates to determine the expected loss severity.</p>",
    formula: "LGD = (1 - Recovery Rate) × 100%",
    keyConsiderations: [
      "LGD is expressed as a percentage of exposure",
      "Lower LGD values indicate better recovery prospects",
      "Collateralized exposures typically have lower LGD values",
      "Senior claims have lower LGD than subordinated claims",
      "Industry and jurisdiction affect recovery rates",
    ],
    inputs: [
      {
        name: "Counterparty",
        value: data.name || "Unknown",
        description: "Entity being assessed",
      },
      {
        name: "Industry",
        value: data.industry || "Unknown",
        description: "Counterparty's industry sector",
      },
      {
        name: "Collateral Type",
        value: "Various",
        description: "Type of collateral securing the exposure",
      },
      {
        name: "Seniority",
        value: "Senior Unsecured",
        description: "Seniority of the claim in case of default",
      },
      {
        name: "LGD",
        value: data.lgd ? (data.lgd * 100).toFixed(2) + "%" : "N/A",
        rawValue: data.lgd,
        description: "Loss Given Default percentage",
      },
    ],
    outputs: [
      {
        name: "LGD",
        value: data.lgd ? (data.lgd * 100).toFixed(2) + "%" : "N/A",
        description: "Loss Given Default percentage",
      },
      {
        name: "Recovery Rate",
        value: data.lgd ? ((1 - data.lgd) * 100).toFixed(2) + "%" : "N/A",
        description: "Expected recovery rate in case of default",
      },
    ],
    code: "function calculateLGD(inputs) {\n  const {\n    collateralType,\n    collateralValue,\n    exposure,\n    seniority,\n    industry,\n    jurisdiction\n  } = inputs;\n  \n  // Base LGD based on seniority\n  let baseLGD = getSeniorityBaseLGD(seniority);\n  \n  // Adjust for collateral\n  const collateralAdjustment = calculateCollateralAdjustment(\n    collateralType,\n    collateralValue,\n    exposure\n  );\n  \n  // Calculate final LGD\n  let lgd = baseLGD - collateralAdjustment;\n  \n  // Ensure LGD is within bounds\n  return Math.max(0.05, Math.min(1, lgd));\n}",
  }
}

function getEADModuleDetails(data) {
  return {
    title: "Exposure at Default (EAD) Calculator",
    description: "Calculates the expected exposure amount at the time of default",
    overview:
      "<p>Exposure at Default (EAD) estimates the total exposure amount expected at the time of default.</p><p>This module calculates EAD by considering both current drawn amounts and potential future drawdowns of undrawn commitments.</p>",
    formula: "EAD = Current Outstanding + (Undrawn Commitment × Credit Conversion Factor)",
    keyConsiderations: [
      "EAD includes both current drawn amounts and potential future drawdowns",
      "Credit Conversion Factors (CCF) estimate how much of undrawn amounts will be drawn before default",
      "Revolving facilities typically have higher CCFs than term loans",
      "CCFs range from 0% to 100% depending on facility type and remaining maturity",
    ],
    inputs: [
      {
        name: "Counterparty",
        value: data.name || "Unknown",
        description: "Entity being assessed",
      },
      {
        name: "Current Outstanding",
        value: data.ead ? "$" + Math.round(data.ead * 0.8).toLocaleString() : "N/A",
        description: "Current drawn amount",
      },
      {
        name: "Undrawn Commitment",
        value: data.ead ? "$" + Math.round(data.ead * 0.25).toLocaleString() : "N/A",
        description: "Available undrawn amount",
      },
      {
        name: "Credit Conversion Factor",
        value: "80%",
        description: "Factor applied to undrawn amounts",
      },
      {
        name: "EAD",
        value: data.ead ? "$" + Math.round(data.ead).toLocaleString() : "N/A",
        rawValue: data.ead,
        description: "Exposure at Default",
      },
    ],
    outputs: [
      {
        name: "EAD",
        value: data.ead ? "$" + Math.round(data.ead).toLocaleString() : "N/A",
        description: "Exposure at Default",
      },
      {
        name: "EAD to Limit Ratio",
        value: "90%",
        description: "EAD as a percentage of total credit limit",
      },
    ],
    code: "function calculateEAD(inputs) {\n  const {\n    currentOutstanding,\n    undrawnCommitment,\n    facilityType,\n    remainingMaturity,\n    isRevocable\n  } = inputs;\n  \n  // Get Credit Conversion Factor based on facility type\n  const ccf = getCreditConversionFactor(\n    facilityType,\n    remainingMaturity,\n    isRevocable\n  );\n  \n  // Calculate EAD\n  const ead = currentOutstanding + (undrawnCommitment * ccf);\n  \n  return ead;\n}",
  }
}

function getCorrelationModuleDetails(data, results) {
  // Add null checks for results
  const safeResults = results || {}

  return {
    title: "Asset Correlation Calculator",
    description: "Calculates the correlation between the counterparty's assets and systematic risk factors",
    overview:
      "<p>Asset correlation measures how closely a counterparty's default risk is tied to the overall economy.</p><p>This module implements the Basel formula for asset correlation, which decreases as PD increases (reflecting that higher-risk borrowers are more idiosyncratic).</p>",
    formula:
      "Correlation = 0.12 × (1 - e^(-50 × PD)) / (1 - e^(-50)) + 0.24 × (1 - (1 - e^(-50 × PD)) / (1 - e^(-50)))",
    keyConsiderations: [
      "Asset correlation decreases as PD increases (higher risk borrowers are less correlated with the economy)",
      "Correlation typically ranges from 12% to 24%",
      "Financial institutions may receive an Asset Value Correlation (AVC) multiplier of 1.25",
      "Higher correlation leads to higher capital requirements",
    ],
    inputs: [
      {
        name: "PD",
        value: safeResults.pd ? (safeResults.pd * 100).toFixed(4) + "%" : "N/A",
        description: "Probability of Default used in calculation",
      },
      {
        name: "Is Financial Institution",
        value: data.isFinancial ? "Yes" : "No",
        description: "Whether the counterparty is a financial institution",
      },
      {
        name: "Is Large Financial",
        value: data.isLargeFinancial ? "Yes" : "No",
        description: "Whether the financial institution has assets ≥ $100bn",
      },
      {
        name: "Is Regulated",
        value: data.isRegulated ? "Yes" : "No",
        description: "Whether the financial institution is regulated",
      },
      {
        name: "AVC Multiplier",
        value: safeResults.avcMultiplier ? safeResults.avcMultiplier.toFixed(2) : "N/A",
        description: "Asset Value Correlation multiplier",
      },
    ],
    outputs: [
      {
        name: "Base Correlation",
        value: safeResults.baseCorrelation ? (safeResults.baseCorrelation * 100).toFixed(2) + "%" : "N/A",
        description: "Base asset correlation before AVC multiplier",
      },
      {
        name: "Final Correlation",
        value: safeResults.correlation ? (safeResults.correlation * 100).toFixed(2) + "%" : "N/A",
        description: "Final asset correlation after AVC multiplier",
      },
    ],
    code: "function calculateCorrelation(inputs) {\n  const { pd, isFinancial, isLargeFinancial, isRegulated } = inputs;\n  \n  // Calculate base correlation using Basel formula\n  const term1 = (0.12 * (1 - Math.exp(-50 * pd))) / (1 - Math.exp(-50));\n  const term2 = 0.24 * (1 - (1 - Math.exp(-50 * pd)) / (1 - Math.exp(-50)));\n  \n  const baseCorrelation = term1 + term2;\n  \n  // Determine if AVC multiplier applies\n  let avcMultiplier = 1.0;\n  \n  if (isFinancial) {\n    if (isLargeFinancial || !isRegulated) {\n      avcMultiplier = 1.25; // AVC multiplier for large or unregulated financials\n    }\n  }\n  \n  // Calculate final correlation\n  const correlation = baseCorrelation * avcMultiplier;\n  \n  return {\n    baseCorrelation,\n    avcMultiplier,\n    correlation\n  };\n}",
  }
}

function getMaturityModuleDetails(data, results) {
  // Add null checks for results
  const safeResults = results || {}

  // Create a b parameter if it doesn't exist in results
  const bValue = safeResults.b || (safeResults.pd ? Math.pow(0.11852 - 0.05478 * Math.log(safeResults.pd), 2) : 0)

  return {
    title: "Maturity Adjustment Calculator",
    description: "Calculates the adjustment factor for the effective maturity of the exposure",
    overview:
      "<p>The maturity adjustment accounts for the increased risk of longer-term exposures.</p><p>This module implements the Basel formula that increases capital requirements for exposures with longer maturities, reflecting the greater uncertainty over longer time horizons.</p>",
    formula: "Maturity Adjustment = (1 + (M - 2.5) × b) / (1 - 1.5 × b)\nwhere b = [0.11852 - 0.05478 × ln(PD)]²",
    keyConsiderations: [
      "Longer maturities result in higher capital requirements",
      "The adjustment is calibrated around a baseline maturity of 2.5 years",
      "The 'b' parameter decreases as PD increases (high-risk counterparties are less sensitive to maturity)",
      "Maturity adjustment is typically between 1.0 and 2.0",
    ],
    inputs: [
      {
        name: "PD",
        value: safeResults.pd ? (safeResults.pd * 100).toFixed(4) + "%" : "N/A",
        description: "Probability of Default used in calculation",
      },
      {
        name: "Effective Maturity",
        value: data.maturity ? data.maturity.toFixed(2) + " years" : "N/A",
        rawValue: data.maturity,
        description: "Effective maturity of the exposure in years",
      },
    ],
    outputs: [
      {
        name: "b Parameter",
        value: bValue ? bValue.toFixed(6) : "N/A",
        description: "Smoothing parameter in the maturity adjustment formula",
      },
      {
        name: "Maturity Adjustment",
        value: safeResults.maturityAdjustment ? safeResults.maturityAdjustment.toFixed(4) : "N/A",
        description: "Factor that adjusts capital requirements for maturity",
      },
    ],
    code: "function calculateMaturityAdjustment(inputs) {\n  const { pd, maturity } = inputs;\n  \n  // Ensure maturity is within bounds (1-5 years)\n  const effectiveMaturity = Math.max(1, Math.min(5, maturity));\n  \n  // Calculate b parameter\n  const b = Math.pow(0.11852 - 0.05478 * Math.log(pd), 2);\n  \n  // Calculate maturity adjustment\n  const maturityAdjustment = (1 + (effectiveMaturity - 2.5) * b) / (1 - 1.5 * b);\n  \n  return {\n    b,\n    effectiveMaturity,\n    maturityAdjustment\n  };\n}",
  }
}

function getAVCModuleDetails(data, results) {
  // Add null checks for data and results
  const safeData = data || {}
  const safeResults = results || {}

  return {
    title: "Asset Value Correlation (AVC) Multiplier",
    description: "Calculates the multiplier applied to asset correlation for financial institutions",
    overview:
      "<p>The Asset Value Correlation (AVC) multiplier increases the correlation for financial institutions to account for their higher systemic risk.</p><p>This module implements the Basel III requirement to apply a 1.25x multiplier to the asset correlation for large regulated financial institutions and all unregulated financial entities.</p>",
    formula:
      "For large regulated financial institutions (assets ≥ $100bn) or unregulated financial entities:\nAVC Multiplier = 1.25\nOtherwise:\nAVC Multiplier = 1.00",
    keyConsiderations: [
      "AVC multiplier only applies to financial institutions",
      "Large financial institutions (assets ≥ $100bn) receive a 1.25x multiplier",
      "Unregulated financial entities receive a 1.25x multiplier regardless of size",
      "The multiplier increases capital requirements to reflect higher interconnectedness",
    ],
    inputs: [
      {
        name: "Counterparty Type",
        value:
          safeData.isFinancial !== undefined
            ? safeData.isFinancial
              ? "Financial Institution"
              : "Non-Financial"
            : "Unknown",
        description: "Type of counterparty",
      },
      {
        name: "Is Large Financial",
        value: safeData.isLargeFinancial !== undefined ? (safeData.isLargeFinancial ? "Yes" : "No") : "Unknown",
        description: "Whether the financial institution has assets ≥ $100bn",
      },
      {
        name: "Is Regulated",
        value: safeData.isRegulated !== undefined ? (safeData.isRegulated ? "Yes" : "No") : "Unknown",
        description: "Whether the financial institution is regulated",
      },
    ],
    outputs: [
      {
        name: "AVC Multiplier",
        value: safeResults.avcMultiplier ? safeResults.avcMultiplier.toFixed(2) : "N/A",
        description: "Multiplier applied to asset correlation",
      },
      {
        name: "Base Correlation",
        value: safeResults.baseCorrelation ? (safeResults.baseCorrelation * 100).toFixed(2) + "%" : "N/A",
        description: "Base asset correlation before AVC multiplier",
      },
      {
        name: "Final Correlation",
        value: safeResults.correlation ? (safeResults.correlation * 100).toFixed(2) + "%" : "N/A",
        description: "Final asset correlation after AVC multiplier",
      },
    ],
    code: "function calculateAVCMultiplier(inputs) {\n  const { isFinancial, isLargeFinancial, isRegulated, baseCorrelation } = inputs;\n  \n  // Determine if AVC multiplier applies\n  let avcMultiplier = 1.0;\n  \n  if (isFinancial) {\n    if (isLargeFinancial || !isRegulated) {\n      avcMultiplier = 1.25; // AVC multiplier for large or unregulated financials\n    }\n  }\n  \n  // Calculate final correlation\n  const correlation = baseCorrelation * avcMultiplier;\n  \n  return {\n    avcMultiplier,\n    baseCorrelation,\n    correlation\n  };\n}",
  }
}

function getRWAModuleDetails(data, results) {
  // Add null checks for data and results
  const safeData = data || {}
  const safeResults = results || {}

  // Check if there are any adjustments
  const hasAdjustment = safeResults.hasAdjustment || safeResults.hasPortfolioAdjustment
  const originalRwa = safeResults.originalRwa || safeResults.rwa || 0
  const adjustedRwa = safeResults.rwa || 0
  const adjustmentPercentage = hasAdjustment && originalRwa > 0 ? (adjustedRwa / originalRwa - 1) * 100 : 0

  // Use rwaDensity directly from the results if available
  let rwaDensity = safeResults.rwaDensity

  // If rwaDensity is not available in results, calculate it
  if (rwaDensity === undefined || rwaDensity === null) {
    // Ensure we have numeric values for EAD and RWA
    const ead = Number(safeData.ead)
    const rwa = Number(adjustedRwa)

    // Only calculate if both values are valid numbers and EAD is greater than zero
    if (!isNaN(ead) && !isNaN(rwa) && ead > 0) {
      rwaDensity = rwa / ead
    } else {
      rwaDensity = 0
    }
  }

  // Debug information
  console.log("RWA Density in Module Details:", {
    ead: safeData.ead,
    rwa: adjustedRwa,
    rwaDensity: rwaDensity,
    resultsRwaDensity: safeResults.rwaDensity,
    eadType: typeof safeData.ead,
    rwaType: typeof adjustedRwa,
  })

  return {
    title: "Risk-Weighted Assets (RWA) Calculator",
    description: "Calculates the risk-weighted assets for credit risk under the Advanced IRB approach",
    overview:
      "<p>Risk-Weighted Assets (RWA) represent the amount of capital required to cover potential losses from credit risk.</p><p>This module implements the Basel Advanced IRB formula, which combines PD, LGD, EAD, correlation, and maturity adjustment to calculate capital requirements.</p>" +
      (hasAdjustment
        ? `<p class="text-purple-600 dark:text-purple-400">Note: This RWA value includes manual adjustments. Baseline model RWA: $${Math.round(originalRwa).toLocaleString()}.</p>`
        : ""),
    formula:
      "K = LGD × N[(1 - R)^(-0.5) × G(PD) + (R / (1 - R))^(0.5) × G(0.999)] × Maturity Adjustment\nRWA = K × 12.5 × EAD" +
      (hasAdjustment
        ? `<br><span class="text-purple-600 dark:text-purple-400">Adjusted RWA = Model RWA + Adjustment</span>`
        : ""),
    keyConsiderations: [
      "RWA increases with higher PD, LGD, EAD, correlation, and maturity",
      "The formula uses a 99.9% confidence level (Basel standard)",
      "RWA density (RWA/EAD) typically ranges from 20% to 250% depending on risk parameters",
      "Manual adjustments can be applied to reflect factors not captured by the model",
      "RWA is the final output used for capital requirement calculations",
    ],
    inputs: [
      {
        name: "PD",
        value: safeResults.pd ? (safeResults.pd * 100).toFixed(4) + "%" : "N/A",
        description: "Probability of Default",
      },
      {
        name: "LGD",
        value: safeData.lgd ? (safeData.lgd * 100).toFixed(2) + "%" : "N/A",
        rawValue: safeData.lgd,
        description: "Loss Given Default",
      },
      {
        name: "EAD",
        value: safeData.ead ? "$" + Math.round(Number(safeData.ead)).toLocaleString() : "N/A",
        rawValue: safeData.ead,
        description: "Exposure at Default",
      },
      {
        name: "Correlation",
        value: safeResults.correlation ? (safeResults.correlation * 100).toFixed(2) + "%" : "N/A",
        description: "Asset correlation",
      },
      {
        name: "Maturity Adjustment",
        value: safeResults.maturityAdjustment ? safeResults.maturityAdjustment.toFixed(4) : "N/A",
        description: "Adjustment for effective maturity",
      },
    ],
    outputs: [
      {
        name: "Capital Requirement (K)",
        value: safeResults.k ? (safeResults.k * 100).toFixed(2) + "%" : "N/A",
        description: "Capital requirement as percentage of EAD",
      },
      {
        name: "Model RWA",
        value: originalRwa ? "$" + Math.round(originalRwa).toLocaleString() : "N/A",
        description: "Risk-Weighted Assets calculated by the model before any adjustments",
      },
      {
        name: "Final RWA",
        value: adjustedRwa ? "$" + Math.round(adjustedRwa).toLocaleString() : "N/A",
        description: "Final Risk-Weighted Assets after all adjustments",
        highlight: hasAdjustment,
      },
      {
        name: "Adjustment Impact",
        value: hasAdjustment
          ? (adjustmentPercentage > 0 ? "+" : "") + adjustmentPercentage.toFixed(2) + "%"
          : "No Adjustment",
        description: "Impact of manual adjustments on RWA",
        highlight: hasAdjustment,
      },
      {
        name: "RWA Density",
        value: rwaDensity > 0 ? (rwaDensity * 100).toFixed(2) + "%" : "N/A",
        description: "RWA as a percentage of EAD",
      },
    ],
    code: "function calculateRWA(inputs) {\n  const { pd, lgd, ead, correlation, maturityAdjustment } = inputs;\n  \n  // Calculate capital requirement (K)\n  const term1 = normInv(pd);\n  const term2 = Math.sqrt(correlation) * normInv(0.999);\n  const term3 = Math.sqrt(1 - correlation);\n  \n  const conditionalPD = normCDF((term1 + term2) / term3);\n  \n  // Calculate capital requirement before maturity adjustment\n  let k = lgd * conditionalPD;\n  \n  // Apply maturity adjustment\n  k *= maturityAdjustment;\n  \n  // Calculate RWA\n  const rwa = k * 12.5 * ead;\n  \n  // Any manual adjustments would be applied here\n  // adjustedRWA = rwa + adjustment;\n  \n  return {\n    k,\n    rwa\n  };\n}",
  }
}
