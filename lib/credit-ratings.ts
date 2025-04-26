// Credit ratings to PD mapping
// These are approximate midpoint PDs for S&P ratings based on historical default rates

export const creditRatings = [
  { rating: "AAA", pd: 0.0001, description: "Extremely strong capacity to meet financial commitments" },
  { rating: "AA+", pd: 0.0002, description: "Very strong capacity to meet financial commitments" },
  { rating: "AA", pd: 0.0003, description: "Very strong capacity to meet financial commitments" },
  { rating: "AA-", pd: 0.0004, description: "Very strong capacity to meet financial commitments" },
  { rating: "A+", pd: 0.0005, description: "Strong capacity to meet financial commitments" },
  { rating: "A", pd: 0.0007, description: "Strong capacity to meet financial commitments" },
  { rating: "A-", pd: 0.0009, description: "Strong capacity to meet financial commitments" },
  { rating: "BBB+", pd: 0.0012, description: "Adequate capacity to meet financial commitments" },
  { rating: "BBB", pd: 0.0022, description: "Adequate capacity to meet financial commitments" },
  { rating: "BBB-", pd: 0.0035, description: "Considered lowest investment grade by market participants" },
  { rating: "BB+", pd: 0.0065, description: "Less vulnerable in the near-term but faces ongoing uncertainties" },
  { rating: "BB", pd: 0.012, description: "Less vulnerable in the near-term but faces ongoing uncertainties" },
  { rating: "BB-", pd: 0.019, description: "Less vulnerable in the near-term but faces ongoing uncertainties" },
  { rating: "B+", pd: 0.029, description: "More vulnerable to adverse business, financial and economic conditions" },
  { rating: "B", pd: 0.045, description: "More vulnerable to adverse business, financial and economic conditions" },
  { rating: "B-", pd: 0.065, description: "More vulnerable to adverse business, financial and economic conditions" },
  {
    rating: "CCC+",
    pd: 0.095,
    description: "Currently vulnerable and dependent on favorable conditions to meet commitments",
  },
  {
    rating: "CCC",
    pd: 0.14,
    description: "Currently vulnerable and dependent on favorable conditions to meet commitments",
  },
  { rating: "CCC-", pd: 0.19, description: "Currently highly vulnerable" },
  { rating: "CC", pd: 0.25, description: "Currently highly vulnerable" },
  { rating: "C", pd: 0.35, description: "A bankruptcy petition has been filed but payments are continued" },
  { rating: "D", pd: 1.0, description: "Payment default on financial commitments" },
]

// Function to get PD from rating
export function getPdFromRating(rating: string): number {
  const ratingData = creditRatings.find((r) => r.rating === rating)
  return ratingData ? ratingData.pd : 0.01 // Default to 1% if rating not found
}

// Function to get the closest rating from a PD value
export function getRatingFromPd(pd: number): string {
  // Sort by absolute difference between the pd and the rating pd
  const sortedRatings = [...creditRatings].sort((a, b) => {
    return Math.abs(a.pd - pd) - Math.abs(b.pd - pd)
  })

  return sortedRatings[0].rating
}
