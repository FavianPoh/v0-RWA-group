// Generate synthetic data for the RWA model

const counterpartyNames = [
  "Acme Corporation",
  "Globex Industries",
  "Oceanic Airlines",
  "Stark Enterprises",
  "Wayne Enterprises",
  "Umbrella Corporation",
  "Cyberdyne Systems",
  "Soylent Corp",
  "Massive Dynamic",
  "Weyland-Yutani Corp",
  "Tyrell Corporation",
  "Oscorp Industries",
  "Initech",
  "Gekko & Co",
  "Nakatomi Trading Corp",
]

export function generateSyntheticData(count = 10) {
  return Array.from({ length: Math.min(count, counterpartyNames.length) }, (_, i) => {
    // Generate PD between 0.1% and 5%
    const pd = 0.001 + Math.random() * 0.049

    // Generate LGD between 30% and 70%
    const lgd = 0.3 + Math.random() * 0.4

    // Generate EAD between $1M and $50M
    const ead = 1000000 + Math.random() * 49000000

    // Generate maturity between 1 and 5 years
    const maturity = 1 + Math.random() * 4

    // Generate revenue between $10M and $1B
    const revenue = 10000000 + Math.random() * 990000000

    // Generate asset size between $50M and $5B
    const assetSize = 50000000 + Math.random() * 4950000000

    // Determine if it's a financial institution (make some of them financial)
    const isFinancial = i % 3 === 0

    // Determine if it's a large financial (asset size > $100B)
    const isLargeFinancial = isFinancial && Math.random() > 0.5

    // Determine if it's regulated
    const isRegulated = isFinancial && Math.random() > 0.3

    // Generate TTC PD inputs
    const macroeconomicIndex = 0.6 // Slightly above neutral economy
    const longTermAverage = isFinancial ? 0.015 : 0.025 // Long-term average default rate
    const cyclicality = isFinancial ? 0.7 : 0.5 // Financial institutions are more cyclical

    // Calculate TTC PD (slightly higher than PIT PD in good economic conditions)
    const ttcPd = pd * (1 + (0.5 - macroeconomicIndex) * cyclicality * 2)

    return {
      id: `cp-${i + 1}`,
      name: counterpartyNames[i],
      pd,
      ttcPd,
      lgd,
      ead,
      maturity,
      revenue,
      assetSize,
      industry: isFinancial ? getRandomFinancialIndustry() : getRandomNonFinancialIndustry(),
      region: getRandomRegion(),
      isFinancial,
      isLargeFinancial,
      isRegulated,
      // TTC PD calculation inputs
      macroeconomicIndex,
      longTermAverage,
      cyclicality,
      // Credit review data (initially null)
      creditRating: null,
      creditReviewDate: null,
      useCredRatingPd: false,
    }
  })
}

function getRandomFinancialIndustry() {
  const industries = ["Banking", "Insurance", "Asset Management", "Investment Banking", "Financial Services"]
  return industries[Math.floor(Math.random() * industries.length)]
}

function getRandomNonFinancialIndustry() {
  const industries = [
    "Technology",
    "Healthcare",
    "Manufacturing",
    "Energy",
    "Retail",
    "Telecommunications",
    "Transportation",
    "Real Estate",
    "Consumer Goods",
  ]
  return industries[Math.floor(Math.random() * industries.length)]
}

function getRandomRegion() {
  const regions = ["North America", "Europe", "Asia Pacific", "Latin America", "Middle East"]
  return regions[Math.floor(Math.random() * regions.length)]
}
