# RWA Model Dashboard - Product Requirements Document

**Version:** 1.0  
**Date:** April 28, 2025  
**Project:** Risk-Weighted Assets Model Dashboard

## 1. Executive Summary

The RWA Model Dashboard is a comprehensive risk management tool designed to calculate, visualize, and adjust Risk-Weighted Assets (RWA) for financial institutions. The dashboard provides a modular approach to RWA calculation, allowing risk managers to understand the components that contribute to the final RWA figures and make adjustments at both the counterparty and portfolio levels.

## 2. Product Overview

### 2.1 Purpose

The RWA Model Dashboard enables risk managers to:
- Calculate RWA using Basel regulatory formulas
- Visualize the calculation flow through interactive modules
- Apply and track adjustments to RWA calculations
- Perform sensitivity analysis on key parameters
- Document and justify adjustments for regulatory purposes

### 2.2 Target Users

- Risk managers in financial institutions
- Credit analysts
- Regulatory reporting teams
- Senior management requiring risk insights

## 3. Implemented Features

### 3.1 Core Dashboard Features

#### 3.1.1 RWA Calculation Engine
- **Basel-compliant RWA calculation** using standardized formulas
- **Modular calculation approach** with distinct calculation units
- **Support for multiple counterparties** with different risk profiles
- **Through-The-Cycle (TTC) PD calculation** to account for economic cycles

#### 3.1.2 Dashboard Interface
- **Portfolio overview** with key risk metrics
- **Counterparty list** with detailed risk parameters
- **Interactive module flowchart** showing calculation dependencies
- **Responsive design** for different screen sizes

### 3.2 Adjustment Features

#### 3.2.1 Counterparty-Level Adjustments
- **RWA adjustment panel** for individual counterparties
- **Support for absolute and percentage adjustments**
- **Adjustment tracking** with before/after comparison
- **Visual indicators** for adjusted counterparties

#### 3.2.2 Portfolio-Level Adjustments
- **Portfolio adjustment panel** for applying changes across multiple counterparties
- **Filtering options** to target specific industries or regions
- **Bulk adjustment capabilities** with preview functionality
- **Adjustment impact visualization**

### 3.3 Analysis Features

#### 3.3.1 Sensitivity Analysis
- **Parameter sensitivity testing** to understand impact of changes
- **What-if scenario modeling** for risk parameters
- **Range analysis** with incremental parameter changes
- **Visual representation** of sensitivity results

#### 3.3.2 Credit Review
- **Credit rating override** functionality
- **PD adjustment based on credit ratings**
- **Rating agency mapping** to internal PD scales
- **Credit review documentation**

### 3.4 Visualization Features

#### 3.4.1 Charts and Graphs
- **RWA distribution charts** by industry and region
- **Parameter correlation visualizations**
- **Adjustment heatmaps** showing concentration of changes
- **Time series analysis** of parameter changes

#### 3.4.2 Module Visualization
- **Interactive flowchart** of calculation modules
- **Module dependency visualization**
- **Parameter flow tracking** between modules
- **Impact visualization** of parameter changes

### 3.5 Documentation Features

#### 3.5.1 Module Documentation
- **Detailed module descriptions** with formulas and explanations
- **Regulatory context** for each calculation component
- **Formula visualization** with parameter highlighting
- **Business context** for risk parameters

#### 3.5.2 Code Transparency
- **Access to module code** for transparency
- **Formula explanation** in plain language
- **Parameter documentation** with descriptions and units
- **Calculation logic explanation**

## 4. Technical Specifications

### 4.1 Frontend Technologies
- **React** with Next.js framework
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **shadcn/ui** component library
- **Recharts** for data visualization

### 4.2 Data Structures

#### 4.2.1 Counterparty Data
- Basic information (name, ID, industry, region)
- Risk parameters (PD, LGD, EAD, maturity)
- Financial information (revenue, asset size)
- Adjustment data (type, amount, reason, date)

#### 4.2.2 Module Data
- Module type (input, calculation, output)
- Input parameters
- Output parameters
- Calculation logic
- Documentation

### 4.3 Calculation Flow
1. **Input modules** provide base parameters
2. **Calculation modules** process inputs according to Basel formulas
3. **Adjustment modules** apply user modifications
4. **Output modules** present final RWA figures

