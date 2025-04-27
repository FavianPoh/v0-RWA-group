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

// Add this function to export all counterparties for dropdown options
export function getAllCounterparties() {
  // This is a placeholder - in a real implementation, this would fetch all counterparties
  // For now, we'll return a sample set of counterparties with all possible values
  return [
    {
      id: "c1",
      name: "Bank of America",
      industry: "Banking",
      region: "North America",
      isFinancial: true,
      isLargeFinancial: true,
      isRegulated: true,
      pd: 0.0025,
      ttcPd: 0.0035,
      lgd: 0.45,
      ead: 10000000,
      maturity: 2.5,
    },
    {
      id: "c2",
      name: "Toyota Motor Corp",
      industry: "Automotive",
      region: "Asia",
      isFinancial: false,
      isLargeFinancial: false,
      isRegulated: false,
      pd: 0.0045,
      ttcPd: 0.0055,
      lgd: 0.4,
      ead: 5000000,
      maturity: 3.0,
    },
    {
      id: "c3",
      name: "Deutsche Bank",
      industry: "Banking",
      region: "Europe",
      isFinancial: true,
      isLargeFinancial: true,
      isRegulated: true,
      pd: 0.0035,
      ttcPd: 0.0045,
      lgd: 0.45,
      ead: 8000000,
      maturity: 2.0,
    },
    {
      id: "c4",
      name: "Hedge Fund Partners",
      industry: "Financial Services",
      region: "North America",
      isFinancial: true,
      isLargeFinancial: false,
      isRegulated: false,
      pd: 0.0085,
      ttcPd: 0.0095,
      lgd: 0.5,
      ead: 3000000,
      maturity: 1.5,
    },
    {
      id: "c5",
      name: "Walmart Inc",
      industry: "Retail",
      region: "North America",
      isFinancial: false,
      isLargeFinancial: false,
      isRegulated: false,
      pd: 0.003,
      ttcPd: 0.004,
      lgd: 0.35,
      ead: 4000000,
      maturity: 2.5,
    },
    {
      id: "c6",
      name: "Samsung Electronics",
      industry: "Technology",
      region: "Asia",
      isFinancial: false,
      isLargeFinancial: false,
      isRegulated: false,
      pd: 0.0025,
      ttcPd: 0.0035,
      lgd: 0.3,
      ead: 6000000,
      maturity: 3.5,
    },
    {
      id: "c7",
      name: "Credit Suisse",
      industry: "Banking",
      region: "Europe",
      isFinancial: true,
      isLargeFinancial: true,
      isRegulated: true,
      pd: 0.0045,
      ttcPd: 0.0055,
      lgd: 0.45,
      ead: 7500000,
      maturity: 2.0,
    },
    {
      id: "c8",
      name: "BP plc",
      industry: "Energy",
      region: "Europe",
      isFinancial: false,
      isLargeFinancial: false,
      isRegulated: false,
      pd: 0.0055,
      ttcPd: 0.0065,
      lgd: 0.4,
      ead: 9000000,
      maturity: 4.0,
    },
    {
      id: "c9",
      name: "Small Credit Union",
      industry: "Banking",
      region: "North America",
      isFinancial: true,
      isLargeFinancial: false,
      isRegulated: true,
      pd: 0.0065,
      ttcPd: 0.0075,
      lgd: 0.45,
      ead: 1000000,
      maturity: 2.0,
    },
    {
      id: "c10",
      name: "Healthcare Provider",
      industry: "Healthcare",
      region: "North America",
      isFinancial: false,
      isLargeFinancial: false,
      isRegulated: true,
      pd: 0.0035,
      ttcPd: 0.0045,
      lgd: 0.35,
      ead: 2500000,
      maturity: 3.0,
    },
  ]
}

export const generateCounterparties = generateSyntheticData
