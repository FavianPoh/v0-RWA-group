// This file contains detailed descriptions of each module in the RWA calculation flow
// The descriptions explain the mathematical operations in plain English

export interface ModuleDescription {
  title: string
  description: string
  formula?: string
  inputs?: string[]
  outputs?: string[]
  notes?: string
}

export const moduleDescriptions: Record<string, ModuleDescription> = {
  exposure: {
    title: "Exposure Module",
    description:
      "This module calculates the Exposure at Default (EAD) based on the loan amount and any credit conversion factors (CCF) for off-balance sheet items.",
    formula: "EAD = Loan Amount × Credit Conversion Factor",
    inputs: ["Loan Amount", "Credit Conversion Factor (for off-balance sheet items)"],
    outputs: ["Exposure at Default (EAD)"],
    notes:
      "For on-balance sheet items, the CCF is typically 100%. For off-balance sheet items like credit lines, the CCF may vary based on the commitment type.",
  },
  pd: {
    title: "Probability of Default Module",
    description:
      "This module determines the Probability of Default (PD) based on the borrower's credit rating and historical performance data.",
    formula: "PD = f(Credit Rating, Historical Default Rates)",
    inputs: ["Credit Rating", "Historical Default Data"],
    outputs: ["Probability of Default (PD)"],
    notes: "PD represents the likelihood that a borrower will default within a one-year period.",
  },
  lgd: {
    title: "Loss Given Default Module",
    description:
      "This module calculates the Loss Given Default (LGD), which is the portion of exposure expected to be lost if a default occurs, taking into account collateral and recovery rates.",
    formula: "LGD = 1 - Recovery Rate",
    inputs: ["Collateral Value", "Recovery Rate", "Seniority of Claim"],
    outputs: ["Loss Given Default (LGD)"],
    notes:
      "LGD is expressed as a percentage of exposure and is influenced by collateral quality, loan seniority, and industry-specific recovery rates.",
  },
  ead: {
    title: "Exposure at Default Module",
    description:
      "This module refines the Exposure at Default (EAD) calculation by incorporating additional factors such as unused commitments and expected drawdowns.",
    formula: "EAD = Current Exposure + (Unused Commitment × Drawdown Factor)",
    inputs: ["Current Exposure", "Unused Commitment", "Drawdown Factor"],
    outputs: ["Final Exposure at Default (EAD)"],
    notes:
      "The drawdown factor estimates how much of an unused credit line a borrower is likely to use before defaulting.",
  },
  maturity: {
    title: "Maturity Adjustment Module",
    description:
      "This module calculates the maturity adjustment factor, which accounts for the term structure of credit risk over the life of the exposure.",
    formula: "Maturity Adjustment = (1 + (M - 2.5) × b) / (1 - 1.5 × b), where b = (0.11852 - 0.05478 × ln(PD))²",
    inputs: ["Effective Maturity (M)", "Probability of Default (PD)"],
    outputs: ["Maturity Adjustment Factor"],
    notes: "Longer maturities generally increase risk weight due to greater uncertainty over longer time horizons.",
  },
  correlation: {
    title: "Asset Correlation Module",
    description:
      "This module calculates the asset correlation factor, which represents the relationship between the borrower's default risk and systematic risk factors.",
    formula:
      "Correlation (R) = 0.12 × (1 - e^(-50 × PD)) / (1 - e^(-50)) + 0.24 × (1 - (1 - e^(-50 × PD)) / (1 - e^(-50)))",
    inputs: ["Probability of Default (PD)"],
    outputs: ["Asset Correlation (R)"],
    notes:
      "Lower PDs typically result in higher correlation values, reflecting the greater influence of systematic risk on high-quality borrowers.",
  },
  capital: {
    title: "Capital Requirement Module",
    description:
      "This module calculates the capital requirement (K) based on PD, LGD, correlation, and maturity adjustment according to the Basel formula.",
    formula: "K = LGD × N[(1 - R)^(-0.5) × G(PD) + (R / (1 - R))^(0.5) × G(0.999)] × Maturity Adjustment",
    inputs: ["PD", "LGD", "Correlation (R)", "Maturity Adjustment"],
    outputs: ["Capital Requirement (K)"],
    notes:
      "N represents the cumulative standard normal distribution function, and G represents its inverse. This formula determines the capital needed to cover unexpected losses.",
  },
  rwa: {
    title: "Risk-Weighted Assets Module",
    description:
      "This module calculates the final Risk-Weighted Assets (RWA) by multiplying the capital requirement by 12.5 (the reciprocal of the 8% minimum capital ratio) and the exposure amount.",
    formula: "RWA = K × 12.5 × EAD",
    inputs: ["Capital Requirement (K)", "Exposure at Default (EAD)"],
    outputs: ["Risk-Weighted Assets (RWA)"],
    notes:
      "When adjustments are applied to this module, they directly impact the final RWA calculation. Adjustments can be absolute (fixed amount) or relative (percentage change).",
  },
  ttcpd: {
    title: "Through-The-Cycle PD Module",
    description:
      "This module adjusts Point-in-Time PD to account for economic cycles, providing a more stable, long-term view of default risk.",
    formula: "TTC PD = PIT PD × (1 + (0.5 - Economic Index) × Cyclicality × 2) × 0.7 + Long-Term Average × 0.3",
    inputs: ["Point-in-Time PD", "Economic Index", "Cyclicality", "Long-Term Average"],
    outputs: ["Through-The-Cycle PD"],
    notes: "TTC PD is less volatile than PIT PD and provides a more conservative estimate during economic upturns.",
  },
  avc: {
    title: "Asset Value Correlation Module",
    description:
      "This module applies a multiplier to asset correlation for financial institutions to account for their higher systemic risk.",
    formula:
      "For large regulated financial institutions or unregulated financial entities: AVC Multiplier = 1.25\nOtherwise: AVC Multiplier = 1.00",
    inputs: ["Financial Institution Status", "Asset Size", "Regulation Status"],
    outputs: ["AVC Multiplier"],
    notes:
      "The AVC multiplier increases capital requirements for financial institutions to reflect their interconnectedness.",
  },
  creditreview: {
    title: "Credit Review Module",
    description:
      "This module allows risk managers to override model-calculated PDs with expert judgment by assigning a credit rating.",
    formula: "If Credit Rating is used: Final PD = Rating-Based PD\nOtherwise: Final PD = Model TTC PD",
    inputs: ["Model TTC PD", "Credit Rating Assessment", "Review Date"],
    outputs: ["Credit Rating", "Rating-Based PD", "PD Override Selection"],
    notes:
      "Credit ratings provide a standardized assessment of creditworthiness based on both quantitative and qualitative factors.",
  },
}

export function getModuleDescription(moduleId: string): ModuleDescription {
  // Add null/undefined check to prevent the error
  if (!moduleId) {
    return {
      title: "Unknown Module",
      description: "Description not available for this module.",
    }
  }

  return (
    moduleDescriptions[moduleId] || {
      title: `${moduleId.toUpperCase()} Module`,
      description: "Description not available for this module.",
    }
  )
}
