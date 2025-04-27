"use client"

import { useState, useEffect } from "react"
import { calculateRWA } from "@/lib/rwa-calculator"
import { calculateTtcPd } from "@/lib/ttc-pd-calculator"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { PlusCircle } from "lucide-react"
import { ModuleFlowchart } from "@/components/module-flowchart"
import { ModuleDetail } from "@/components/module-detail"
import { generateCounterparties } from "@/lib/data-generator"
import { CreditReviewDialog } from "@/components/credit-review-dialog"
import { RWAAdjustmentPanel } from "@/components/rwa-adjustment-panel"
import { PortfolioAdjustmentPanel } from "@/components/portfolio-adjustment-panel"
import { RWAPortfolioDashboard } from "@/components/rwa-portfolio-dashboard"
import { AdjustmentHeatmap } from "@/components/adjustment-heatmap"
import { SensitivityAnalysis } from "@/components/sensitivity-analysis"
import { ModuleDocumentation } from "@/components/module-documentation"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Generate initial counterparties data
const initialCounterparties = generateCounterparties(20)
const initialSelectedCounterparty = initialCounterparties[0]

// Calculate initial RWA figures
const getInitialRWA = (counterparty) => {
  return calculateRWA(counterparty)
}

export function RWADashboard() {
  // State
  const [counterparties, setCounterparties] = useState(initialCounterparties)
  const [selectedCounterparty, setSelectedCounterparty] = useState(initialSelectedCounterparty)
  const [rwaResults, setRwaResults] = useState(getInitialRWA(selectedCounterparty))
  const [selectedModule, setSelectedModule] = useState(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isCreditReviewOpen, setIsCreditReviewOpen] = useState(false)
  const [isRWAAdjustmentOpen, setIsRWAAdjustmentOpen] = useState(false)
  const [isPortfolioAdjustmentOpen, setIsPortfolioAdjustmentOpen] = useState(false)

  // Recalculate RWA when selected counterparty changes
  useEffect(() => {
    const results = calculateRWA(selectedCounterparty)
    console.log("Selected counterparty changed, new RWA results:", results)
    setRwaResults(results)
  }, [selectedCounterparty])

  // Handle counterparty selection
  const handleSelectCounterparty = (counterparty) => {
    console.log("Selecting counterparty:", counterparty.name)
    setSelectedCounterparty(counterparty)
  }

  // Handle credit review completion
  const handleCreditReviewComplete = (updatedData) => {
    // Update the selected counterparty with the new PD value
    const updatedCounterparty = {
      ...selectedCounterparty,
      ...updatedData,
      lastReviewDate: new Date().toISOString(),
    }

    // Calculate the new TTC PD based on the updated point-in-time PD
    const ttcPD = calculateTtcPd({
      pointInTimePd: updatedData.pd,
      macroeconomicIndex: updatedCounterparty.macroeconomicIndex,
      longTermAverage: updatedCounterparty.longTermAverage,
      cyclicality: updatedCounterparty.cyclicality,
    })

    // Add the TTC PD to the updated counterparty
    updatedCounterparty.ttcPd = ttcPD

    // Update the counterparty in the list
    const updatedCounterparties = counterparties.map((cp) => {
      if (cp.id === selectedCounterparty.id) {
        return updatedCounterparty
      }
      return cp
    })

    // Update state
    setSelectedCounterparty(updatedCounterparty)
    setCounterparties(updatedCounterparties)
    setRwaResults(calculateRWA(updatedCounterparty))
    setIsCreditReviewOpen(false)
  }

  // Handle RWA adjustment
  const handleRWAAdjustment = (adjustmentData) => {
    // Update selected counterparty with adjustment
    const updatedCounterparty = {
      ...selectedCounterparty,
      rwaAdjustment: adjustmentData,
    }

    // Update counterparties list
    const updatedCounterparties = counterparties.map((cp) => {
      if (cp.id === selectedCounterparty.id) {
        return updatedCounterparty
      }
      return cp
    })

    // Update state
    setSelectedCounterparty(updatedCounterparty)
    setCounterparties(updatedCounterparties)
    setRwaResults(calculateRWA(updatedCounterparty))
    setIsRWAAdjustmentOpen(false)
  }

  // Handle Portfolio adjustment
  const handlePortfolioAdjustment = (adjustmentData) => {
    // Extract the data
    const { portfolioAdjustment, counterpartyAdjustments } = adjustmentData

    // Update each counterparty in the adjustments
    const updatedCounterparties = counterparties.map((cp) => {
      const adjustment = counterpartyAdjustments.find((adj) => adj.id === cp.id)
      if (adjustment) {
        return {
          ...cp,
          portfolioRwaAdjustment: {
            ...portfolioAdjustment,
            counterpartyAdjustment: adjustment,
          },
        }
      }
      return cp
    })

    // Find the updated selected counterparty
    const updatedSelectedCounterparty = updatedCounterparties.find((cp) => cp.id === selectedCounterparty.id)

    // Update state
    setCounterparties(updatedCounterparties)
    setSelectedCounterparty(updatedSelectedCounterparty || selectedCounterparty)
    setRwaResults(calculateRWA(updatedSelectedCounterparty || selectedCounterparty))
    setIsPortfolioAdjustmentOpen(false)
  }

  // Handle removing RWA adjustment
  const handleRemoveRWAAdjustment = () => {
    // Update selected counterparty by removing the adjustment
    const updatedCounterparty = { ...selectedCounterparty }
    delete updatedCounterparty.rwaAdjustment

    // Update counterparties list
    const updatedCounterparties = counterparties.map((cp) => {
      if (cp.id === selectedCounterparty.id) {
        return updatedCounterparty
      }
      return cp
    })

    // Update state
    setSelectedCounterparty(updatedCounterparty)
    setCounterparties(updatedCounterparties)
    setRwaResults(calculateRWA(updatedCounterparty))
    setIsRWAAdjustmentOpen(false)
  }

  // Handle removing portfolio adjustment
  const handleRemovePortfolioAdjustment = () => {
    // Update counterparties list by removing portfolio adjustments
    const updatedCounterparties = counterparties.map((cp) => {
      const updatedCp = { ...cp }
      delete updatedCp.portfolioRwaAdjustment
      return updatedCp
    })

    // Find the updated selected counterparty
    const updatedSelectedCounterparty = updatedCounterparties.find((cp) => cp.id === selectedCounterparty.id)

    // Update state
    setCounterparties(updatedCounterparties)
    setSelectedCounterparty(updatedSelectedCounterparty)
    setRwaResults(calculateRWA(updatedSelectedCounterparty))
    setIsPortfolioAdjustmentOpen(false)
  }

  // Handle counterparty update from module detail
  const handleCounterpartyUpdate = (updatedCounterparty) => {
    // Update counterparty in list
    const updatedCounterparties = counterparties.map((cp) => {
      if (cp.id === updatedCounterparty.id) {
        return updatedCounterparty
      }
      return cp
    })

    // Update state
    setSelectedCounterparty(updatedCounterparty)
    setCounterparties(updatedCounterparties)
    setRwaResults(calculateRWA(updatedCounterparty))
  }

  return (
    <TooltipProvider>
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">RWA Calculator</h1>
            <p className="text-muted-foreground">Basel III Risk-Weighted Assets calculation based on IRB approach</p>
          </div>

          {/* Add counterparty selector */}
          <div className="w-64">
            <Select
              value={selectedCounterparty.id}
              onValueChange={(value) => {
                const counterparty = counterparties.find((cp) => cp.id === value)
                if (counterparty) {
                  handleSelectCounterparty(counterparty)
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Counterparty" />
              </SelectTrigger>
              <SelectContent>
                {counterparties.map((cp) => (
                  <SelectItem key={cp.id} value={cp.id}>
                    {cp.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs defaultValue="counterparty" className="space-y-4">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="counterparty">Counterparty</TabsTrigger>
            <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
          </TabsList>
          <TabsContent value="counterparty" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Selected Counterparty</CardTitle>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    className="h-4 w-4 text-muted-foreground"
                  >
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{selectedCounterparty.name}</div>
                  <p className="text-xs text-muted-foreground">
                    {selectedCounterparty.industry} | {selectedCounterparty.region}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">PD (Point-in-Time)</CardTitle>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    className="h-4 w-4 text-muted-foreground"
                  >
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                  </svg>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{(selectedCounterparty.pd * 100).toFixed(2)}%</div>
                  <p className="text-xs text-muted-foreground">
                    Last reviewed:{" "}
                    {selectedCounterparty.lastReviewDate
                      ? new Date(selectedCounterparty.lastReviewDate).toLocaleDateString()
                      : "Not reviewed"}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">RWA</CardTitle>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    className="h-4 w-4 text-muted-foreground"
                  >
                    <rect width="20" height="14" x="2" y="5" rx="2" />
                    <path d="M2 10h20" />
                  </svg>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${Math.round(rwaResults.rwa).toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    {selectedCounterparty.rwaAdjustment
                      ? `Adjusted (${selectedCounterparty.rwaAdjustment.type})`
                      : "Base calculation"}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">RWA Density</CardTitle>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    className="h-4 w-4 text-muted-foreground"
                  >
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {rwaResults.rwaDensity ? (rwaResults.rwaDensity * 100).toFixed(2) + "%" : "N/A"}
                  </div>
                  <p className="text-xs text-muted-foreground">RWA / EAD</p>
                </CardContent>
              </Card>
            </div>
            {/* Main Content */}
            <div className="grid gap-4 md:grid-cols-1">
              <Card className="col-span-1">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>RWA Flowchart</CardTitle>
                    <div className="flex space-x-2">
                      <Button variant="outline" onClick={() => setIsCreditReviewOpen(true)}>
                        Perform Credit Review
                      </Button>
                      <Button variant="outline" onClick={() => setIsRWAAdjustmentOpen(true)}>
                        Adjust Counterparty RWA
                      </Button>
                    </div>
                  </div>
                  <CardDescription>
                    Select a module to view details. Calculated for {selectedCounterparty.name}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ModuleFlowchart
                    counterparty={selectedCounterparty}
                    rwaResults={rwaResults}
                    onSelectModule={(module) => {
                      setSelectedModule(module)
                      setIsDetailOpen(true)
                    }}
                    onCreditReview={() => setIsCreditReviewOpen(true)}
                    modifiedModules={selectedCounterparty?.modifiedModules || []}
                    onUpdateCounterparty={handleCounterpartyUpdate}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          <TabsContent value="portfolio" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-1">
              <Card className="col-span-1">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Portfolio Overview</CardTitle>
                    <Button onClick={() => setIsPortfolioAdjustmentOpen(true)}>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Adjust Portfolio RWA
                    </Button>
                  </div>
                  <CardDescription>Counterparties and their current RWA values</CardDescription>
                </CardHeader>
                <CardContent>
                  <RWAPortfolioDashboard
                    counterparties={counterparties}
                    selectedCounterparty={selectedCounterparty}
                    onSelectCounterparty={handleSelectCounterparty}
                    onEadUpdate={(updatedCounterparties) => {
                      setCounterparties(updatedCounterparties)
                      const updatedSelected = updatedCounterparties.find((cp) => cp.id === selectedCounterparty.id)
                      if (updatedSelected) {
                        setSelectedCounterparty(updatedSelected)
                        setRwaResults(calculateRWA(updatedSelected))
                      }
                    }}
                  />
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-1">
              <Card className="col-span-1">
                <CardHeader>
                  <CardTitle>RWA Adjustment Heatmap</CardTitle>
                  <CardDescription>
                    Visualizing the distribution of RWA adjustments across the portfolio
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <AdjustmentHeatmap counterparties={counterparties} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          <TabsContent value="analysis" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-1">
              <Card className="col-span-1">
                <CardHeader>
                  <CardTitle>Sensitivity Analysis</CardTitle>
                  <CardDescription>
                    Analyze how changes to key risk parameters affect the final RWA calculation
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <SensitivityAnalysis counterparty={selectedCounterparty} />
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-1">
              <Card className="col-span-1">
                <CardHeader>
                  <CardTitle>Module Documentation</CardTitle>
                  <CardDescription>Technical details and explanations of each calculation module</CardDescription>
                </CardHeader>
                <CardContent>
                  <ModuleDocumentation />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Module Detail Dialog */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" hideCloseButton={false}>
            {selectedModule && (
              <ModuleDetail
                moduleId={selectedModule}
                counterpartyData={selectedCounterparty}
                results={rwaResults}
                onUpdateCounterparty={handleCounterpartyUpdate}
                onClose={() => setIsDetailOpen(false)}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Credit Review Dialog */}
        <Dialog open={isCreditReviewOpen} onOpenChange={setIsCreditReviewOpen}>
          <DialogContent className="max-w-3xl">
            <DialogTitle>Credit Review</DialogTitle>
            <CreditReviewDialog
              counterparty={selectedCounterparty}
              onComplete={handleCreditReviewComplete}
              onCancel={() => setIsCreditReviewOpen(false)}
            />
          </DialogContent>
        </Dialog>

        {/* RWA Adjustment Dialog */}
        <Dialog open={isRWAAdjustmentOpen} onOpenChange={setIsRWAAdjustmentOpen}>
          <DialogContent className="max-w-3xl">
            <DialogTitle>RWA Adjustment</DialogTitle>
            <RWAAdjustmentPanel
              counterparty={selectedCounterparty}
              onSave={handleRWAAdjustment}
              onRemove={selectedCounterparty.rwaAdjustment ? handleRemoveRWAAdjustment : null}
            />
          </DialogContent>
        </Dialog>

        {/* Portfolio Adjustment Dialog */}
        <Dialog open={isPortfolioAdjustmentOpen} onOpenChange={setIsPortfolioAdjustmentOpen}>
          <DialogContent size="full" className="max-h-[90vh] overflow-y-auto">
            <PortfolioAdjustmentPanel
              counterparties={counterparties}
              onSave={handlePortfolioAdjustment}
              onRemove={counterparties.some((cp) => cp.portfolioRwaAdjustment) ? handleRemovePortfolioAdjustment : null}
            />
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}
