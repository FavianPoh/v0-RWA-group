import { getRatingFromPd } from "./credit-ratings"

export function getModuleDetails(moduleId, data, results) {
  if (moduleId === "pd") {
    return getPDModuleDetails(data)
  } else if (moduleId === "ttcpd") {
    return getTtcPDModuleDetails(data)
  } else if (moduleId === "creditreview") {
    return getCreditReviewModuleDetails(data)
  } else if (moduleId === "lgd") {
    return getLGDModuleDetails(data)
  } else if (moduleId === "ead") {
    return getEADModuleDetails(data)
  } else if (moduleId === "correlation") {
    return getCorrelationModuleDetails(data, results)
  } else if (moduleId === "maturity") {
    return getMaturityModuleDetails(data, results)
  } else if (moduleId === "avc") {
    return getAVCModuleDetails(data, results)
  } else if (moduleId === "rwa") {
    return getRWAModuleDetails(data, results)
  } else {
    return null
  }
}

function getPDModuleDetails(data) {
  return {
    title: "Point-in-Time Probability of Default (PD) Calculator",
    description:
      "Calculates the probability that a counterparty will default within a one-year period based on current conditions",
    overview:
      "<p>The Point-in-Time (PIT) Probability of Default (PD) is a key risk metric that estimates the likelihood that a counterparty will default on its obligations within a one-year period based on current economic conditions.</p><p>PIT PD is influenced by various factors including the counterparty's financial health, industry conditions, and current macroeconomic factors.</p>",
    formula: "PIT PD = P(Asset Value < Default Threshold | Current Economic Conditions)",
    inputs: [
      {
        name: "Financial Statements",
        value: "Historical data",
        description: "Historical financial data used to assess creditworthiness",
      },
      {
        name: "Industry Risk",
        value: data.industry,
        description: "Industry-specific risk factors",
      },
      {
        name: "Market Data",
        value: "Credit spreads, equity prices",
        description: "Market-based indicators of default risk",
      },
      {
        name: "Current Economic Conditions",
        value: "Index: " + data.macroeconomicIndex.toFixed(2),
        rawValue: data.macroeconomicIndex,
        description: "Current state of the economy (higher values indicate stronger economy)",
      },
      {
        name: "PD",
        value: (data.pd * 100).toFixed(4) + "%",
        rawValue: data.pd,
        description: "Point-in-Time Probability of Default",
      },
    ],
    outputs: [
      {
        name: "PIT PD",
        value: (data.pd * 100).toFixed(4) + "%",
        description: "Point-in-Time Probability of Default over a one-year period",
      },
      {
        name: "Equivalent Rating",
        value: getRatingFromPd(data.pd),
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

  return {
    title: "Through-The-Cycle (TTC) Probability of Default Calculator",
    description: "Calculates the probability of default adjusted for economic cycles",
    overview:
      "<p>The Through-The-Cycle (TTC) Probability of Default represents the average default probability of a counterparty over an entire economic cycle, rather than at a specific point in time.</p><p>TTC PD is calculated by adjusting the Point-in-Time (PIT) PD to account for the current position in the economic cycle.</p>",
    formula: "TTC PD = PIT PD × Adjustment Factor + (Long-Term Average × Weight)",
    inputs: [
      {
        name: "Point-in-Time PD",
        value: (data.pd * 100).toFixed(4) + "%",
        rawValue: data.pd,
        description: "Current PD based on present economic conditions",
      },
      {
        name: "Economic Index",
        value: data.macroeconomicIndex.toFixed(2),
        rawValue: data.macroeconomicIndex,
        description: "Current position in the economic cycle (0-1, where 1 is strong economy)",
      },
      {
        name: "Long-Term Average Default Rate",
        value: (data.longTermAverage * 100).toFixed(2) + "%",
        rawValue: data.longTermAverage,
        description: "Historical average default rate for this industry/sector",
      },
      {
        name: "Cyclicality",
        value: data.cyclicality.toFixed(2),
        rawValue: data.cyclicality,
        description: "How sensitive the industry is to economic cycles (0-1)",
      },
      {
        name: "TTC PD",
        value: (data.ttcPd * 100).toFixed(4) + "%",
        rawValue: data.ttcPd,
        description: "Through-The-Cycle Probability of Default",
      },
    ],
    outputs: [
      {
        name: "TTC PD",
        value: (data.ttcPd * 100).toFixed(4) + "%",
        description: "Through-The-Cycle Probability of Default",
      },
      {
        name: "Adjustment Factor",
        value: (1 + (0.5 - data.macroeconomicIndex) * data.cyclicality * 2).toFixed(4),
        description: "Factor applied to PIT PD to adjust for economic cycle",
      },
      {
        name: "Equivalent Rating",
        value: getRatingFromPd(data.ttcPd),
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
      "<p>The Credit Review module allows risk managers to assign credit ratings to counterparties based on expert judgment, qualitative assessments, and external ratings from agencies like S&P, Moody's, or Fitch.</p>",
    formula: "Credit Rating → PD Mapping",
    inputs: [
      {
        name: "Counterparty",
        value: data.name,
        description: "Entity being assessed",
      },
      {
        name: "Industry",
        value: data.industry,
        description: "Counterparty's industry sector",
      },
      {
        name: "Model TTC PD",
        value: (data.ttcPd * 100).toFixed(4) + "%",
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
      "<p>Loss Given Default (LGD) represents the proportion of the exposure that is expected to be lost if a default occurs. It is a key component in the calculation of expected loss and risk-weighted assets.</p>",
    formula: "LGD = (1 - Recovery Rate) × 100%",
    inputs: [
      {
        name: "Counterparty",
        value: data.name,
        description: "Entity being assessed",
      },
      {
        name: "Industry",
        value: data.industry,
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
        value: (data.lgd * 100).toFixed(2) + "%",
        rawValue: data.lgd,
        description: "Loss Given Default percentage",
      },
    ],
    outputs: [
      {
        name: "LGD",
        value: (data.lgd * 100).toFixed(2) + "%",
        description: "Loss Given Default percentage",
      },
      {
        name: "Recovery Rate",
        value: ((1 - data.lgd) * 100).toFixed(2) + "%",
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
      "<p>Exposure at Default (EAD) represents the expected amount of exposure to a counterparty at the time of default. It includes both on-balance sheet exposures and off-balance sheet items that may be drawn down before default occurs.</p>",
    formula: "For on-balance sheet items:\nEAD = Current Outstanding Amount",
    inputs: [
      {
        name: "Counterparty",
        value: data.name,
        description: "Entity being assessed",
      },
      {
        name: "Current Outstanding",
        value: "$" + Math.round(data.ead * 0.8).toLocaleString(),
        description: "Current drawn amount",
      },
      {
        name: "Undrawn Commitment",
        value: "$" + Math.round(data.ead * 0.25).toLocaleString(),
        description: "Available undrawn amount",
      },
      {
        name: "Credit Conversion Factor",
        value: "80%",
        description: "Factor applied to undrawn amounts",
      },
      {
        name: "EAD",
        value: "$" + Math.round(data.ead).toLocaleString(),
        rawValue: data.ead,
        description: "Exposure at Default",
      },
    ],
    outputs: [
      {
        name: "EAD",
        value: "$" + Math.round(data.ead).toLocaleString(),
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
  return {
    title: "Asset Correlation Calculator",
    description: "Calculates the correlation between the counterparty's assets and systematic risk factors",
    overview:
      "<p>Asset correlation is a key parameter in the Basel framework that represents the degree to which the asset value of a counterparty is correlated with the general state of the economy.</p>",
    formula:
      "Correlation = 0.12 × (1 - e^(-50 × PD)) / (1 - e^(-50)) + 0.24 × (1 - (1 - e^(-50 × PD)) / (1 - e^(-50)))",
    inputs: [
      {
        name: "PD",
        value: (results.pd * 100).toFixed(4) + "%",
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
        value: results.avcMultiplier.toFixed(2),
        description: "Asset Value Correlation multiplier",
      },
    ],
    outputs: [
      {
        name: "Base Correlation",
        value: (results.baseCorrelation * 100).toFixed(2) + "%",
        description: "Base asset correlation before AVC multiplier",
      },
      {
        name: "Final Correlation",
        value: (results.correlation * 100).toFixed(2) + "%",
        description: "Final asset correlation after AVC multiplier",
      },
    ],
    code: "function calculateCorrelation(inputs) {\n  const { pd, isFinancial, isLargeFinancial, isRegulated } = inputs;\n  \n  // Calculate base correlation using Basel formula\n  const term1 = (0.12 * (1 - Math.exp(-50 * pd))) / (1 - Math.exp(-50));\n  const term2 = 0.24 * (1 - (1 - Math.exp(-50 * pd)) / (1 - Math.exp(-50)));\n  \n  const baseCorrelation = term1 + term2;\n  \n  // Determine if AVC multiplier applies\n  let avcMultiplier = 1.0;\n  \n  if (isFinancial) {\n    if (isLargeFinancial || !isRegulated) {\n      avcMultiplier = 1.25; // AVC multiplier for large or unregulated financials\n    }\n  }\n  \n  // Calculate final correlation\n  const correlation = baseCorrelation * avcMultiplier;\n  \n  return {\n    baseCorrelation,\n    avcMultiplier,\n    correlation\n  };\n}",
  }
}

function getMaturityModuleDetails(data, results) {
  // Create a b parameter if it doesn't exist in results
  const bValue = results.b || Math.pow(0.11852 - 0.05478 * Math.log(results.pd), 2)

  return {
    title: "Maturity Adjustment Calculator",
    description: "Calculates the adjustment factor for the effective maturity of the exposure",
    overview:
      "<p>The maturity adjustment factor accounts for the increased risk associated with longer-term exposures. Longer maturities generally carry higher risk as there is more time for the counterparty's creditworthiness to deteriorate.</p>",
    formula: "Maturity Adjustment = (1 + (M - 2.5) × b) / (1 - 1.5 × b)",
    inputs: [
      {
        name: "PD",
        value: (results.pd * 100).toFixed(4) + "%",
        description: "Probability of Default used in calculation",
      },
      {
        name: "Effective Maturity",
        value: data.maturity.toFixed(2) + " years",
        rawValue: data.maturity,
        description: "Effective maturity of the exposure in years",
      },
    ],
    outputs: [
      {
        name: "b Parameter",
        value: bValue.toFixed(6),
        description: "Smoothing parameter in the maturity adjustment formula",
      },
      {
        name: "Maturity Adjustment",
        value: results.maturityAdjustment.toFixed(4),
        description: "Factor that adjusts capital requirements for maturity",
      },
    ],
    code: "function calculateMaturityAdjustment(inputs) {\n  const { pd, maturity } = inputs;\n  \n  // Ensure maturity is within bounds (1-5 years)\n  const effectiveMaturity = Math.max(1, Math.min(5, maturity));\n  \n  // Calculate b parameter\n  const b = Math.pow(0.11852 - 0.05478 * Math.log(pd), 2);\n  \n  // Calculate maturity adjustment\n  const maturityAdjustment = (1 + (effectiveMaturity - 2.5) * b) / (1 - 1.5 * b);\n  \n  return {\n    b,\n    effectiveMaturity,\n    maturityAdjustment\n  };\n}",
  }
}

function getAVCModuleDetails(data, results) {
  return {
    title: "Asset Value Correlation (AVC) Multiplier",
    description: "Calculates the multiplier applied to asset correlation for financial institutions",
    overview:
      "<p>The Asset Value Correlation (AVC) multiplier is a regulatory adjustment introduced in Basel III to account for the higher interconnectedness and systemic importance of financial institutions.</p>",
    formula:
      "For large regulated financial institutions (assets ≥ $100bn) or unregulated financial entities:\nAVC Multiplier = 1.25",
    inputs: [
      {
        name: "Counterparty Type",
        value: data.isFinancial ? "Financial Institution" : "Non-Financial",
        description: "Type of counterparty",
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
    ],
    outputs: [
      {
        name: "AVC Multiplier",
        value: results.avcMultiplier.toFixed(2),
        description: "Multiplier applied to asset correlation",
      },
      {
        name: "Base Correlation",
        value: (results.baseCorrelation * 100).toFixed(2) + "%",
        description: "Base asset correlation before AVC multiplier",
      },
      {
        name: "Final Correlation",
        value: (results.correlation * 100).toFixed(2) + "%",
        description: "Final asset correlation after AVC multiplier",
      },
    ],
    code: "function calculateAVCMultiplier(inputs) {\n  const { isFinancial, isLargeFinancial, isRegulated, baseCorrelation } = inputs;\n  \n  // Determine if AVC multiplier applies\n  let avcMultiplier = 1.0;\n  \n  if (isFinancial) {\n    if (isLargeFinancial || !isRegulated) {\n      avcMultiplier = 1.25; // AVC multiplier for large or unregulated financials\n    }\n  }\n  \n  // Calculate final correlation\n  const correlation = baseCorrelation * avcMultiplier;\n  \n  return {\n    avcMultiplier,\n    baseCorrelation,\n    correlation\n  };\n}",
  }
}

function getRWAModuleDetails(data, results) {
  // Check if there are any adjustments
  const hasAdjustment = results.hasAdjustment || results.hasPortfolioAdjustment
  const originalRwa = results.originalRwa || results.rwa
  const adjustedRwa = results.rwa
  const adjustmentPercentage = hasAdjustment && originalRwa > 0 ? (adjustedRwa / originalRwa - 1) * 100 : 0

  return {
    title: "Risk-Weighted Assets (RWA) Calculator",
    description: "Calculates the risk-weighted assets for credit risk under the Advanced IRB approach",
    overview:
      "<p>Risk-Weighted Assets (RWA) for credit risk represent the amount of capital that a bank needs to hold to cover potential losses from credit exposures.</p>" +
      (hasAdjustment
        ? `<p class="text-purple-600 dark:text-purple-400">Note: This RWA value includes manual adjustments. Baseline model RWA: $${Math.round(originalRwa).toLocaleString()}.</p>`
        : ""),
    formula:
      "RWA = K × 12.5 × EAD" +
      (hasAdjustment
        ? `<br><span class="text-purple-600 dark:text-purple-400">Adjusted RWA = Model RWA + Adjustment</span>`
        : ""),
    inputs: [
      {
        name: "PD",
        value: (results.pd * 100).toFixed(4) + "%",
        description: "Probability of Default",
      },
      {
        name: "LGD",
        value: (data.lgd * 100).toFixed(2) + "%",
        rawValue: data.lgd,
        description: "Loss Given Default",
      },
      {
        name: "EAD",
        value: "$" + Math.round(data.ead).toLocaleString(),
        rawValue: data.ead,
        description: "Exposure at Default",
      },
      {
        name: "Correlation",
        value: (results.correlation * 100).toFixed(2) + "%",
        description: "Asset correlation",
      },
      {
        name: "Maturity Adjustment",
        value: results.maturityAdjustment.toFixed(4),
        description: "Adjustment for effective maturity",
      },
    ],
    outputs: [
      {
        name: "Capital Requirement (K)",
        value: (results.k * 100).toFixed(2) + "%",
        description: "Capital requirement as percentage of EAD",
      },
      {
        name: "Model RWA",
        value: "$" + Math.round(originalRwa).toLocaleString(),
        description: "Risk-Weighted Assets calculated by the model before any adjustments",
      },
      {
        name: "Final RWA",
        value: "$" + Math.round(adjustedRwa).toLocaleString(),
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
    ],
    code: "function calculateRWA(inputs) {\n  const { pd, lgd, ead, correlation, maturityAdjustment } = inputs;\n  \n  // Calculate capital requirement (K)\n  const term1 = normInv(pd);\n  const term2 = Math.sqrt(correlation) * normInv(0.999);\n  const term3 = Math.sqrt(1 - correlation);\n  \n  const conditionalPD = normCDF((term1 + term2) / term3);\n  \n  // Calculate capital requirement before maturity adjustment\n  let k = lgd * conditionalPD;\n  \n  // Apply maturity adjustment\n  k *= maturityAdjustment;\n  \n  // Calculate RWA\n  const rwa = k * 12.5 * ead;\n  \n  // Any manual adjustments would be applied here\n  // adjustedRWA = rwa + adjustment;\n  \n  return {\n    k,\n    rwa\n  };\n}",
  }
}
