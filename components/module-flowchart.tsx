"use client"

import { useState, useCallback } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import ReactFlow, {
  Background,
  Controls,
  type NodeTypes,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  MarkerType,
  Position,
  Handle,
} from "reactflow"
import "reactflow/dist/style.css"
import { ModuleDetail } from "./module-detail"
import { calculateRWA } from "@/lib/rwa-calculator"

// Custom node component
const ModuleNode = ({ data }: { data: any }) => {
  // Determine background color based on modification status
  const getBgColor = () => {
    if (data.isActive) return "bg-blue-50 border-blue-300"
    if (data.isModified) return "bg-amber-50 border-amber-300"
    if (data.isAffected) return "bg-purple-50 border-purple-300"
    return "bg-white border-gray-200"
  }

  return (
    <div
      className={`p-3 rounded-lg shadow-md border ${getBgColor()} ${data.isModified ? "ring-2 ring-amber-400" : ""}`}
      style={{ width: 180 }}
    >
      {/* Add handles for connections */}
      <Handle type="target" position={Position.Left} style={{ background: "#555", width: 8, height: 8 }} />
      <Handle type="target" position={Position.Top} style={{ background: "#555", width: 8, height: 8 }} />
      <Handle type="source" position={Position.Right} style={{ background: "#555", width: 8, height: 8 }} />
      <Handle type="source" position={Position.Bottom} style={{ background: "#555", width: 8, height: 8 }} />

      <div className="font-medium text-center">{data.label}</div>
      {data.value !== undefined && (
        <div className="mt-1 text-center text-sm">
          {typeof data.value === "number" ? data.value.toFixed(4) : data.value}
        </div>
      )}
      {data.description && <div className="mt-1 text-xs text-gray-500 text-center">{data.description}</div>}
    </div>
  )
}

// Define node types
const nodeTypes: NodeTypes = {
  moduleNode: ModuleNode,
}

interface ModuleFlowchartProps {
  counterparty: any
  rwaResults: any
  onSelectModule: (moduleId: string) => void
  onCreditReview?: () => void
  modifiedModules?: string[]
  onUpdateCounterparty?: (updatedData: any) => void
}

const modulesData = [
  { id: "pd", name: "PD Calculator", description: "Probability of Default", color: "#f97316", order: 1 },
  { id: "ttcpd", name: "TTC PD", description: "Through-The-Cycle PD", color: "#f43f5e", order: 2 },
  {
    id: "creditreview",
    name: "Credit Review",
    description: "Rating-Based PD Assessment",
    color: "#8b5cf6",
    order: 3,
    optional: true,
  },
  { id: "avc", name: "AVC", description: "Asset Value Correlation", color: "#ec4899", order: 4 },
  { id: "correlation", name: "Correlation", description: "Asset Correlation", color: "#10b981", order: 5 },
  { id: "lgd", name: "LGD Calculator", description: "Loss Given Default", color: "#6366f1", order: 6 },
  { id: "ead", name: "EAD Calculator", description: "Exposure at Default", color: "#06b6d4", order: 7 },
  { id: "maturity", name: "Maturity Adjustment", description: "Time Horizon Adjustment", color: "#f59e0b", order: 8 },
  { id: "rwa", name: "RWA", description: "Risk-Weighted Assets", color: "#ef4444", order: 9 },
]

