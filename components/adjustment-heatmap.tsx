"use client"

import { useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export function AdjustmentHeatmap({ counterparties }) {
  // Group counterparties by industry and region
  const groupedData = useMemo(() => {
    const byIndustry = {}
    const byRegion = {}

    // Filter only counterparties with adjustments
    const adjustedCounterparties = counterparties.filter((cp) => cp.hasAdjustment)

    // Group by industry
    adjustedCounterparties.forEach((cp) => {
      if (!byIndustry[cp.industry]) {
        byIndustry[cp.industry] = []
      }
      byIndustry[cp.industry].push(cp)
    })

    // Group by region
    adjustedCounterparties.forEach((cp) => {
      if (!byRegion[cp.region]) {
        byRegion[cp.region] = []
      }
      byRegion[cp.region].push(cp)
    })

    return { byIndustry, byRegion }
  }, [counterparties])

  // Get color based on adjustment percentage
  const getAdjustmentColor = (percentage) => {
    const absPercentage = Math.abs(percentage)

    if (percentage > 0) {
      // Green shades for positive adjustments
      if (absPercentage > 20) return "bg-green-600 text-white"
      if (absPercentage > 10) return "bg-green-500 text-white"
      if (absPercentage > 5) return "bg-green-400 text-white"
      return "bg-green-300 text-green-900"
    } else {
      // Red shades for negative adjustments
      if (absPercentage > 20) return "bg-red-600 text-white"
      if (absPercentage > 10) return "bg-red-500 text-white"
      if (absPercentage > 5) return "bg-red-400 text-white"
      return "bg-red-300 text-red-900"
    }
  }

  // If no adjustments, show a message
  if (Object.keys(groupedData.byIndustry).length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-muted-foreground">No adjustments have been applied</p>
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto">
      <TooltipProvider>
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-2">Adjustments by Industry</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {Object.entries(groupedData.byIndustry).map(([industry, counterparties]) => (
                <Tooltip key={industry}>
                  <TooltipTrigger asChild>
                    <Card className="p-2 cursor-help">
                      <div className="text-xs font-medium mb-1">{industry}</div>
                      <div className="flex flex-wrap gap-1">
                        {counterparties.map((cp) => (
                          <Badge key={cp.id} className={`text-xs ${getAdjustmentColor(cp.adjustmentPercentage)}`}>
                            {cp.adjustmentPercentage >= 0 ? "+" : ""}
                            {cp.adjustmentPercentage.toFixed(1)}%
                          </Badge>
                        ))}
                      </div>
                    </Card>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="space-y-1">
                      <p className="font-medium">{industry}</p>
                      <p className="text-xs">Adjusted counterparties: {counterparties.length}</p>
                      <div className="space-y-1">
                        {counterparties.map((cp) => (
                          <div key={cp.id} className="text-xs flex justify-between gap-4">
                            <span>{cp.name}:</span>
                            <span className={cp.adjustmentPercentage >= 0 ? "text-green-600" : "text-red-600"}>
                              {cp.adjustmentPercentage >= 0 ? "+" : ""}
                              {cp.adjustmentPercentage.toFixed(2)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-2">Adjustments by Region</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {Object.entries(groupedData.byRegion).map(([region, counterparties]) => (
                <Tooltip key={region}>
                  <TooltipTrigger asChild>
                    <Card className="p-2 cursor-help">
                      <div className="text-xs font-medium mb-1">{region}</div>
                      <div className="flex flex-wrap gap-1">
                        {counterparties.map((cp) => (
                          <Badge key={cp.id} className={`text-xs ${getAdjustmentColor(cp.adjustmentPercentage)}`}>
                            {cp.adjustmentPercentage >= 0 ? "+" : ""}
                            {cp.adjustmentPercentage.toFixed(1)}%
                          </Badge>
                        ))}
                      </div>
                    </Card>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="space-y-1">
                      <p className="font-medium">{region}</p>
                      <p className="text-xs">Adjusted counterparties: {counterparties.length}</p>
                      <div className="space-y-1">
                        {counterparties.map((cp) => (
                          <div key={cp.id} className="text-xs flex justify-between gap-4">
                            <span>{cp.name}:</span>
                            <span className={cp.adjustmentPercentage >= 0 ? "text-green-600" : "text-red-600"}>
                              {cp.adjustmentPercentage >= 0 ? "+" : ""}
                              {cp.adjustmentPercentage.toFixed(2)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>
        </div>
      </TooltipProvider>
    </div>
  )
}
