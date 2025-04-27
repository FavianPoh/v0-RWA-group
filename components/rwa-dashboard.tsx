"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ModuleFlowchart } from "@/components/module-flowchart"
import { SensitivityAnalysis } from "@/components/sensitivity-analysis"
import { CreditReviewDialog } from "@/components/credit-review-dialog"
import { RWAPortfolioDashboard } from "@/components/rwa-portfolio-dashboard"
import { calculateRWA } from "@/lib/rwa-calculator"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { RotateCcw } from "lucide-react"

// Add imports for the new components
import { RWAAdjustmentPanel } from "@/components/rwa-adjustment-panel"
import { PortfolioAdjustmentPanel } from "@/components/portfolio-adjustment-panel"

export function RWADashboard({ data }) {
  // Update the state to track RWA adjustments
  const [counterparties, setCounterparties] = useState(data)
  const [selectedCounterparty, setSelectedCounterparty] = useState(data[0].id)
  const [selectedModule, setSelectedModule] = useState(null)
  const [view, setView] = useState("flowchart")
  const [showCreditReview, setShowCreditReview] = useState(false)
  const [modifiedModules, setModifiedModules] = useState([])
  const [showRWAAdjustment, setShowRWAAdjustment] = useState(false)
  const [showPortfolioAdjustment, setShowPortfolioAdjustment] = useState(false)

  const counterpartyData = counterparties.find((c) => c.id === selectedCounterparty)
  const baseRwaResults = calculateRWA(counterpartyData)

  // Apply any counterparty-specific RWA adjustments
  const rwaResults = counterpartyData.rwaAdjustment
    ? {
        ...baseRwaResults,
        rwa: counterpartyData.rwaAdjustment.adjustedRWA,
        originalRwa: baseRwaResults.rwa,
        hasAdjustment: true,
        adjustmentType: counterpartyData.rwaAdjustment.type,
        adjustmentValue: counterpartyData.rwaAdjustment.value,
        adjustmentReason: counterpartyData.rwaAdjustment.reason,
      }
    : baseRwaResults

  // Apply any portfolio-level RWA adjustments
  const finalRwaResults = counterpartyData.portfolioRwaAdjustment
    ? {
        ...rwaResults,
        rwa: counterpartyData.portfolioRwaAdjustment.adjustedRWA,
        originalRwa: rwaResults.originalRwa || rwaResults.rwa,
        hasPortfolioAdjustment: true,
        portfolioAdjustmentInfo: counterpartyData.portfolioRwaAdjustment.portfolioAdjustment,
      }
    : rwaResults

  const handleCreditReviewSave = (reviewData) => {
    const updatedCounterparties = counterparties.map((c) => {
      if (c.id === selectedCounterparty) {
        return {
          ...c,
          creditRating: reviewData.creditRating,
          creditRatingPd: reviewData.creditRatingPd,
          creditReviewDate: reviewData.creditReviewDate,
          useCredRatingPd: reviewData.useCredRatingPd,
        }
      }
      return c
    })

    setCounterparties(updatedCounterparties)
    setShowCreditReview(false)

    // Mark creditreview module as modified
    if (!modifiedModules.includes("creditreview")) {
      setModifiedModules([...modifiedModules, "creditreview"])
    }
  }

  const handleCreditReview = () => {
    setShowCreditReview(true)
  }

  const handleDiscardCreditReview = () => {
    const updatedCounterparties = counterparties.map((c) => {
      if (c.id === selectedCounterparty) {
        // Remove credit review related properties
        const { creditRating, creditRatingPd, creditReviewDate, useCredRatingPd, ...rest } = c
        return rest
      }
      return c
    })

    setCounterparties(updatedCounterparties)
    setShowCreditReview(false)

    // Remove creditreview from modified modules
    setModifiedModules(modifiedModules.filter((m) => m !== "creditreview"))
  }

  const handleEadUpdate = (updatedCounterparties) => {
    setCounterparties(updatedCounterparties)
  }

  // Handle saving modified module data
  const handleModuleSave = (updatedData, moduleId) => {
    const updatedCounterparties = counterparties.map((c) => {
      if (c.id === selectedCounterparty) {
        return {
          ...c,
          ...updatedData,
        }
      }
      return c
    })

    setCounterparties(updatedCounterparties)

    // Add module to modified modules list if not already there
    if (!modifiedModules.includes(moduleId)) {
      setModifiedModules([...modifiedModules, moduleId])
    }
  }

  // Handle updating counterparty data from the flowchart
  const handleUpdateCounterparty = (updatedData) => {
    const updatedCounterparties = counterparties.map((c) => {
      if (c.id === selectedCounterparty) {
        return {
          ...c,
          ...updatedData,
        }
      }
      return c
    })

    setCounterparties(updatedCounterparties)
  }

  // Add handler for RWA adjustments at counterparty level
  const handleRWAAdjustmentSave = (adjustmentData) => {
    const updatedCounterparties = counterparties.map((c) => {
      if (c.id === selectedCounterparty) {
        return {
          ...c,
          rwaAdjustment: adjustmentData.rwaAdjustment,
        }
      }
      return c
    })

    setCounterparties(updatedCounterparties)
    setShowRWAAdjustment(false)
  }

  // Add handler for portfolio-level RWA adjustments
  const handlePortfolioAdjustmentSave = (adjustmentData) => {
    const { portfolioAdjustment, counterpartyAdjustments } = adjustmentData

    const updatedCounterparties = counterparties.map((c) => {
      const adjustment = counterpartyAdjustments.find((adj) => adj.id === c.id)
      if (adjustment) {
        return {
          ...c,
          portfolioRwaAdjustment: {
            baselineRWA: adjustment.baselineRWA,
            adjustedRWA: adjustment.adjustedRWA,
            absoluteChange: adjustment.absoluteChange,
            percentageChange: adjustment.percentageChange,
            portfolioAdjustment,
          },
        }
      }
      return c
    })

    setCounterparties(updatedCounterparties)
    setShowPortfolioAdjustment(false)
  }

  // Add handler to remove counterparty-specific adjustment
  const handleRemoveCounterpartyAdjustment = () => {
    const updatedCounterparties = counterparties.map((c) => {
      if (c.id === selectedCounterparty) {
        const { rwaAdjustment, ...rest } = c
        return rest
      }
      return c
    })

    setCounterparties(updatedCounterparties)
  }

  // Add handler to remove portfolio-level adjustment for this counterparty
  const handleRemovePortfolioAdjustment = () => {
    const updatedCounterparties = counterparties.map((c) => {
      if (c.id === selectedCounterparty) {
        const { portfolioRwaAdjustment, ...rest } = c
        return rest
      }
      return c
    })

    setCounterparties(updatedCounterparties)
  }

  // Add handler to reset all adjustments for this counterparty
  const handleResetAllAdjustments = () => {
    const updatedCounterparties = counterparties.map((c) => {
      if (c.id === selectedCounterparty) {
        const { rwaAdjustment, portfolioRwaAdjustment, ...rest } = c
        return rest
      }
      return c
    })

    setCounterparties(updatedCounterparties)
  }

  // Calculate if the counterparty has any adjustments
  const hasCounterpartyAdjustment = !!counterpartyData.rwaAdjustment
  const hasPortfolioAdjustment = !!counterpartyData.portfolioRwaAdjustment
  const hasAnyAdjustment = hasCounterpartyAdjustment || hasPortfolioAdjustment

  // Calculate the total adjustment percentage
  const baselineRWA = baseRwaResults.rwa
  const adjustedRWA = finalRwaResults.rwa
  const adjustmentPercentage = hasAnyAdjustment ? (adjustedRWA / baselineRWA - 1) * 100 : 0

  return (
    <TooltipProvider>
      <div className="w-full max-w-7xl">
        <Tabs defaultValue="counterparty" className="mb-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="counterparty">Counterparty Analysis</TabsTrigger>
            <TabsTrigger value="portfolio">Portfolio Dashboard</TabsTrigger>
          </TabsList>
          <TabsContent value="counterparty">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>RWA Model Configuration</CardTitle>
                <CardDescription>Select a counterparty to view their risk metrics and RWA calculation</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="w-full md:w-1/3">
                    <Select value={selectedCounterparty} onValueChange={setSelectedCounterparty}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select counterparty" />
                      </SelectTrigger>
                      <SelectContent>
                        {counterparties.map((counterparty) => (
                          <SelectItem key={counterparty.id} value={counterparty.id}>
                            {counterparty.name}
                            {counterparty.isFinancial && (
                              <Badge variant="outline" className="ml-2">
                                Financial
                              </Badge>
                            )}
                            {(counterparty.rwaAdjustment || counterparty.portfolioRwaAdjustment) && (
                              <Badge
                                variant="outline"
                                className={`ml-2 ${
                                  (
                                    counterparty.rwaAdjustment?.adjustedRWA ||
                                      counterparty.portfolioRwaAdjustment?.adjustedRWA
                                  ) > calculateRWA(counterparty).rwa
                                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                    : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                                }`}
                              >
                                Adjusted
                              </Badge>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                      <div className="font-medium">Industry:</div>
                      <div>{counterpartyData.industry}</div>

                      <div className="font-medium">Region:</div>
                      <div>{counterpartyData.region}</div>

                      <div className="font-medium">PD (Point-in-Time):</div>
                      <div>{(counterpartyData.pd * 100).toFixed(4)}%</div>

                      <div className="font-medium">PD (Through-The-Cycle):</div>
                      <div>{(counterpartyData.ttcPd * 100).toFixed(4)}%</div>

                      {counterpartyData.creditRating && (
                        <>
                          <div className="font-medium">Credit Rating:</div>
                          <div>
                            {counterpartyData.creditRating} ({(counterpartyData.creditRatingPd * 100).toFixed(4)}%)
                          </div>

                          <div className="font-medium">PD Used:</div>
                          <div>{counterpartyData.useCredRatingPd ? "Rating PD" : "TTC PD"}</div>

                          <div className="font-medium">Review Date:</div>
                          <div>{counterpartyData.creditReviewDate || "N/A"}</div>

                          <div className="col-span-2 mt-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full text-xs"
                              onClick={handleDiscardCreditReview}
                            >
                              <RotateCcw className="mr-1 h-3 w-3" />
                              Reset Credit Review
                            </Button>
                          </div>
                        </>
                      )}

                      {counterpartyData.isFinancial && (
                        <>
                          <div className="font-medium">Institution Type:</div>
                          <div>
                            {counterpartyData.isRegulated ? "Regulated" : "Unregulated"}
                            {counterpartyData.isLargeFinancial && " (Large)"}
                          </div>

                          <div className="font-medium">AVC Multiplier:</div>
                          <div>{finalRwaResults.avcMultiplier.toFixed(2)}x</div>
                        </>
                      )}

                      <div className="col-span-2 mt-2">
                        <Separator className="my-2" />
                        <div className="font-medium">RWA:</div>
                        <div className="flex items-center mt-1">
                          <div className="text-xl font-bold">${Math.round(finalRwaResults.rwa).toLocaleString()}</div>
                          {hasAnyAdjustment && (
                            <Badge
                              variant="outline"
                              className={`ml-2 ${
                                adjustmentPercentage >= 0
                                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                  : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                              }`}
                            >
                              {adjustmentPercentage >= 0 ? "+" : ""}
                              {adjustmentPercentage.toFixed(2)}%
                            </Badge>
                          )}
                        </div>
                        {hasAnyAdjustment && (
                          <div className="text-sm text-muted-foreground mt-1">
                            Pre-adjustment: ${Math.round(baselineRWA).toLocaleString()}
                          </div>
                        )}
                      </div>

                      {/* Add adjustment reset options */}
                      {hasAnyAdjustment && (
                        <div className="col-span-2 mt-2">
                          <div className="flex flex-col space-y-2">
                            {hasCounterpartyAdjustment && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="justify-start"
                                onClick={handleRemoveCounterpartyAdjustment}
                              >
                                <RotateCcw className="mr-2 h-4 w-4" />
                                Remove Counterparty Adjustment
                              </Button>
                            )}
                            {hasPortfolioAdjustment && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="justify-start"
                                onClick={handleRemovePortfolioAdjustment}
                              >
                                <RotateCcw className="mr-2 h-4 w-4" />
                                Remove Portfolio Adjustment
                              </Button>
                            )}
                            {hasCounterpartyAdjustment && hasPortfolioAdjustment && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="justify-start"
                                onClick={handleResetAllAdjustments}
                              >
                                <RotateCcw className="mr-2 h-4 w-4" />
                                Reset All Adjustments
                              </Button>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="col-span-2 mt-4">
                        <Button onClick={handleCreditReview} variant="outline" className="w-full">
                          {counterpartyData.creditRating ? "Update Credit Review" : "Perform Credit Review"}
                        </Button>
                      </div>
                    </div>

                    <div className="mt-4">
                      <Button onClick={() => setShowRWAAdjustment(true)} variant="outline" className="mr-2">
                        Adjust Counterparty RWA
                      </Button>
                      <Button onClick={() => setShowPortfolioAdjustment(true)} variant="outline">
                        Adjust Portfolio RWA
                      </Button>
                    </div>
                  </div>

                  <div className="w-full md:w-2/3">
                    <Tabs value={view} onValueChange={setView} className="w-full">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="flowchart">Flowchart View</TabsTrigger>
                        <TabsTrigger value="sensitivity">Sensitivity Analysis</TabsTrigger>
                      </TabsList>
                      <TabsContent value="flowchart" className="mt-0">
                        <Card>
                          <CardHeader>
                            <CardTitle>RWA Calculation Flow</CardTitle>
                            <CardDescription>Click on any module to view details and calculations</CardDescription>
                          </CardHeader>
                          {hasAnyAdjustment && (
                            <div className="px-4 md:px-6 mb-2">
                              <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-muted/30 rounded-md">
                                <div className="text-sm">
                                  <span className="font-medium">Adjustments Applied:</span>{" "}
                                  {adjustmentPercentage >= 0 ? "+" : ""}
                                  {adjustmentPercentage.toFixed(2)}%
                                </div>
                                <div className="flex gap-2">
                                  {hasCounterpartyAdjustment && (
                                    <Button variant="outline" size="sm" onClick={handleRemoveCounterpartyAdjustment}>
                                      <RotateCcw className="mr-2 h-3.5 w-3.5" />
                                      Reset Counterparty Adj.
                                    </Button>
                                  )}
                                  {hasPortfolioAdjustment && (
                                    <Button variant="outline" size="sm" onClick={handleRemovePortfolioAdjustment}>
                                      <RotateCcw className="mr-2 h-3.5 w-3.5" />
                                      Reset Portfolio Adj.
                                    </Button>
                                  )}
                                  {hasCounterpartyAdjustment && hasPortfolioAdjustment && (
                                    <Button variant="outline" size="sm" onClick={handleResetAllAdjustments}>
                                      <RotateCcw className="mr-2 h-3.5 w-3.5" />
                                      Reset All
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                          <CardContent className="p-2 md:p-6">
                            <ModuleFlowchart
                              data={counterpartyData}
                              results={finalRwaResults}
                              onModuleSelect={setSelectedModule}
                              onCreditReview={handleCreditReview}
                              modifiedModules={modifiedModules}
                              onUpdateCounterparty={handleUpdateCounterparty}
                            />
                          </CardContent>
                        </Card>
                      </TabsContent>
                      <TabsContent value="sensitivity" className="mt-0">
                        <SensitivityAnalysis counterpartyData={counterpartyData} />
                      </TabsContent>
                    </Tabs>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="portfolio">
            <RWAPortfolioDashboard counterparties={counterparties} onEadUpdate={handleEadUpdate} />
          </TabsContent>
        </Tabs>

        {showCreditReview && (
          <CreditReviewDialog
            counterparty={counterpartyData}
            onSave={handleCreditReviewSave}
            onCancel={() => setShowCreditReview(false)}
            onDiscard={handleDiscardCreditReview}
          />
        )}

        {showRWAAdjustment && (
          <Dialog open={showRWAAdjustment} onOpenChange={setShowRWAAdjustment}>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>RWA Adjustment: {counterpartyData.name}</DialogTitle>
              </DialogHeader>
              <RWAAdjustmentPanel
                counterparty={counterpartyData}
                onSave={handleRWAAdjustmentSave}
                onRemove={hasCounterpartyAdjustment ? handleRemoveCounterpartyAdjustment : undefined}
              />
            </DialogContent>
          </Dialog>
        )}

        {showPortfolioAdjustment && (
          <Dialog open={showPortfolioAdjustment} onOpenChange={setShowPortfolioAdjustment}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
              <DialogHeader>
                <DialogTitle>Portfolio RWA Adjustment</DialogTitle>
              </DialogHeader>
              <PortfolioAdjustmentPanel
                counterparties={counterparties}
                onSave={handlePortfolioAdjustmentSave}
                onRemove={hasPortfolioAdjustment ? handleRemovePortfolioAdjustment : undefined}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>
    </TooltipProvider>
  )
}
