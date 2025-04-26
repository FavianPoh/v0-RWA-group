interface ParameterInfo {
  name: string
  description: string
}

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
  inputParameters: ParameterInfo[]
  outputParameters: ParameterInfo[]
  keyConsiderations: string[]
}

const moduleExplanations: Record<string, ModuleExplanation> = {
  PD: {
    id: "PD",
    title: "Probability of Default (PD)",
    description:
      "Estimates the likelihood that a borrower will default on their debt obligations over a specific time period.",
    purpose:
      "The PD module calculates the probability that a borrower will fail to meet their contractual obligations, resulting in a default event.",
    businessContext:
      "PD is a critical input for credit risk assessment, pricing loans, and determining appropriate capital reserves. It helps financial institutions evaluate the creditworthiness of borrowers and make informed lending decisions.",
    regulatoryContext:
      "Under Basel frameworks, banks must estimate PD for each borrower grade or pool as part of their internal ratings-based (IRB) approach to credit risk. These estimates must represent a long-run average default rate and meet specific regulatory requirements.",
    formula: [
      "PD = f(credit rating, financial metrics, market conditions)",
      "TTC PD = Long-run average PD across economic cycles",
      "Point-in-time PD = TTC PD × cyclical adjustment factor",
    ],
    formulaExplanation:
      "The Probability of Default is typically derived from historical default data, credit ratings, and statistical models. Through-the-cycle (TTC) PD represents a long-run average that smooths out economic cycles, while point-in-time PD incorporates current economic conditions.",
    examples: [
      "A credit rating of BBB might correspond to a TTC PD of 0.18%",
      "During economic downturns, the point-in-time PD might be adjusted upward by a factor of 1.5-3x",
    ],
    inputParameters: [
      { name: "creditRating", description: "The credit rating assigned to the borrower (e.g., AAA, AA, A, BBB)" },
      {
        name: "ttcPD",
        description: "Through-the-cycle probability of default, representing long-run average default rates",
      },
      { name: "adjustmentFactor", description: "Factor applied to the TTC PD to reflect current economic conditions" },
    ],
    outputParameters: [
      { name: "PD", description: "The final probability of default estimate used in risk calculations" },
    ],
    keyConsiderations: [
      "PD estimates should be based on at least 5-7 years of historical data to capture a full economic cycle",
      "Different borrower types (corporate, retail, sovereign) require different PD estimation approaches",
      "Regulatory floors may apply to PD values (e.g., 0.03% under Basel III)",
      "PD estimates should be validated regularly using backtesting and benchmarking",
    ],
  },
  LGD: {
    id: "LGD",
    title: "Loss Given Default (LGD)",
    description: "Measures the proportion of exposure that is lost when a borrower defaults.",
    purpose:
      "The LGD module estimates the percentage of the exposure amount that will not be recovered if a default occurs, accounting for collateral, seniority, and recovery processes.",
    businessContext:
      "LGD is essential for calculating expected loss and economic capital. It helps financial institutions understand potential losses and set appropriate loan pricing and provisions.",
    regulatoryContext:
      "Basel frameworks require banks using the advanced IRB approach to provide their own estimates of LGD, which must reflect economic downturn conditions and be appropriately conservative.",
    formula: [
      "LGD = 1 - Recovery Rate",
      "Recovery Rate = (Value Recovered / Exposure at Default)",
      "Downturn LGD = LGD × Downturn Factor",
    ],
    formulaExplanation:
      "LGD represents the percentage of exposure that is not recovered after default. It is calculated as 1 minus the recovery rate, where the recovery rate is the ratio of the value recovered to the exposure at default. Downturn LGD incorporates stress conditions to ensure conservatism.",
    examples: [
      "A senior secured loan might have an LGD of 25%",
      "An unsecured loan might have an LGD of 60-70%",
      "During economic downturns, LGD values typically increase by 10-30%",
    ],
    inputParameters: [
      { name: "collateralValue", description: "The value of collateral securing the exposure" },
      {
        name: "collateralType",
        description: "The type of collateral (e.g., real estate, financial securities, equipment)",
      },
      { name: "seniority", description: "The seniority of the claim in bankruptcy proceedings" },
      { name: "downturnFactor", description: "Factor applied to reflect economic downturn conditions" },
    ],
    outputParameters: [{ name: "LGD", description: "The final loss given default estimate used in risk calculations" }],
    keyConsiderations: [
      "LGD estimates should be based on historical recovery data from default events",
      "Downturn LGD must be used for regulatory capital calculations",
      "Different collateral types have different recovery rates and liquidation costs",
      "Time to recovery affects the present value of recoveries and thus the effective LGD",
      "Workout costs should be included in LGD calculations",
    ],
  },
  EAD: {
    id: "EAD",
    title: "Exposure at Default (EAD)",
    description: "Estimates the expected amount of exposure to a counterparty at the time of default.",
    purpose:
      "The EAD module calculates the total amount that could be lost if a borrower defaults, including both drawn amounts and potential future drawdowns on committed facilities.",
    businessContext:
      "EAD is crucial for understanding the maximum potential loss from a credit exposure. It helps financial institutions manage credit limits and concentration risk.",
    regulatoryContext:
      "Basel frameworks require banks to estimate EAD for each facility. For off-balance sheet items, this involves calculating a credit conversion factor (CCF) to estimate how much of the undrawn commitment will be drawn before default.",
    formula: [
      "EAD = Drawn Amount + CCF × Undrawn Commitment",
      "CCF = Expected additional drawdown before default / Undrawn commitment",
      "For derivatives: EAD = Current Exposure + Potential Future Exposure",
    ],
    formulaExplanation:
      "EAD combines the currently drawn amount with an estimate of additional drawdowns that might occur before default. For credit lines, this is calculated using a Credit Conversion Factor (CCF) applied to the undrawn commitment. For derivatives, potential future exposure is also considered.",
    examples: [
      "For a $1M credit line with $600K drawn and a CCF of 50%, EAD = $600K + (50% × $400K) = $800K",
      "For fully drawn term loans, EAD equals the outstanding balance",
      "For derivatives, EAD includes current mark-to-market value plus an add-on for potential future exposure",
    ],
    inputParameters: [
      { name: "drawnAmount", description: "The amount currently utilized by the borrower" },
      { name: "undrawnAmount", description: "The amount committed but not yet drawn by the borrower" },
      {
        name: "ccf",
        description: "Credit Conversion Factor: the proportion of undrawn amount expected to be drawn before default",
      },
      {
        name: "facilityType",
        description: "The type of credit facility (e.g., term loan, revolving credit, guarantee)",
      },
    ],
    outputParameters: [
      { name: "EAD", description: "The final exposure at default estimate used in risk calculations" },
    ],
    keyConsiderations: [
      "CCF estimates should be based on historical data of drawdown patterns before default",
      "Different facility types have different drawdown behaviors and require different CCFs",
      "EAD for derivatives should account for netting agreements and collateral",
      "Regulatory floors may apply to CCF values",
      "Downturn conditions may affect drawdown behavior and should be considered",
    ],
  },
  RWA: {
    id: "RWA",
    title: "Risk-Weighted Assets (RWA)",
    description: "Calculates the risk-adjusted value of assets for determining regulatory capital requirements.",
    purpose:
      "The RWA module transforms credit exposures into risk-weighted values that reflect their relative riskiness, forming the denominator in capital ratio calculations.",
    businessContext:
      "RWA is fundamental for capital management, strategic planning, and performance measurement. It allows for risk-adjusted returns analysis and efficient capital allocation across business lines.",
    regulatoryContext:
      "Basel frameworks use RWA as the basis for calculating minimum capital requirements. Banks must maintain capital ratios (e.g., CET1, Tier 1, Total Capital) as percentages of their total RWA.",
    formula: [
      "Under Standardized Approach: RWA = Exposure × Risk Weight",
      "Under IRB Approach: RWA = 12.5 × K × EAD",
      "Where K = LGD × N[(1-R)^(-0.5) × G(PD) + (R/(1-R))^(0.5) × G(0.999)] - (PD × LGD)",
      "R = 0.12 × (1 - EXP(-50 × PD)) / (1 - EXP(-50)) + 0.24 × [1 - (1 - EXP(-50 × PD))/(1 - EXP(-50))]",
    ],
    formulaExplanation:
      "RWA calculation depends on the approach used. Under the Standardized Approach, predefined risk weights are applied based on exposure categories and external ratings. Under the IRB Approach, RWA is calculated using internal estimates of risk parameters (PD, LGD, EAD) and regulatory formulas that convert these into capital requirements.",
    examples: [
      "Under the Standardized Approach, a $1M corporate loan with a BBB rating might have a risk weight of 100%, resulting in RWA of $1M",
      "Under the IRB Approach, the same loan with PD=1%, LGD=45%, might result in RWA of approximately $700K",
      "A well-secured residential mortgage might have a risk weight of 35%, so a $200K mortgage would have RWA of $70K",
    ],
    inputParameters: [
      { name: "PD", description: "Probability of Default: likelihood of borrower defaulting within one year" },
      { name: "LGD", description: "Loss Given Default: percentage of exposure expected to be lost if default occurs" },
      { name: "EAD", description: "Exposure at Default: expected amount of exposure when default occurs" },
      { name: "maturity", description: "Effective maturity of the exposure, in years" },
      { name: "assetClass", description: "Regulatory asset class (e.g., corporate, retail, sovereign)" },
    ],
    outputParameters: [
      { name: "RWA", description: "Risk-Weighted Assets: the final risk-adjusted value used for capital calculations" },
      { name: "K", description: "Capital requirement as a percentage of exposure" },
    ],
    keyConsiderations: [
      "RWA calculations differ significantly between Standardized and IRB approaches",
      "Asset correlation (R) in the IRB formula varies by asset class and PD level",
      "Maturity adjustments increase capital requirements for longer-term exposures",
      "SME supporting factors may reduce RWA for eligible small business lending",
      "Credit risk mitigation techniques (collateral, guarantees) can reduce RWA",
      "Model risk and parameter uncertainty should be considered when using internal models",
    ],
  },
  RAROC: {
    id: "RAROC",
    title: "Risk-Adjusted Return on Capital (RAROC)",
    description:
      "Measures the risk-adjusted profitability of business activities relative to the economic capital they consume.",
    purpose:
      "The RAROC module provides a consistent framework for comparing the performance of different business activities with varying risk profiles.",
    businessContext:
      "RAROC is essential for strategic decision-making, performance evaluation, and incentive compensation. It helps ensure that higher returns from riskier activities are properly adjusted for their additional risk.",
    regulatoryContext:
      "While not a regulatory requirement, RAROC supports sound risk management practices expected under Basel Pillar 2 and helps banks optimize their business mix within regulatory constraints.",
    formula: [
      "RAROC = (Revenue - Expenses - Expected Loss + Capital Benefit) / Economic Capital",
      "Capital Benefit = Economic Capital × Risk-Free Rate",
      "Hurdle Rate = Cost of Equity × (Economic Capital / Regulatory Capital)",
    ],
    formulaExplanation:
      "RAROC divides risk-adjusted net income by the economic capital allocated to an activity. The numerator includes revenues, minus expenses and expected losses, plus the benefit from investing the economic capital. The denominator is the economic capital required to support the activity. The result is compared to a hurdle rate to determine if the activity creates shareholder value.",
    examples: [
      "For a loan with revenue=$100K, expenses=$30K, EL=$10K, capital benefit=$5K, and EC=$200K, RAROC = ($100K - $30K - $10K + $5K) / $200K = 32.5%",
      "If the hurdle rate is 15%, this activity creates significant value",
      "A higher-risk activity might have RAROC=18% vs. a lower-risk activity with RAROC=16%, making the higher-risk activity more attractive despite its greater absolute risk",
    ],
    inputParameters: [
      { name: "revenue", description: "Total income generated by the activity" },
      { name: "expenses", description: "Direct and allocated costs associated with the activity" },
      { name: "expectedLoss", description: "Average credit losses anticipated from the activity" },
      { name: "economicCapital", description: "Capital required to absorb unexpected losses" },
      { name: "riskFreeRate", description: "Return available on risk-free investments" },
      { name: "costOfEquity", description: "Required return on the bank's equity capital" },
    ],
    outputParameters: [
      { name: "RAROC", description: "Risk-Adjusted Return on Capital: risk-adjusted profitability measure" },
      { name: "excessReturn", description: "Difference between RAROC and hurdle rate, indicating value creation" },
    ],
    keyConsiderations: [
      "RAROC should be compared to an appropriate hurdle rate to assess value creation",
      "Transfer pricing for funds and capital significantly impacts RAROC calculations",
      "Multi-year RAROC should consider the time value of money and risk profile changes",
      "RAROC can be calculated at various levels: transaction, customer, portfolio, business unit",
      "Different RAROC methods exist, with variations in calculating the numerator and denominator",
    ],
  },
}

export function getModuleExplanation(moduleId: string): ModuleExplanation | null {
  if (!moduleId) return null

  // Normalize the module ID for lookup
  const normalizedId = moduleId.toUpperCase()

  return moduleExplanations[normalizedId] || null
}
