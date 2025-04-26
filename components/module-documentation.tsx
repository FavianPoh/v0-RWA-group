"use client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getModuleExplanation } from "@/lib/module-explanations"
import { Badge } from "@/components/ui/badge"
import { Info, ArrowRight } from "lucide-react"
import type { ModuleType } from "@/lib/module-details"

interface ModuleDocumentationProps {
  moduleId: string
  moduleType: ModuleType
  inputs: Record<string, any>
  outputs: Record<string, any>
}

export function ModuleDocumentation({ moduleId, moduleType, inputs, outputs }: ModuleDocumentationProps) {
  const explanation = getModuleExplanation(moduleId)

  if (!explanation) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Documentation Not Available</CardTitle>
          <CardDescription>Documentation for this module is not available yet.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return "N/A"

    // Handle objects by converting them to strings
    if (typeof value === "object") {
      // Check if it's an object with name, value, description properties
      if (value.name !== undefined && value.value !== undefined) {
        return String(value.value)
      }
      // Otherwise stringify the object
      return JSON.stringify(value)
    }

    if (typeof value === "number") {
      // Format percentages
      if (value >= 0 && value <= 1 && moduleId !== "EAD") {
        return `${(value * 100).toFixed(2)}%`
      }
      // Format currency values
      if (moduleId === "EAD" || moduleId === "RWA") {
        return new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(value)
      }
      // Format other numbers
      return value.toFixed(4)
    }
    return String(value)
  }

  return (
    <Card className="w-full border-0 shadow-none">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{explanation.title}</CardTitle>
          <Badge variant={moduleType === "input" ? "outline" : moduleType === "calculation" ? "secondary" : "default"}>
            {moduleType.charAt(0).toUpperCase() + moduleType.slice(1)} Module
          </Badge>
        </div>
        <CardDescription>{explanation.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="formula">Formula</TabsTrigger>
            <TabsTrigger value="inputs">Inputs</TabsTrigger>
            <TabsTrigger value="outputs">Outputs</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4 max-h-[50vh] overflow-y-auto">
            <div className="prose max-w-none">
              <h3>Purpose</h3>
              <p>{explanation.purpose}</p>

              <h3>Business Context</h3>
              <p>{explanation.businessContext}</p>

              <h3>Regulatory Context</h3>
              <p>{explanation.regulatoryContext}</p>
            </div>
          </TabsContent>

          <TabsContent value="formula" className="space-y-4 mt-4 max-h-[50vh] overflow-y-auto">
            <div className="prose max-w-none">
              <h3>Mathematical Formula</h3>
              <div className="bg-muted p-4 rounded-md font-mono text-lg">
                {explanation.formula.map((line, index) => (
                  <div key={index} className="my-2">
                    {line}
                  </div>
                ))}
              </div>

              <h3>Formula Explanation</h3>
              <p>{explanation.formulaExplanation}</p>

              {explanation.examples && (
                <>
                  <h3>Examples</h3>
                  <ul>
                    {explanation.examples.map((example, index) => (
                      <li key={index}>{example}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="inputs" className="mt-4">
            <div className="prose max-w-none">
              <h3>Input Parameters</h3>
              <div className="overflow-x-auto max-h-[50vh]">
                <table className="w-full border-collapse">
                  <thead className="sticky top-0 bg-background z-10">
                    <tr className="bg-muted">
                      <th className="border p-2 text-left">Parameter</th>
                      <th className="border p-2 text-left">Current Value</th>
                      <th className="border p-2 text-left">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(inputs).map(([key, value]) => {
                      const inputInfo = explanation.inputParameters.find((p) => p.name === key) || {
                        name: key,
                        description: "No description available",
                      }

                      return (
                        <tr key={key} className="border-b">
                          <td className="border p-2 font-medium">{inputInfo.name}</td>
                          <td className="border p-2">{formatValue(value)}</td>
                          <td className="border p-2">{inputInfo.description}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="outputs" className="mt-4">
            <div className="prose max-w-none">
              <h3>Output Parameters</h3>
              <div className="overflow-x-auto max-h-[50vh]">
                <table className="w-full border-collapse">
                  <thead className="sticky top-0 bg-background z-10">
                    <tr className="bg-muted">
                      <th className="border p-2 text-left">Parameter</th>
                      <th className="border p-2 text-left">Current Value</th>
                      <th className="border p-2 text-left">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(outputs).map(([key, value]) => {
                      const outputInfo = explanation.outputParameters.find((p) => p.name === key) || {
                        name: key,
                        description: "No description available",
                      }

                      return (
                        <tr key={key} className="border-b">
                          <td className="border p-2 font-medium">{outputInfo.name}</td>
                          <td className="border p-2">{formatValue(value)}</td>
                          <td className="border p-2">{outputInfo.description}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-6 p-4 bg-muted rounded-md">
          <h3 className="text-lg font-medium flex items-center gap-2">
            <Info size={18} />
            Key Considerations
          </h3>
          <ul className="mt-2 space-y-2">
            {explanation.keyConsiderations.map((consideration, index) => (
              <li key={index} className="flex items-start gap-2">
                <ArrowRight size={16} className="mt-1 flex-shrink-0" />
                <span>{consideration}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