// Define connections with more detailed path information
const connections = [
  {
    id: "pd-ttcpd",
    from: "pd",
    to: "ttcpd",
    label: "Input",
    sourceHandle: "right",
    targetHandle: "left",
    animated: true,
    color: "#3b82f6", // Blue
  },
  {
    id: "ttcpd-correlation",
    from: "ttcpd",
    to: "correlation",
    label: "Input",
    sourceHandle: "right",
    targetHandle: "left",
    animated: true,
    color: "#3b82f6", // Blue
  },
  {
    id: "avc-correlation",
    from: "avc",
    to: "correlation",
    label: "Multiplier",
    sourceHandle: "bottom",
    targetHandle: "top",
    animated: true,
    color: "#ec4899", // Pink
  },
  {
    id: "ttcpd-maturity",
    from: "ttcpd",
    to: "maturity",
    label: "Input",
    sourceHandle: "bottom",
    targetHandle: "left",
    animated: true,
    color: "#3b82f6", // Blue
  },
  {
    id: "creditreview-ttcpd",
    from: "creditreview",
    to: "ttcpd",
    label: "Optional Override",
    sourceHandle: "bottom",
    targetHandle: "top",
    animated: true,
    style: { strokeDasharray: "5,5" },
    color: "#8b5cf6", // Purple
  },
  {
    id: "correlation-rwa",
    from: "correlation",
    to: "rwa",
    label: "Input",
    sourceHandle: "bottom",
    targetHandle: "top",
    animated: true,
    color: "#10b981", // Green
  },
  {
    id: "lgd-rwa",
    from: "lgd",
    to: "rwa",
    label: "Input",
    sourceHandle: "right",
    targetHandle: "left",
    animated: true,
    color: "#6366f1", // Indigo
  },
  {
    id: "ead-rwa",
    from: "ead",
    to: "rwa",
    label: "Input",
    sourceHandle: "right",
    targetHandle: "bottom",
    animated: true,
    color: "#06b6d4", // Cyan
  },
  {
    id: "maturity-rwa",
    from: "maturity",
    to: "rwa",
    label: "Input",
    sourceHandle: "right",
    targetHandle: "right",
    animated: true,
    color: "#f59e0b", // Amber
  },
]

// Add a function to determine if a module is affected by modified modules
function isAffectedByModifiedModules(moduleId, modifiedModules) {
  // If the module itself is modified, it's affected
  if (modifiedModules.includes(moduleId)) return true

  // Check if any upstream module is modified
  const upstreamModules = getUpstreamModules(moduleId)
  return upstreamModules.some((module) => modifiedModules.includes(module))
}

// Function to get all upstream modules that feed into a given module
function getUpstreamModules(moduleId) {
  const upstream = []
  connections.forEach((connection) => {
    if (connection.to === moduleId) {
      upstream.push(connection.from)
      // Recursively get upstream modules
      const furtherUpstream = getUpstreamModules(connection.from)
      upstream.push(...furtherUpstream)
    }
  })
  return [...new Set(upstream)] // Remove duplicates
}

