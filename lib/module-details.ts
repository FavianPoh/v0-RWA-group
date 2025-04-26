// Module details for the RWA model

import { calculateTtcPd } from "./ttc-pd-calculator"
import { getRatingFromPd } from "./credit-ratings"

export function getModuleDetails(moduleId, data, results) {
  switch (moduleId) {
    case "pd":
      return getPDModuleDetails(data)
    case "ttcpd":
      return getTtcPDModuleDetails(data)
    case "creditreview":
      return getCreditReviewModuleDetails(data)
    case "lgd":
      return getLGDModuleDetails(data)
    case "ead":
      return getEADModuleDetails(data)
    case "correlation":
      return getCorrelationModuleDetails(data, results)
    case "maturity":
      return getMaturityModuleDetails(data, results)
    case "avc":
      return getAVCModuleDetails(data, results)
    case "rwa":
      return getRWAModuleDetails(data, results)
    default:
      return null
  }
}

function getPDModuleDetails(data) {
  return {
    title: "Point-in-Time Probability of Default (PD) Calculator",
    description:
      "Calculates the probability that a counterparty will default within a one-year period based on current conditions",
    overview: `
      <p>The Point-in-Time (PIT) Probability of Default (PD) is a key risk metric that estimates the likelihood that a counterparty will default on its obligations within a one-year period based on current economic conditions. It reflects the counterparty's current financial health and is more sensitive to short-term economic fluctuations.</p>
      <p>PIT PD is influenced by various factors including the counterparty's financial health, industry conditions, and current macroeconomic factors. For this implementation, we're using synthetic data that represents a realistic distribution of PD values across different types of counterparties.</p>
      <p>PIT PD is typically used for short-term risk management and pricing, but for regulatory capital calculations, a Through-The-Cycle (TTC) PD is preferred as it's more stable across economic cycles.</p>
    `,
    formula: `PIT PD = P(Asset Value < Default Threshold | Current Economic Conditions)

For the Vasicek model:
Default Threshold = N⁻¹(PD)

where N⁻¹ is the inverse of the standard normal cumulative distribution function.`,
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
        value: `Index: ${data.macroeconomicIndex.toFixed(2)}`,
        description: "Current state of the economy (higher values indicate stronger economy)",
      },
    ],
    outputs: [
      {
        name: "PIT PD",
        value: `${(data.pd * 100).toFixed(4)}%`,
        description: "Point-in-Time Probability of Default over a one-year period",
      },
      {
        name: "Equivalent Rating",
        value: getRatingFromPd(data.pd),
        description: "Approximate credit rating equivalent to this PD",
      },
    ],
    code: `// Point-in-Time PD Model Implementation

/**
 * Calculate Point-in-Time PD using market and financial data
 * @param {Object} financialData - Financial statements and ratios
 * @param {Object} marketData - Market-based indicators
 * @param {Object} economicData - Current economic indicators
 * @returns {number} - Point-in-Time Probability of Default
 */
function calculatePointInTimePD(financialData, marketData, economicData) {
  // Financial ratios have the strongest influence on PD
  const financialScore = calculateFinancialScore(financialData);
  
  // Market data provides forward-looking signals
  const marketScore = calculateMarketScore(marketData);
  
  // Economic data captures current conditions
  const economicScore = calculateEconomicScore(economicData);
  
  // Combine scores with appropriate weights
  const combinedScore = (
    financialScore * 0.6 + 
    marketScore * 0.3 + 
    economicScore * 0.1
  );
  
  // Convert score to PD using a calibrated function
  return scoreToDefaultProbability(combinedScore);
}

// Calculate financial score based on key ratios
function calculateFinancialScore(financialData) {
  // Key ratios that predict default
  const { 
    debtToEbitda, 
    interestCoverageRatio,
    currentRatio,
    returnOnAssets,
    leverageRatio
  } = financialData;
  
  // Calculate weighted score
  let score = 0;
  
  // Higher debt to EBITDA increases default risk
  score += mapToScore(debtToEbitda, 0, 10, 1, 0) * 0.3;
  
  // Higher interest coverage reduces default risk
  score += mapToScore(interestCoverageRatio, 0, 5, 0, 1) * 0.25;
  
  // Higher current ratio reduces default risk
  score += mapToScore(currentRatio, 0, 3, 0, 1) * 0.15;
  
  // Higher ROA reduces default risk
  score += mapToScore(returnOnAssets, -0.1, 0.2, 0, 1) * 0.15;
  
  // Higher leverage increases default risk
  score += mapToScore(leverageRatio, 0, 1, 1, 0) * 0.15;
  
  return score;
}

// Convert final score to probability of default
function scoreToDefaultProbability(score) {
  // Logistic function to map score to PD
  return 1 / (1 + Math.exp(10 * (score - 0.5)));
}`,
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

  // Calculate TTC PD for verification
  const calculatedTtcPd = calculateTtcPd(ttcInputs)

  return {
    title: "Through-The-Cycle (TTC) Probability of Default Calculator",
    description: "Calculates the probability of default adjusted for economic cycles",
    overview: `
      <p>The Through-The-Cycle (TTC) Probability of Default represents the average default probability of a counterparty over an entire economic cycle, rather than at a specific point in time. This approach provides a more stable measure of credit risk that is less sensitive to short-term economic fluctuations.</p>
      <p>TTC PD is calculated by adjusting the Point-in-Time (PIT) PD to account for the current position in the economic cycle. When the economy is strong, the TTC PD is typically higher than the PIT PD, as it factors in the possibility of future downturns. Conversely, during economic downturns, the TTC PD is typically lower than the PIT PD.</p>
      <p>Regulatory frameworks like Basel III require the use of TTC PD for capital calculations to ensure that capital requirements remain stable throughout economic cycles.</p>
    `,
    formula: `TTC PD = PIT PD × Adjustment Factor + (Long-Term Average × Weight)

where:
Adjustment Factor = 1 + (Economic Deviation × Cyclicality × 2)
Economic Deviation = 0.5 - Current Economic Index
Weight = Blending factor (typically 0.3)`,
    inputs: [
      {
        name: "Point-in-Time PD",
        value: `${(data.pd * 100).toFixed(4)}%`,
        description: "Current PD based on present economic conditions",
      },
      {
        name: "Economic Index",
        value: data.macroeconomicIndex.toFixed(2),
        description: "Current position in the economic cycle (0-1, where 1 is strong economy)",
      },
      {
        name: "Long-Term Average Default Rate",
        value: `${(data.longTermAverage * 100).toFixed(2)}%`,
        description: "Historical average default rate for this industry/sector",
      },
      {
        name: "Cyclicality",
        value: data.cyclicality.toFixed(2),
        description: "How sensitive the industry is to economic cycles (0-1)",
      },
    ],
    outputs: [
      {
        name: "TTC PD",
        value: `${(data.ttcPd * 100).toFixed(4)}%`,
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
    code: `/**
 * Calculate Through-The-Cycle (TTC) PD
 * @param {Object} inputs - Input parameters
 * @param {number} inputs.pointInTimePd - Point-in-Time PD
 * @param {number} inputs.macroeconomicIndex - Current economic conditions (0-1)
 * @param {number} inputs.longTermAverage - Long-term average default rate
 * @param {number} inputs.cyclicality - Industry cyclicality (0-1)
 * @returns {number} - Through-The-Cycle PD
 */
function calculateTtcPd(inputs) {
  const { pointInTimePd, macroeconomicIndex, longTermAverage, cyclicality } = inputs;
  
  // Calculate economic adjustment factor
  // When economy is strong (index close to 1), PIT PD is lower than TTC PD
  // When economy is weak (index close to 0), PIT PD is higher than TTC PD
  const economicDeviation = 0.5 - macroeconomicIndex; // Deviation from neutral economy
  
  // Calculate adjustment based on cyclicality and economic conditions
  const adjustment = 1 + (economicDeviation * cyclicality * 2);
  
  // Calculate TTC PD by adjusting PIT PD with the economic cycle
  let ttcPd = pointInTimePd * adjustment;
  
  // Blend with long-term average to ensure stability
  ttcPd = ttcPd * 0.7 + longTermAverage * 0.3;
  
  // Ensure PD is within reasonable bounds
  return Math.max(0.0001, Math.min(1, ttcPd));
}`,
  }
}

function getCreditReviewModuleDetails(data) {
  return {
    title: "Credit Review Module",
    description: "Assigns credit ratings and corresponding PDs based on expert judgment",
    overview: `
      <p>The Credit Review module allows risk managers to assign credit ratings to counterparties based on expert judgment, qualitative assessments, and external ratings from agencies like S&P, Moody's, or Fitch. This provides an alternative or complementary approach to the model-based PD calculation.</p>
      <p>Credit ratings offer a standardized way to assess creditworthiness across different counterparties and can incorporate qualitative factors that may not be fully captured by quantitative models. Each rating corresponds to a specific probability of default based on historical default rates for that rating category.</p>
      <p>Users can choose whether to use the rating-based PD or the model-calculated PD for risk-weighted asset calculations, providing flexibility in the risk assessment process.</p>
    `,
    formula: `Credit Rating → PD Mapping

Each rating (AAA to D) is mapped to a specific probability of default based on historical default rates.`,
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
        value: `${(data.ttcPd * 100).toFixed(4)}%`,
        description: "PD calculated by the TTC model",
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
        value: data.creditRatingPd ? `${(data.creditRatingPd * 100).toFixed(4)}%` : "N/A",
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
    code: `/**
 * Map credit rating to probability of default
 * @param {string} rating - Credit rating (e.g., "AAA", "BBB+", etc.)
 * @returns {number} - Corresponding probability of default
 */
function getPdFromRating(rating) {
  // Mapping of ratings to approximate PD values
  const ratingToPdMap = {
    "AAA": 0.0001,   // 0.01%
    "AA+": 0.0002,   // 0.02%
    "AA": 0.0003,    // 0.03%
    "AA-": 0.0004,   // 0.04%
    "A+": 0.0005,    // 0.05%
    "A": 0.0007,     // 0.07%
    "A-": 0.0009,    // 0.09%
    "BBB+": 0.0012,  // 0.12%
    "BBB": 0.0022,   // 0.22%
    "BBB-": 0.0035,  // 0.35%
    "BB+": 0.0065,   // 0.65%
    "BB": 0.0120,    // 1.20%
    "BB-": 0.0190,   // 1.90%
    "B+": 0.0290,    // 2.90%
    "B": 0.0450,     // 4.50%
    "B-": 0.0650,    // 6.50%
    "CCC+": 0.0950,  // 9.50%
    "CCC": 0.1400,   // 14.00%
    "CCC-": 0.1900,  // 19.00%
    "CC": 0.2500,    // 25.00%
    "C": 0.3500,     // 35.00%
    "D": 1.0000      // 100.00%
  };
  
  return ratingToPdMap[rating] || 0.01; // Default to 1% if rating not found
}

/**
 * Find the closest rating for a given PD
 * @param {number} pd - Probability of default
 * @returns {string} - Closest matching credit rating
 */
function getRatingFromPd(pd) {
  // Array of [rating, pd] pairs
  const ratingPdPairs = Object.entries(ratingToPdMap);
  
  // Sort by absolute difference between the pd and the rating pd
  const sortedRatings = [...ratingPdPairs].sort((a, b) => {
    return Math.abs(a[1] - pd) - Math.abs(b[1] - pd);
  });
  
  return sortedRatings[0][0]; // Return the closest rating
}`,
  }
}

function getLGDModuleDetails(data) {
  return {
    title: "Loss Given Default (LGD) Calculator",
    description: "Calculates the portion of an asset that is lost when a counterparty defaults",
    overview: `
      <p>Loss Given Default (LGD) represents the percentage of exposure that is lost when a counterparty defaults. It is essentially (1 - recovery rate), where the recovery rate is the proportion of the exposure that can be recovered through collateral liquidation or other recovery processes.</p>
      <p>LGD is influenced by factors such as collateral quality, seniority of the claim, industry sector, and jurisdiction. In Basel frameworks, LGD is a key input to the capital requirement calculation.</p>
    `,
    formula: `LGD = 1 - Recovery Rate

where Recovery Rate is the proportion of exposure that can be recovered in the event of default.`,
    inputs: [
      {
        name: "Collateral Value",
        value: `$${Math.round(data.ead * 0.7).toLocaleString()}`,
        description: "Value of collateral securing the exposure",
      },
      {
        name: "Collateral Type",
        value: "Mixed",
        description: "Type of collateral (cash, securities, real estate, etc.)",
      },
      {
        name: "Seniority",
        value: "Senior Secured",
        description: "Seniority of the claim in bankruptcy proceedings",
      },
    ],
    outputs: [
      {
        name: "LGD",
        value: `${(data.lgd * 100).toFixed(2)}%`,
        description: "Loss Given Default as a percentage of exposure",
      },
    ],
    code: `/**
 * Calculate Loss Given Default (LGD)
 * @param {Object} collateralData - Information about the collateral
 * @param {number} exposureAmount - Total exposure amount
 * @param {string} seniority - Seniority of the claim
 * @returns {number} - LGD as a decimal (0-1)
 */
function calculateLGD(collateralData, exposureAmount, seniority) {
  // First, we determine the base recovery rate based on seniority
  let baseRecoveryRate;
  
  // Assign recovery rates based on claim seniority
  switch (seniority) {
    case "Senior Secured":
      baseRecoveryRate = 0.70; // 70% recovery
      break;
    case "Senior Unsecured":
      baseRecoveryRate = 0.45; // 45% recovery
      break;
    case "Subordinated":
      baseRecoveryRate = 0.30; // 30% recovery
      break;
    case "Junior Subordinated":
      baseRecoveryRate = 0.15; // 15% recovery
      break;
    default:
      baseRecoveryRate = 0.40; // Default recovery rate
  }
  
  // Adjust recovery rate based on collateral quality and value
  let collateralAdjustment = 0;
  
  // Calculate the collateral coverage ratio
  const collateralCoverageRatio = collateralData.value / exposureAmount;
  
  // Adjust recovery based on collateral coverage
  if (collateralCoverageRatio >= 1.5) {
    collateralAdjustment = 0.15; // Strong overcollateralization
  } else if (collateralCoverageRatio >= 1.0) {
    collateralAdjustment = 0.10; // Full collateralization
  } else if (collateralCoverageRatio >= 0.7) {
    collateralAdjustment = 0.05; // Partial collateralization
  }
  
  // Apply haircuts based on collateral type
  let collateralHaircut = 0;
  
  switch (collateralData.type) {
    case "Cash":
      collateralHaircut = 0.0; // No haircut for cash
      break;
    case "Government Securities":
      collateralHaircut = 0.02; // 2% haircut
      break;
    case "Corporate Bonds":
      collateralHaircut = 0.15; // 15% haircut
      break;
    case "Equities":
      collateralHaircut = 0.25; // 25% haircut
      break;
    case "Real Estate":
      collateralHaircut = 0.40; // 40% haircut
      break;
    case "Mixed":
      collateralHaircut = 0.20; // 20% haircut for mixed collateral
      break;
    default:
      collateralHaircut = 0.30; // Default haircut
  }
  
  // Calculate final recovery rate
  const adjustedRecoveryRate = Math.min(
    1.0, // Cap at 100%
    baseRecoveryRate + collateralAdjustment - collateralHaircut
  );
  
  // LGD is 1 minus the recovery rate
  return Math.max(0, 1 - adjustedRecoveryRate);
}`,
  }
}

function getEADModuleDetails(data) {
  return {
    title: "Exposure at Default (EAD) Calculator",
    description: "Calculates the expected amount of exposure at the time of default",
    overview: `
      <p>Exposure at Default (EAD) represents the total value that a bank is exposed to when a counterparty defaults. For loans, this is typically the outstanding balance. For commitments or other off-balance sheet items, EAD includes an estimate of additional drawings that may occur before default.</p>
      <p>EAD is calculated by applying a Credit Conversion Factor (CCF) to undrawn commitments, which estimates the portion of the undrawn amount that will be drawn down before default.</p>
    `,
    formula: `EAD = Drawn Amount + CCF × Undrawn Amount

where CCF is the Credit Conversion Factor.`,
    inputs: [
      {
        name: "Drawn Amount",
        value: `$${Math.round(data.ead * 0.8).toLocaleString()}`,
        description: "Currently utilized portion of the credit facility",
      },
      {
        name: "Undrawn Amount",
        value: `$${Math.round(data.ead * 0.25).toLocaleString()}`,
        description: "Unused portion of the committed credit facility",
      },
      {
        name: "Credit Conversion Factor",
        value: "75%",
        description: "Estimated percentage of undrawn amount that will be drawn before default",
      },
    ],
    outputs: [
      {
        name: "EAD",
        value: `$${Math.round(data.ead).toLocaleString()}`,
        description: "Total exposure expected at the time of default",
      },
    ],
    code: `/**
 * Calculate Exposure at Default (EAD)
 * @param {number} drawnAmount - Currently utilized portion of the credit facility
 * @param {number} undrawnAmount - Unused portion of the committed credit facility
 * @param {number} ccf - Credit Conversion Factor (0-1)
 * @param {string} productType - Type of credit product
 * @returns {number} - Exposure at Default
 */
function calculateEAD(drawnAmount, undrawnAmount, ccf, productType) {
  // Base EAD calculation
  let ead = drawnAmount + (ccf * undrawnAmount);
  
  // Apply product-specific adjustments
  switch (productType) {
    case "Revolving Credit":
      // For revolving facilities, we might apply a higher CCF
      // based on historical utilization patterns
      const utilizationRatio = drawnAmount / (drawnAmount + undrawnAmount);
      
      // If utilization is already high, expect more drawdown before default
      if (utilizationRatio > 0.7) {
        // Adjust the CCF upward for high utilization
        const adjustedCCF = Math.min(1.0, ccf * 1.2);
        ead = drawnAmount + (adjustedCCF * undrawnAmount);
      }
      break;
      
    case "Term Loan":
      // For term loans, EAD is typically just the outstanding balance
      // as there are usually no undrawn commitments
      ead = drawnAmount;
      break;
      
    case "Trade Finance":
      // Trade finance products often have specific regulatory treatments
      // For example, letters of credit might have lower CCFs
      ead = drawnAmount + (ccf * 0.8 * undrawnAmount);
      break;
      
    case "Derivatives":
      // For derivatives, we would calculate potential future exposure
      // This is a simplified version - real calculations are more complex
      const volatilityFactor = 0.15; // Example factor
      const maturityInYears = 1.0; // Example maturity
      const potentialFutureExposure = drawnAmount * volatilityFactor * Math.sqrt(maturityInYears);
      ead = drawnAmount + potentialFutureExposure;
      break;
      
    default:
      // Default calculation already applied above
      break;
  }
  
  return Math.max(0, ead); // EAD cannot be negative
}`,
  }
}

function getCorrelationModuleDetails(data, results) {
  return {
    title: "Asset Correlation Calculator",
    description: "Calculates the correlation between the counterparty's assets and systematic risk factors",
    overview: `
      <p>Asset correlation represents the degree to which the asset value of a counterparty moves in relation to the general state of the economy. In the Basel framework, asset correlation is a function of the probability of default (PD).</p>
      <p>The correlation formula in Basel is designed to reflect the empirical observation that larger, more stable companies (with lower PDs) tend to be more correlated with the overall economy, while smaller companies or those with higher PDs tend to default more due to idiosyncratic factors.</p>
      <p>For financial institutions, Basel Cre31 requires applying a multiplier of 1.25 to the correlation for large regulated financial institutions and all unregulated financial institutions.</p>
    `,
    formula: `Base Correlation = 0.12 × (1 - e^(-50 × PD)) / (1 - e^(-50)) + 0.24 × (1 - (1 - e^(-50 × PD)) / (1 - e^(-50)))

For financial institutions meeting Basel Cre31 criteria:
Final Correlation = Base Correlation × 1.25

where e is the mathematical constant (approximately 2.71828).`,
    inputs: [
      {
        name: "PD",
        value: `${(results.pd * 100).toFixed(4)}%`,
        description: "Probability of Default used in calculation",
      },
      {
        name: "Base Correlation",
        value: `${(results.baseCorrelation * 100).toFixed(2)}%`,
        description: "Correlation before AVC multiplier",
      },
      {
        name: "AVC Multiplier",
        value: `${results.avcMultiplier.toFixed(2)}x`,
        description: "Asset Value Correlation multiplier (Basel Cre31)",
      },
      {
        name: "Industry",
        value: data.industry,
        description: "Counterparty industry sector",
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
    ],
    outputs: [
      {
        name: "Final Correlation",
        value: `${(results.correlation * 100).toFixed(2)}%`,
        description: "Asset correlation with systematic risk factors after AVC adjustment",
      },
    ],
    code: `/**
* Calculate asset correlation based on Basel formula with Cre31 adjustments
* @param {number} pd - Probability of Default (as a decimal)
* @param {boolean} isFinancial - Whether the counterparty is a financial institution
* @param {boolean} isLargeFinancial - Whether the financial institution has assets ≥ $100bn
* @param {boolean} isRegulated - Whether the financial institution is regulated
* @returns {number} - Asset correlation (as a decimal)
*/
function calculateCorrelation(pd, isFinancial, isLargeFinancial, isRegulated) {
 // Calculate base correlation using Basel formula
 const WEIGHT_FACTOR = 50;
 const MIN_CORRELATION = 0.12; // 12%
 const MAX_CORRELATION = 0.24; // 24%
 
 // Calculate the weight based on PD
 const weight = (1 - Math.exp(-WEIGHT_FACTOR * pd)) / (1 - Math.exp(-WEIGHT_FACTOR));
 
 // Calculate base correlation as weighted average of min and max values
 const baseCorrelation = MIN_CORRELATION * weight + MAX_CORRELATION * (1 - weight);
 
 // Determine if AVC multiplier should be applied (Basel Cre31)
 let avcMultiplier = 1.0;
 
 if (isFinancial) {
   if (isLargeFinancial || !isRegulated) {
     // According to Basel Cre31, correlation is multiplied by 1.25 for:
     // - Exposures to financial institutions with assets ≥ $100bn
     // - Exposures to unregulated financial institutions regardless of size
     avcMultiplier = 1.25;
   }
 }
 
 // Apply AVC multiplier to get final correlation
 const finalCorrelation = baseCorrelation * avcMultiplier;
 
 return {
   baseCorrelation: baseCorrelation,
   avcMultiplier: avcMultiplier,
   finalCorrelation: finalCorrelation
 };
}`,
  }
}

function getMaturityModuleDetails(data, results) {
  return {
    title: "Maturity Adjustment Calculator",
    description: "Calculates the adjustment factor for the maturity of the exposure",
    overview: `
      <p>The maturity adjustment accounts for the fact that longer-term exposures are riskier than shorter-term ones, even if they have the same PD over a one-year horizon. This is because the credit quality of a counterparty can deteriorate over time.</p>
      <p>In the Basel framework, the maturity adjustment is a function of both PD and the effective maturity of the exposure. The adjustment increases with maturity and decreases with PD.</p>
    `,
    formula: `Maturity Adjustment = (1 + (M - 2.5) × b) / (1 - 1.5 × b)

where:
b = (0.11852 - 0.05478 × ln(PD))²
M = Effective maturity in years`,
    inputs: [
      {
        name: "PD",
        value: `${(results.pd * 100).toFixed(4)}%`,
        description: "Probability of Default used in calculation",
      },
      {
        name: "Effective Maturity",
        value: `${data.maturity.toFixed(2)} years`,
        description: "Weighted average life of the exposure",
      },
      {
        name: "b parameter",
        value: `${((0.11852 - 0.05478 * Math.log(results.pd)) ** 2).toFixed(6)}`,
        description: "Slope of the maturity adjustment",
      },
    ],
    outputs: [
      {
        name: "Maturity Adjustment",
        value: results.maturityAdjustment.toFixed(4),
        description: "Factor to adjust capital requirements for maturity",
      },
    ],
    code: `/**
* Calculate maturity adjustment based on Basel formula
* @param {number} pd - Probability of Default (as a decimal)
* @param {number} maturity - Effective maturity in years
* @returns {number} - Maturity adjustment factor
*/
function calculateMaturityAdjustment(pd, maturity) {
 // Calculate the 'b' parameter (slope of the maturity adjustment)
 const b = Math.pow(0.11852 - 0.05478 * Math.log(pd), 2);
 
 // Apply the maturity adjustment formula
 // This increases capital requirements for longer maturities
 const maturityAdjustment = (1 + (maturity - 2.5) * b) / (1 - 1.5 * b);
 
 // The adjustment is floored at 1 for short maturities
 return Math.max(1, maturityAdjustment);
}

// For certain short-term exposures, Basel allows a different treatment
function calculateShortTermMaturityAdjustment(pd, maturity, isQualifyingShortTerm) {
 // Check if this qualifies for short-term treatment
 if (isQualifyingShortTerm && maturity <= 1) {
   // For qualifying short-term exposures (e.g., certain trade finance)
   // we might apply a simplified approach or a lower floor
   return 1.0; // No maturity adjustment
 } else {
   // Standard maturity adjustment
   return calculateMaturityAdjustment(pd, maturity);
 }
}`,
  }
}

function getAVCModuleDetails(data, results) {
  return {
    title: "Asset Value Correlation (AVC) Multiplier",
    description: "Determines the correlation multiplier for financial institutions under Basel Cre31",
    overview: `
      <p>The Asset Value Correlation (AVC) multiplier is a regulatory adjustment required by Basel Cre31 for certain financial institutions. It increases the correlation parameter used in the RWA calculation to account for the higher systemic risk posed by financial institutions.</p>
      <p>According to Basel Cre31, a multiplier of 1.25 is applied to the asset correlation for:</p>
      <ul>
        <li>Exposures to regulated financial institutions with total assets ≥ $100 billion</li>
        <li>All exposures to unregulated financial institutions, regardless of size</li>
      </ul>
      <p>This higher correlation reflects the increased interconnectedness and systemic importance of large financial institutions.</p>
    `,
    formula: `AVC Multiplier = 1.25 (if financial institution meets Basel Cre31 criteria)
AVC Multiplier = 1.00 (otherwise)`,
    inputs: [
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
        name: "Industry",
        value: data.industry,
        description: "Counterparty industry sector",
      },
      {
        name: "Asset Size",
        value: `$${Math.round(data.assetSize).toLocaleString()}`,
        description: "Total assets of the counterparty",
      },
    ],
    outputs: [
      {
        name: "AVC Multiplier",
        value: `${results.avcMultiplier.toFixed(2)}x`,
        description: "Multiplier applied to correlation for Basel Cre31",
      },
    ],
    code: `/**
* Determine if AVC multiplier should be applied according to Basel Cre31
* @param {boolean} isFinancial - Whether the counterparty is a financial institution
* @param {boolean} isLargeFinancial - Whether the financial institution has assets ≥ $100bn
* @param {boolean} isRegulated - Whether the financial institution is regulated
* @returns {number} - AVC multiplier (1.0 or 1.25)
*/
function determineAVCMultiplier(isFinancial, isLargeFinancial, isRegulated) {
 // According to Basel Cre31, correlation is multiplied by 1.25 for:
 // - Exposures to financial institutions with assets ≥ $100bn
 // - Exposures to unregulated financial institutions regardless of size
 
 if (isFinancial) {
   if (isLargeFinancial || !isRegulated) {
     return 1.25; // Apply AVC multiplier
   }
 }
 
 return 1.0; // No AVC multiplier
}`,
  }
}

function getRWAModuleDetails(data, results) {
  return {
    title: "Risk-Weighted Assets (RWA) Calculator",
    description: "Calculates the final risk-weighted assets based on all risk components",
    overview: `
      <p>Risk-Weighted Assets (RWA) is the final output of the credit risk calculation under the Basel framework. It represents the risk-adjusted value of an exposure, which is used to determine the minimum capital requirement.</p>
      <p>The RWA calculation combines all the risk components (PD, LGD, EAD, correlation, maturity adjustment) to determine the capital requirement (K), which is then multiplied by 12.5 (the reciprocal of the 8% minimum capital ratio) and the EAD to get the RWA.</p>
    `,
    formula: `RWA = K × 12.5 × EAD

where:
K = LGD × N[(1 - R)^(-0.5) × G(PD) + (R / (1 - R))^(0.5) × G(0.999)] × Maturity Adjustment

N = Cumulative standard normal distribution
G = Inverse cumulative standard normal distribution
R = Correlation (with AVC multiplier applied if applicable)`,
    inputs: [
      {
        name: "PD",
        value: `${(results.pd * 100).toFixed(4)}%`,
        description: "Probability of Default used in calculation",
      },
      {
        name: "PD Source",
        value: data.useCredRatingPd && data.creditRating ? "Credit Rating" : "TTC Model",
        description: "Source of the PD value used",
      },
      {
        name: "LGD",
        value: `${(data.lgd * 100).toFixed(2)}%`,
        description: "Loss Given Default",
      },
      {
        name: "EAD",
        value: `$${Math.round(data.ead).toLocaleString()}`,
        description: "Exposure at Default",
      },
      {
        name: "Base Correlation",
        value: `${(results.baseCorrelation * 100).toFixed(2)}%`,
        description: "Asset correlation before AVC multiplier",
      },
      {
        name: "AVC Multiplier",
        value: `${results.avcMultiplier.toFixed(2)}x`,
        description: "Asset Value Correlation multiplier (Basel Cre31)",
      },
      {
        name: "Final Correlation",
        value: `${(results.correlation * 100).toFixed(2)}%`,
        description: "Asset correlation after AVC adjustment",
      },
      {
        name: "Maturity Adjustment",
        value: results.maturityAdjustment.toFixed(4),
        description: "Adjustment for maturity",
      },
    ],
    outputs: [
      {
        name: "Capital Requirement (K)",
        value: `${(results.k * 100).toFixed(2)}%`,
        description: "Minimum capital requirement as percentage of exposure",
      },
      {
        name: "RWA",
        value: `$${Math.round(results.rwa).toLocaleString()}`,
        description: "Risk-Weighted Assets",
      },
      {
        name: "RWA Density",
        value: `${((results.rwa / data.ead) * 100).toFixed(2)}%`,
        description: "RWA as a percentage of EAD",
      },
    ],
    code: `/**
* Calculate Risk-Weighted Assets (RWA)
* @param {number} pd - Probability of Default
* @param {number} lgd - Loss Given Default
* @param {number} ead - Exposure at Default
* @param {number} correlation - Asset correlation (with AVC multiplier applied)
* @param {number} maturityAdjustment - Maturity adjustment factor
* @returns {Object} - Capital requirement and RWA
*/
function calculateRWA(pd, lgd, ead, correlation, maturityAdjustment) {
 // Constants
 const CONFIDENCE_LEVEL = 0.999; // 99.9% confidence level
 const SQRT_CORRELATION = Math.sqrt(correlation);
 const INVERSE_NORMAL_PD = normalInverse(pd);
 const INVERSE_NORMAL_CONFIDENCE = normalInverse(CONFIDENCE_LEVEL);
 
 // Calculate conditional PD using the Basel formula
 const conditionalPD = normalCDF(
   (INVERSE_NORMAL_PD + SQRT_CORRELATION * INVERSE_NORMAL_CONFIDENCE) / 
   Math.sqrt(1 - correlation)
 );
 
 // Calculate capital requirement (K)
 const k = lgd * conditionalPD * maturityAdjustment;
 
 // Calculate RWA
 // The factor 12.5 is the reciprocal of the 8% minimum capital ratio
 const rwa = ead * k * 12.5;
 
 return {
   k: k,
   rwa: rwa,
   rwaDensity: (rwa / ead) * 100 // RWA as percentage of EAD
 };
}`,
  }
}
