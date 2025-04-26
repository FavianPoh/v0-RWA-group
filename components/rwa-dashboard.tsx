"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ModuleFlowchart } from "@/components/module-flowchart"
import { ModuleDetail } from "@/components/module-detail"
import { SensitivityAnalysis } from "@/components/sensitivity-analysis"
import { CreditReviewDialog } from "@/components/credit-review-dialog"
import { RWAPortfolioDashboard } from "@/components/rwa-portfolio-dashboard"
import { calculateRWA } from "@/lib/rwa-calculator"

export function RWADashboard({ data }) {
  const [counterparties, setCounterparties] = useState(data)
  const [selectedCounterparty, setSelectedCounterparty] = useState(data[0].id)
  const [selectedModule, setSelectedModule] = useState(null)
  const [view, setView] = useState("flowchart")
  const [showCreditReview, setShowCreditReview] = useState(false)

  const counterpartyData = counterparties.find((c) => c.id === selectedCounterparty)
  const rwaResults = calculateRWA(counterpartyData)

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
  }

  const handleCreditReview = () => {
    setShowCreditReview(true)
  }

  const handleEadUpdate = (updatedCounterparties) => {
    setCounterparties(updatedCounterparties)
  }

  return (
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
                        <div>{rwaResults.avcMultiplier.toFixed(2)}x</div>
                      </>
                    )}

                    <div className="col-span-2 mt-4">
                      <Button onClick={handleCreditReview} variant="outline" className="w-full">
                        {counterpartyData.creditRating ? "Update Credit Review" : "Perform Credit Review"}
                      </Button>
                    </div>
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
                        <CardContent className="p-2 md:p-6">
                          <ModuleFlowchart
                            data={counterpartyData}
                            results={rwaResults}
                            onModuleSelect={setSelectedModule}
                            onCreditReview={handleCreditReview}
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

      {selectedModule && (
        <ModuleDetail
          module={selectedModule}
          data={counterpartyData}
          results={rwaResults}
          onClose={() => setSelectedModule(null)}
        />
      )}

      {showCreditReview && (
        <CreditReviewDialog
          counterparty={counterpartyData}
          onSave={handleCreditReviewSave}
          onCancel={() => setShowCreditReview(false)}
        />
      )}
    </div>
  )
}