## 5. Implemented Modules

### 5.1 Input Modules
- **PD (Probability of Default)** - Base PD calculation
- **LGD (Loss Given Default)** - Loss severity estimation
- **EAD (Exposure at Default)** - Exposure calculation
- **Maturity** - Effective maturity determination

### 5.2 Calculation Modules
- **TTC PD** - Through-the-cycle PD adjustment
- **AVC (Asset Value Correlation)** - Correlation multiplier
- **Correlation** - Asset correlation calculation
- **Credit Review** - Rating-based PD override

### 5.3 Output Modules
- **RWA** - Final risk-weighted assets calculation
- **Capital** - Regulatory capital requirement

## 6. Fixed Issues

### 6.1 Calculation Issues
- Fixed NaN values in input fields
- Corrected RWA adjustment application
- Resolved portfolio adjustment functionality
- Fixed counterparty adjustment tracking

### 6.2 UI Issues
- Improved adjustment visualization
- Enhanced module interaction
- Fixed responsive design issues
- Corrected chart rendering

## 7. Future Enhancements

### 7.1 Planned Features
- **Adjustment history tracking**
- **Adjustment approval workflow**
- **Adjustment reports**
- **Adjustment templates**
- **Adjustment expiration**
- **Input validation**
- **Tooltips to formulas**
- **Module comparison view**
- **Visual indicators**
- **Save presets**
- **Editable documentation**
- **Formula visualization**
- **Parameter validation**
- **Parameter history tracking**
- **Data validation**
- **Improved object rendering**
- **Custom formatters**
- **Error boundaries**
- **Data transformation layer**
- **Unit tests**
- **Data caching**
- **Rating history tracking**
- **Rating migration analysis**
- **Rating comparison view**
- **Rating override workflow**
- **Rating documentation**
- **Data validation checks**
- **Data refresh mechanism**
- **Detailed tooltips to outputs**
- **Enhanced error handling**

## 8. Conclusion

The RWA Model Dashboard provides a comprehensive solution for risk managers to calculate, visualize, and adjust Risk-Weighted Assets in compliance with Basel regulations. The modular approach allows for transparency in the calculation process and flexibility in applying expert judgment through adjustments.

The implemented features address the core needs of risk management teams while providing a foundation for future enhancements to further improve workflow efficiency and regulatory compliance.

---

## Appendix A: Glossary

- **RWA**: Risk-Weighted Assets - A measure of a bank's assets or off-balance-sheet exposures, weighted according to risk.
- **PD**: Probability of Default - The likelihood that a borrower will default on their obligations.
- **LGD**: Loss Given Default - The proportion of the exposure that is lost when a borrower defaults.
- **EAD**: Exposure at Default - The total value that a bank is exposed to when a borrower defaults.
- **TTC PD**: Through-The-Cycle Probability of Default - PD adjusted to reflect long-term average default rates across economic cycles.
- **AVC**: Asset Value Correlation - A measure of the correlation between the asset values of different borrowers.
- **Basel**: International regulatory framework for banks, setting standards for capital adequacy, stress testing, and market liquidity risk.

## Appendix B: Module Relationships

\`\`\`
PD → TTC PD → Correlation → Capital → RWA
     ↑         ↑
     |         |
Credit Review  AVC
     
LGD ----------→ Capital
     
EAD ----------→ RWA
     
Maturity -----→ Capital
\`\`\`

## Appendix C: Feature Implementation Status

| Feature | Status | Notes |
|---------|--------|-------|
| RWA Calculation Engine | Complete | Basel-compliant formulas implemented |
| Dashboard Interface | Complete | Responsive design with key metrics |
| Counterparty Adjustments | Complete | Absolute and percentage adjustments |
| Portfolio Adjustments | Complete | Bulk adjustment capabilities |
| Sensitivity Analysis | Complete | Parameter testing with visualizations |
| Credit Review | Complete | Rating override functionality |
| Module Documentation | Complete | Detailed explanations with formulas |
| Code Transparency | Complete | Access to module code |
| Adjustment History | Planned | For future implementation |
| Approval Workflow | Planned | For future implementation |