export function ModuleFlowchart({
  counterparty,
  rwaResults,
  onSelectModule,
  onCreditReview,
  modifiedModules = [],
  onUpdateCounterparty,
}: ModuleFlowchartProps) {
  const [selectedModule, setSelectedModule] = useState<string | null>(null)
  const [isModuleDetailOpen, setIsModuleDetailOpen] = useState(false)
  const [previewResults, setPreviewResults] = useState<any>(null)

  // Define node positions in a more structured layout
  const nodePositions = {
    pd: { x: 50, y: 50 },
    ttcpd: { x: 300, y: 50 },
    creditreview: { x: 300, y: -100 },
    avc: { x: 550, y: -100 },
    correlation: { x: 550, y: 50 },
    lgd: { x: 300, y: 200 },
    ead: { x: 550, y: 200 },
    maturity: { x: 550, y: 350 },
    rwa: { x: 800, y: 200 },
  }

  const initialNodes = modulesData.map((module) => ({
    id: module.id,
    position: nodePositions[module.id] || { x: 0, y: 0 },
    data: {
      label: module.name,
      description: module.description,
      value: (() => {
        if (!rwaResults) return "N/A"

        if (module.id === "rwa") {
          const finalRwa = rwaResults.rwa
          const hasAdjustment = rwaResults.hasAdjustment || rwaResults.hasPortfolioAdjustment || rwaResults.originalRwa

          if (hasAdjustment) {
            const originalRwa = rwaResults.originalRwa || rwaResults.rwa
            const adjustmentPercentage = (finalRwa / originalRwa - 1) * 100
            return `$${Math.round(finalRwa).toLocaleString()} (${adjustmentPercentage >= 0 ? "+" : ""}${adjustmentPercentage.toFixed(1)}%)`
          }

          return `$${Math.round(finalRwa).toLocaleString()}`
        }

        switch (module.id) {
          case "pd":
            return counterparty ? (counterparty.pd * 100).toFixed(2) + "%" : "N/A"
          case "ttcpd":
            return counterparty ? (counterparty.ttcPd * 100).toFixed(2) + "%" : "N/A"
          case "creditreview":
            return counterparty ? (counterparty.creditRating ? counterparty.creditRating : "Not Reviewed") : "N/A"
          case "lgd":
            return counterparty ? (counterparty.lgd * 100).toFixed(2) + "%" : "N/A"
          case "ead":
            return counterparty ? `$${Math.round(counterparty.ead).toLocaleString()}` : "N/A"
          case "avc":
            return rwaResults ? rwaResults.avcMultiplier.toFixed(2) + "x" : "N/A"
          case "correlation":
            return rwaResults ? (rwaResults.correlation * 100).toFixed(2) + "%" : "N/A"
          case "maturity":
            return rwaResults ? rwaResults.maturityAdjustment.toFixed(4) : "N/A"
          default:
            return "N/A"
        }
      })(),
      isActive: selectedModule === module.id,
      isModified: modifiedModules.includes(module.id),
      isAffected: isAffectedByModifiedModules(module.id, modifiedModules),
      optional: module.optional,
      color: module.color,
    },
    type: "moduleNode",
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  }))

  // Create edges with proper styling and markers
  const initialEdges = connections.map((connection) => ({
    id: connection.id,
    source: connection.from,
    target: connection.to,
    label: connection.label,
    labelStyle: { fill: "#555", fontSize: 10, fontWeight: 500 },
    labelBgStyle: { fill: "rgba(255, 255, 255, 0.9)", rx: 4, ry: 4 },
    animated: connection.animated,
    style: {
      stroke: connection.color || "#666",
      strokeWidth: 2.5,
      ...(connection.style || {}),
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 20,
      height: 20,
      color: connection.color || "#666",
    },
    sourceHandle: connection.sourceHandle,
    targetHandle: connection.targetHandle,
    zIndex: 1000, // Ensure edges are above nodes
  }))

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  const onNodeClick = useCallback(
    (event, node) => {
      // Handle optional modules differently
      const moduleInfo = modulesData.find((m) => m.id === node.id)
      if (moduleInfo?.optional && node.id === "creditreview") {
        onCreditReview()
        return
      }

      setSelectedModule(node.id)
      setIsModuleDetailOpen(true)

      // Update node styles
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id === node.id) {
            // it's important to create a new object for proper updates
            return { ...n, data: { ...n.data, isActive: true } }
          } else {
            return { ...n, data: { ...n.data, isActive: false } }
          }
        }),
      )
    },
    [setNodes, onCreditReview],
  )

  const handleModuleUpdate = (updatedData) => {
    if (selectedModule && onUpdateCounterparty) {
      // Calculate new results based on updated data
      const tempData = { ...counterparty, ...updatedData }
      const newResults = calculateRWA(tempData)

      // Update the node display with new results
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id === selectedModule) {
            return { ...n, data: { ...n.data, isModified: true } }
          } else if (
            n.id === "avc" &&
            (updatedData.isFinancial !== undefined ||
              updatedData.isLargeFinancial !== undefined ||
              updatedData.isRegulated !== undefined)
          ) {
            // Update AVC node if financial status changed
            return {
              ...n,
              data: {
                ...n.data,
                value: newResults.avcMultiplier.toFixed(2) + "x",
                isAffected: true,
              },
            }
          } else if (
            n.id === "correlation" &&
            (updatedData.isFinancial !== undefined ||
              updatedData.isLargeFinancial !== undefined ||
              updatedData.isRegulated !== undefined ||
              updatedData.ttcPd !== undefined)
          ) {
            // Update correlation node if financial status or PD changed
            return {
              ...n,
              data: {
                ...n.data,
                value: (newResults.correlation * 100).toFixed(2) + "%",
                isAffected: true,
              },
            }
          } else if (n.id === "rwa") {
            // Always update RWA node with new results
            const finalRwa = newResults.rwa
            const hasAdjustment =
              newResults.hasAdjustment || newResults.hasPortfolioAdjustment || newResults.originalRwa
            let displayValue = `$${Math.round(finalRwa).toLocaleString()}`

            if (hasAdjustment) {
              const originalRwa = newResults.originalRwa || newResults.rwa
              const adjustmentPercentage = (finalRwa / originalRwa - 1) * 100
              displayValue = `$${Math.round(finalRwa).toLocaleString()} (${adjustmentPercentage >= 0 ? "+" : ""}${adjustmentPercentage.toFixed(1)}%)`
            }

            return {
              ...n,
              data: {
                ...n.data,
                value: displayValue,
                isAffected: true,
              },
            }
          } else if (isAffectedByModifiedModules(n.id, [selectedModule])) {
            // Mark downstream modules as affected
            return {
              ...n,
              data: {
                ...n.data,
                isAffected: true,
              },
            }
          }
          return n
        }),
      )

      // Highlight affected edges
      setEdges((eds) =>
        eds.map((edge) => {
          if (edge.source === selectedModule || edge.target === selectedModule) {
            return {
              ...edge,
              style: {
                ...edge.style,
                strokeWidth: 3,
                stroke: "#f59e0b", // Amber color for affected edges
              },
              markerEnd: {
                ...edge.markerEnd,
                color: "#f59e0b",
              },
            }
          }
          return edge
        }),
      )

      // Pass the updated data to the parent component
      onUpdateCounterparty(updatedData)

      // Store preview results for display
      setPreviewResults(newResults)
    }
  }

  const handleCloseModuleDetail = () => {
    setIsModuleDetailOpen(false)
    setSelectedModule(null)
    setPreviewResults(null)

    // Reset node active states
    setNodes((nds) =>
      nds.map((n) => {
        return { ...n, data: { ...n.data, isActive: false } }
      }),
    )

    // Reset edge highlighting
    setEdges(initialEdges)
  }

  return (
    <div className="w-full h-[700px]">
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          className="bg-slate-50 dark:bg-slate-900 rounded-lg"
          minZoom={0.5}
          maxZoom={1.5}
          defaultZoom={0.85}
        >
          <Controls />
          <Background variant="dots" gap={12} size={1} />
        </ReactFlow>

        {/* Use Dialog as a popup for module details */}
        <Dialog open={isModuleDetailOpen} onOpenChange={handleCloseModuleDetail}>
          <DialogContent className="max-w-4xl max-h-[80vh] p-0 overflow-hidden">
            <div className="overflow-y-auto max-h-[80vh]">
              {selectedModule && (
                <ModuleDetail
                  moduleId={selectedModule}
                  counterpartyData={counterparty}
                  onUpdateCounterparty={handleModuleUpdate}
                  onClose={handleCloseModuleDetail}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      </ReactFlowProvider>

      {/* Legend for the flowchart */}
      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <div className="flex items-center">
          <div className="w-3 h-3 bg-amber-50 border border-amber-300 mr-2"></div>
          <span>Modified Module</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-purple-50 border border-purple-300 mr-2"></div>
          <span>Affected by Changes</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-blue-50 border border-blue-300 mr-2"></div>
          <span>Selected Module</span>
        </div>
      </div>
    </div>
  )
}
