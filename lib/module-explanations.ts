// This file contains detailed explanations for each module in the RWA calculation flow

export interface ModuleExplanation {
  id: string
  title: string
  description: string
  purpose: string
  businessContext: string
  regulatoryContext: string
  formula: string[]
  formulaExplanation: string
  examples?: string[]
  inputParameters: Array<{
    name: string
    description: string
  }>
  outputParameters: Array<{
    name: string
    description: string
  }>
  keyConsiderations: string[]
}

const moduleExplanations: Record<string, ModuleExplanation> = {
  pd: {
    id: "pd",
    title: "Probability of Default (PD) Module",
    description:
      "Calculates the probability that a borrower will default on their debt obligations over a specific time period, typically one year.",
    purpose:
      "To quantify the likelihood of a borrower failing to meet their contractual obligations, resulting in a default event.",
    businessContext:
      "PD is a critical input for credit risk assessment, pricing, and capital allocation. It helps financial institutions evaluate the creditworthiness of borrowers and set appropriate risk premiums.",
    regulatoryContext:
      "Under Basel III, banks must estimate PD for each exposure class. These estimates must be based on historical data and reflect long-run averages (Through-the-Cycle approach) rather than point-in-time assessments.",
    formula: [
      "PD = f(Financial Metrics, Industry Factors, Macroeconomic Conditions)",
      "Where financial metrics include leverage, profitability, and liquidity ratios.",
    ],
    formulaExplanation:
      "PD is typically derived from statistical models that analyze historical default patterns, financial statements, market data, and qualitative factors. The output is a probability value between 0 and 1.",
    examples: [
      "A PD of 0.02 (or 2%) indicates a 2% probability that the borrower will default within the next year.",
      "Investment grade borrowers typically have PDs below 0.4%, while speculative grade borrowers have higher PDs.",
    ],
    inputParameters: [
      {
        name: "Financial Statements",
        description: "Balance sheet, income statement, and cash flow data for the borrower.",
      },
      {
        name: "Market Data",
        description: "Equity prices, CDS spreads, and bond yields that provide market-implied default probabilities.",
      },
      {
        name: "Industry Factors",
        description: "Industry-specific risk factors and historical default rates.",
      },
      {
        name: "Macroeconomic Variables",
        description: "GDP growth, unemployment rates, and other economic indicators.",
      },
    ],
    outputParameters: [
      {
        name: "Point-in-Time PD",
        description: "The probability of default based on current economic conditions.",
      },
      {
        name: "Credit Rating",
        description: "A mapped rating based on the calculated PD value.",
      },
    ],
    keyConsiderations: [
      "PD estimates should be based on at least 5 years of historical data.",
      "Models should be regularly validated and back-tested against actual default experience.",
      "PD estimates should be forward-looking and consider potential economic downturns.",
      "Regulatory requirements may differ from internal risk management needs.",
    ],
  },
  lgd: {
    id: "lgd",
    title: "Loss Given Default (LGD) Module",
    description:
      "Estimates the proportion of exposure that will be lost if a default occurs, taking into account recovery rates and collateral values.",
    purpose:
      "To quantify the severity of loss in the event of default, considering the recovery process and collateral liquidation.",
    businessContext:
      "LGD is essential for pricing credit risk, setting loan loss provisions, and calculating economic capital. It helps financial institutions understand potential losses beyond the simple probability of default.",
    regulatoryContext:
      "Basel III requires banks to estimate downturn LGD, which reflects economic downturn conditions. These estimates must be based on historical recovery data and consider economic cycles.",
    formula: [
      "LGD = 1 - Recovery Rate",
      "Recovery Rate = (Value Recovered / Exposure at Default)",
      "Downturn LGD = LGD × Downturn Factor",
    ],
    formulaExplanation:
      "LGD represents the percentage of exposure that cannot be recovered after a default event. It accounts for collateral, seniority of claim, and costs associated with the recovery process.",
    examples: [
      "An LGD of 45% means that 45% of the exposure will be lost in the event of default, while 55% is expected to be recovered.",
      "Secured loans typically have lower LGDs (e.g., 20-40%) compared to unsecured loans (e.g., 60-90%).",
    ],
    inputParameters: [
      {
        name: "Collateral Value",
        description: "The market value of collateral securing the exposure.",
      },
      {
        name: "Collateral Type",
        description: "The type of collateral (e.g., real estate, securities, equipment).",
      },
      {
        name: "Seniority of Claim",
        description: "The priority of the claim in bankruptcy proceedings.",
      },
      {
        name: "Industry Recovery Rates",
        description: "Historical recovery rates for the borrower's industry.",
      },
      {
        name: "Jurisdiction",
        description: "Legal framework affecting recovery processes and timelines.",
      },
    ],
    outputParameters: [
      {
        name: "LGD",
        description: "The percentage of exposure expected to be lost in the event of default.",
      },
      {
        name: "Downturn LGD",
        description: "LGD adjusted for economic downturn conditions.",
      },
    ],
    keyConsiderations: [
      "LGD estimates should be based on historical recovery data spanning at least one economic cycle.",
      "Collateral valuations should be current and conservative.",
      "Recovery costs, including legal fees and administrative expenses, should be included in LGD calculations.",
      "Time value of money should be considered, as recoveries often occur over several years.",
      "Correlation between PD and LGD should be assessed, as they tend to increase together during economic downturns.",
    ],
  },
  ead: {
    id: "ead",
    title: "Exposure at Default (EAD) Module",
    description:
      "Estimates the expected amount of exposure at the time of default, including drawn amounts and potential future drawdowns.",
    purpose:
      "To quantify the total exposure that could be lost in the event of default, including both current and potential future exposure.",
    businessContext:
      "EAD is crucial for understanding the maximum possible loss from a credit facility. It's particularly important for revolving credit facilities and other commitments where the exposure can fluctuate over time.",
    regulatoryContext:
      "Basel III requires banks to estimate EAD for all exposures. For off-balance sheet items, Credit Conversion Factors (CCFs) are applied to convert these items into credit exposure equivalents.",
    formula: [
      "EAD = Current Drawn Amount + CCF × Undrawn Commitment",
      "Where CCF (Credit Conversion Factor) represents the expected percentage of the undrawn commitment that will be drawn down before default.",
    ],
    formulaExplanation:
      "EAD captures both the current exposure and the potential increase in exposure before a default occurs. For term loans, EAD is typically the outstanding balance, while for revolving facilities, it includes potential future drawdowns.",
    examples: [
      "For a $1 million fully drawn term loan, EAD is simply $1 million.",
      "For a $1 million credit line with $300,000 currently drawn and a CCF of 50%, EAD would be $300,000 + (50% × $700,000) = $650,000.",
    ],
    inputParameters: [
      {
        name: "Current Drawn Amount",
        description: "The amount currently utilized by the borrower.",
      },
      {
        name: "Total Commitment",
        description: "The total amount committed by the lender.",
      },
      {
        name: "Facility Type",
        description: "The type of credit facility (e.g., term loan, revolving credit, guarantee).",
      },
      {
        name: "Credit Conversion Factor",
        description: "The percentage of undrawn commitment expected to be drawn before default.",
      },
    ],
    outputParameters: [
      {
        name: "EAD",
        description: "The expected exposure amount at the time of default.",
      },
      {
        name: "EAD/Commitment Ratio",
        description: "The ratio of EAD to total commitment, useful for monitoring exposure utilization.",
      },
    ],
    keyConsiderations: [
      "CCFs should be based on historical data and reflect borrower behavior during periods of financial stress.",
      "Different facility types require different CCF assumptions.",
      "Covenants and other contractual features that limit drawdowns should be considered.",
      "For derivatives and securities financing transactions, potential future exposure calculations are more complex.",
      "Netting agreements and collateral arrangements can reduce EAD.",
    ],
  },
  maturity: {
    id: "maturity",
    title: "Maturity Adjustment Module",
    description:
      "Adjusts capital requirements to account for the term structure of credit risk, recognizing that longer-term exposures generally carry higher risk.",
    purpose:
      "To incorporate the time dimension of credit risk, acknowledging that uncertainty increases with longer time horizons.",
    businessContext:
      "The maturity adjustment ensures that capital requirements reflect the higher risk associated with longer-term commitments, which are more susceptible to credit migration and market changes.",
    regulatoryContext:
      "Under Basel III's Internal Ratings-Based (IRB) approach, a maturity adjustment factor is applied to capital requirements. The adjustment increases with maturity and decreases with PD.",
    formula: [
      "Maturity Adjustment = (1 + (M - 2.5) × b) / (1 - 1.5 × b)",
      "Where:",
      "M = Effective Maturity (in years)",
      "b = (0.11852 - 0.05478 × ln(PD))²",
    ],
    formulaExplanation:
      "The maturity adjustment increases capital requirements for exposures with longer maturities. The adjustment is more pronounced for low-PD exposures, reflecting the greater potential for credit migration over time.",
    examples: [
      "For a 5-year loan with PD = 1%, the maturity adjustment would be approximately 1.3, increasing capital requirements by 30%.",
      "For a 1-year loan, the maturity adjustment would be less than 1, reducing capital requirements.",
    ],
    inputParameters: [
      {
        name: "Effective Maturity",
        description: "The weighted average life of the exposure, measured in years.",
      },
      {
        name: "Probability of Default",
        description: "The PD of the exposure, used to calculate the 'b' parameter.",
      },
    ],
    outputParameters: [
      {
        name: "Maturity Adjustment Factor",
        description: "The multiplier applied to capital requirements to account for maturity effects.",
      },
      {
        name: "b Parameter",
        description: "An intermediate calculation that determines the sensitivity to maturity changes.",
      },
    ],
    keyConsiderations: [
      "Effective maturity should reflect contractual cash flows and potential prepayments.",
      "For revolving facilities, effective maturity is typically set to a regulatory floor.",
      "The maturity adjustment is capped at 5 years under Basel III.",
      "For retail exposures, no explicit maturity adjustment is required as it's implicitly included in risk weights.",
      "The maturity adjustment formula assumes that credit spreads widen with maturity, which may not always hold in practice.",
    ],
  },
  correlation: {
    id: "correlation",
    title: "Asset Correlation Module",
    description:
      "Estimates the correlation between a borrower's assets and the general state of the economy, which affects the systematic risk component.",
    purpose:
      "To quantify the extent to which a borrower's default risk is driven by systematic factors versus idiosyncratic factors.",
    businessContext:
      "Asset correlation is a key input for portfolio credit risk models and economic capital calculations. It helps financial institutions understand concentration risks and diversification benefits.",
    regulatoryContext:
      "Basel III prescribes asset correlation formulas for different exposure classes. These formulas generally assume that correlation decreases as PD increases, reflecting the observation that higher-risk borrowers are more influenced by idiosyncratic factors.",
    formula: [
      "For Corporate, Sovereign, and Bank Exposures:",
      "R = 0.12 × (1 - e^(-50 × PD)) / (1 - e^(-50)) + 0.24 × (1 - (1 - e^(-50 × PD)) / (1 - e^(-50)))",
      "For Large Financial Institutions:",
      "R = [0.12 × (1 - e^(-50 × PD)) / (1 - e^(-50)) + 0.24 × (1 - (1 - e^(-50 × PD)) / (1 - e^(-50)))] × 1.25",
    ],
    formulaExplanation:
      "The asset correlation formula provides a value between 0 and 1, representing the correlation between a borrower's assets and systematic risk factors. Higher values indicate greater sensitivity to economic conditions.",
    examples: [
      "For a corporate exposure with PD = 1%, the asset correlation would be approximately 0.20 (20%).",
      "For a large financial institution with the same PD, the correlation would be 0.20 × 1.25 = 0.25 (25%), reflecting higher systemic importance.",
    ],
    inputParameters: [
      {
        name: "Probability of Default",
        description: "The PD of the exposure, which inversely affects correlation.",
      },
      {
        name: "Exposure Type",
        description: "The category of exposure (e.g., corporate, retail, financial institution).",
      },
      {
        name: "AVC Multiplier",
        description: "Asset Value Correlation multiplier for financial institutions (typically 1.25).",
      },
    ],
    outputParameters: [
      {
        name: "Asset Correlation",
        description: "The correlation between the borrower's assets and systematic risk factors.",
      },
      {
        name: "Adjusted Correlation",
        description: "Correlation after applying any regulatory adjustments or multipliers.",
      },
    ],
    keyConsiderations: [
      "Asset correlations are not directly observable and must be inferred from market data or prescribed by regulation.",
      "Higher correlations lead to higher capital requirements, reflecting greater systematic risk.",
      "Correlation assumptions significantly impact portfolio risk and economic capital calculations.",
      "Empirical evidence suggests that correlations increase during economic downturns, creating tail risk.",
      "The regulatory correlation formulas are simplified and may not capture all relevant risk factors.",
    ],
  },
  avc: {
    id: "avc",
    title: "Asset Value Correlation (AVC) Module",
    description:
      "Applies a multiplier to asset correlation for financial institutions to account for their higher systemic risk and interconnectedness.",
    purpose:
      "To recognize the increased systematic risk posed by financial institutions due to their interconnectedness and potential to transmit shocks throughout the financial system.",
    businessContext:
      "The AVC adjustment reflects the observation that financial institutions, particularly large ones, exhibit higher asset correlations during periods of stress, contributing to systemic risk.",
    regulatoryContext:
      "Basel III introduced a 25% increase in asset correlation for exposures to financial institutions with assets of at least $100 billion and for unregulated financial entities regardless of size.",
    formula: [
      "For Large Regulated Financial Institutions or Unregulated Financial Entities:",
      "AVC Multiplier = 1.25",
      "For Other Exposures:",
      "AVC Multiplier = 1.00",
    ],
    formulaExplanation:
      "The AVC multiplier increases the asset correlation used in capital calculations, resulting in higher capital requirements for exposures to financial institutions that pose greater systemic risk.",
    examples: [
      "For an exposure to a bank with assets over $100 billion, the AVC multiplier would be 1.25, increasing the asset correlation by 25%.",
      "For an exposure to an unregulated hedge fund, the AVC multiplier would also be 1.25, regardless of its size.",
      "For an exposure to a small regional bank, the AVC multiplier would be 1.00 (no adjustment).",
    ],
    inputParameters: [
      {
        name: "Financial Institution Status",
        description: "Whether the counterparty is a financial institution.",
      },
      {
        name: "Asset Size",
        description: "Total assets of the financial institution (if applicable).",
      },
      {
        name: "Regulation Status",
        description: "Whether the financial entity is regulated or unregulated.",
      },
    ],
    outputParameters: [
      {
        name: "AVC Multiplier",
        description: "The multiplier applied to asset correlation (1.00 or 1.25).",
      },
    ],
    keyConsiderations: [
      "The AVC adjustment is a simplified approach to capturing the higher systemic risk of financial institutions.",
      "The $100 billion threshold is fixed and does not account for inflation or changes in the financial system.",
      "The binary nature of the adjustment (either 1.00 or 1.25) may not fully capture the spectrum of systemic risk.",
      "The definition of 'unregulated financial entity' may require judgment and can vary across jurisdictions.",
      "The AVC adjustment applies only to wholesale exposures, not to retail exposures.",
    ],
  },
  rwa: {
    id: "rwa",
    title: "Risk-Weighted Assets (RWA) Module",
    description:
      "Calculates the final Risk-Weighted Assets by combining the capital requirement with the exposure amount and the Basel scaling factor.",
    purpose:
      "To determine the amount of capital that must be held against credit risk exposures, reflecting their relative riskiness.",
    businessContext:
      "RWA is a key metric for capital adequacy assessment, regulatory reporting, and strategic decision-making. It influences business mix, pricing, and resource allocation within financial institutions.",
    regulatoryContext:
      "Under Basel III, RWA is calculated by multiplying the capital requirement (K) by 12.5 (the reciprocal of the 8% minimum capital ratio) and the exposure amount (EAD).",
    formula: [
      "RWA = K × 12.5 × EAD",
      "Where:",
      "K = LGD × N[(1-R)^(-0.5) × G(PD) + (R/(1-R))^(0.5) × G(0.999)] × Maturity Adjustment",
      "N = Cumulative standard normal distribution function",
      "G = Inverse cumulative standard normal distribution function",
      "R = Asset correlation",
    ],
    formulaExplanation:
      "The RWA calculation converts the capital requirement (K) into a risk-weighted asset amount. The factor of 12.5 (1/0.08) scales the capital requirement to the equivalent RWA under an 8% minimum capital ratio.",
    examples: [
      "For an exposure with EAD = $1 million and K = 8%, RWA would be $1 million × 8% × 12.5 = $1 million.",
      "For an exposure with EAD = $1 million and K = 4%, RWA would be $1 million × 4% × 12.5 = $500,000.",
    ],
    inputParameters: [
      {
        name: "Capital Requirement (K)",
        description: "The regulatory capital requirement as a percentage of exposure.",
      },
      {
        name: "Exposure at Default (EAD)",
        description: "The expected exposure amount at the time of default.",
      },
      {
        name: "Scaling Factor",
        description: "The Basel scaling factor, typically 12.5 (1/0.08).",
      },
    ],
    outputParameters: [
      {
        name: "Risk-Weighted Assets (RWA)",
        description: "The final risk-weighted asset amount.",
      },
      {
        name: "RWA Density",
        description: "The ratio of RWA to EAD, indicating the average risk weight.",
      },
    ],
    keyConsiderations: [
      "RWA is a key input for calculating regulatory capital ratios (e.g., CET1 ratio, Total Capital ratio).",
      "RWA can be adjusted through credit risk mitigation techniques such as collateral, guarantees, and netting.",
      "The Basel Committee periodically reviews and adjusts RWA calculation methodologies to address identified weaknesses.",
      "Internal models for RWA calculation must be validated and approved by regulators.",
      "RWA calculations should be transparent and well-documented to facilitate regulatory review and internal governance.",
    ],
  },
  ttcpd: {
    id: "ttcpd",
    title: "Through-The-Cycle PD Module",
    description:
      "Converts Point-in-Time (PIT) PD estimates to Through-The-Cycle (TTC) PD estimates, which reflect long-term average default rates across economic cycles.",
    purpose:
      "To provide stable PD estimates that are less sensitive to current economic conditions and more reflective of long-term credit risk.",
    businessContext:
      "TTC PD estimates are used for capital planning, stress testing, and long-term risk assessment. They help financial institutions maintain stable capital requirements throughout economic cycles.",
    regulatoryContext:
      "Basel III requires banks to use TTC PD estimates for regulatory capital calculations to reduce procyclicality in capital requirements.",
    formula: [
      "TTC PD = PIT PD × Cyclical Adjustment Factor + Long-Term Average Component",
      "Cyclical Adjustment Factor = f(Current Economic Position, Cyclicality of Industry)",
      "Long-Term Average Component = Historical Default Rate over a Full Economic Cycle",
    ],
    formulaExplanation:
      "The TTC PD calculation adjusts the PIT PD to remove cyclical effects. When the economy is strong, TTC PDs are typically higher than PIT PDs; when the economy is weak, TTC PDs are typically lower than PIT PDs.",
    examples: [
      "During an economic boom, a borrower might have a PIT PD of 0.5%, but a TTC PD of 1.2% reflecting the potential for deterioration in a downturn.",
      "During a recession, a borrower might have a PIT PD of 3.0%, but a TTC PD of 2.0% reflecting the expectation of improvement in an economic recovery.",
    ],
    inputParameters: [
      {
        name: "Point-in-Time PD",
        description: "The PD estimate based on current economic conditions.",
      },
      {
        name: "Economic Index",
        description: "An indicator of the current position in the economic cycle (0-1 scale).",
      },
      {
        name: "Cyclicality",
        description: "The sensitivity of the borrower's default risk to economic cycles.",
      },
      {
        name: "Long-Term Average Default Rate",
        description: "The historical average default rate over a full economic cycle.",
      },
    ],
    outputParameters: [
      {
        name: "Through-The-Cycle PD",
        description: "The PD estimate adjusted for economic cycles.",
      },
      {
        name: "Cyclical Adjustment Factor",
        description: "The factor applied to convert PIT PD to TTC PD.",
      },
    ],
    keyConsiderations: [
      "TTC PD estimates should be based on data covering at least one full economic cycle.",
      "The cyclical adjustment should consider industry-specific factors and regional economic conditions.",
      "TTC PD models should be regularly validated against long-term default experience.",
      "The distinction between PIT and TTC approaches affects not only PD but also correlation and other risk parameters.",
      "Hybrid approaches that combine elements of both PIT and TTC methodologies are sometimes used.",
    ],
  },
  creditreview: {
    id: "creditreview",
    title: "Credit Review Module",
    description:
      "Allows risk managers to override model-calculated PDs with expert judgment by assigning a credit rating.",
    purpose:
      "To incorporate qualitative factors and expert judgment into the PD assessment process, complementing quantitative model outputs.",
    businessContext:
      "Credit reviews ensure that PD estimates reflect all available information, including factors that may not be captured by statistical models. They are a key component of the credit approval and monitoring process.",
    regulatoryContext:
      "Basel III recognizes the importance of expert judgment in the rating process. Banks must have clear policies for when and how model outputs can be overridden.",
    formula: [
      "If Credit Rating is assigned:",
      "Final PD = Rating-Based PD from Rating Scale",
      "Otherwise:",
      "Final PD = Model TTC PD",
    ],
    formulaExplanation:
      "The credit review process allows risk managers to assign a credit rating based on a combination of quantitative model outputs and qualitative assessments. This rating is then mapped to a PD using the bank's rating scale.",
    examples: [
      "A model might calculate a TTC PD of 0.8% for a borrower, but a credit review might assign a rating corresponding to a PD of 1.2% due to concerns about management quality or industry outlook.",
      "Conversely, a model might calculate a TTC PD of 2.5%, but a credit review might assign a better rating corresponding to a PD of 1.8% based on positive qualitative factors not captured by the model.",
    ],
    inputParameters: [
      {
        name: "Model TTC PD",
        description: "The Through-The-Cycle PD calculated by the quantitative model.",
      },
      {
        name: "Qualitative Assessment",
        description: "Expert judgment on factors not captured by the model.",
      },
      {
        name: "Rating Scale",
        description: "The bank's internal rating scale with corresponding PD ranges.",
      },
    ],
    outputParameters: [
      {
        name: "Credit Rating",
        description: "The assigned internal credit rating.",
      },
      {
        name: "Rating-Based PD",
        description: "The PD corresponding to the assigned credit rating.",
      },
      {
        name: "Final PD",
        description: "The PD used for capital calculations after the credit review process.",
      },
    ],
    keyConsiderations: [
      "Credit rating overrides should be documented and justified.",
      "The frequency and direction of overrides should be monitored to identify potential model weaknesses.",
      "Credit reviews should be conducted by qualified personnel independent from the lending function.",
      "The rating scale should be regularly calibrated to ensure that ratings correspond to appropriate PD levels.",
      "Governance processes should ensure consistency in the application of expert judgment across the portfolio.",
    ],
  },
}

export function getModuleExplanation(moduleId: string): ModuleExplanation | null {
  if (!moduleId) return null
  return moduleExplanations[moduleId.toLowerCase()] || null
}
