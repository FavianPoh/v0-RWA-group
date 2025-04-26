"use client"

import { useState, useCallback } from "react"
import ReactFlow, {
  Background,
  Controls,
  type NodeTypes,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  MarkerType,
  Position,
} from "reactflow"
import "reactflow/dist/style.css"

// Custom node component
const ModuleNode = ({ data }: { data: any }) => {
  return (
    <div
      className={`p-3 rounded-lg shadow-md border ${
        data.isActive ? "bg-blue-50 border-blue-300" : "bg-white border-gray-200"
      }`}
      style={{ width: 180 }}
    >
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
  data: any
  results: any
  onModuleSelect: (moduleId: string) => void
  onCreditReview: () => void
  modifiedModules?: string[]
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
  },
  {
    id: "ttcpd-correlation",
    from: "ttcpd",
    to: "correlation",
    label: "Input",
    sourceHandle: "right",
    targetHandle: "left",
    animated: true,
  },
  {
    id: "avc-correlation",
    from: "avc",
    to: "correlation",
    label: "Multiplier",
    sourceHandle: "bottom",
    targetHandle: "top",
    animated: true,
  },
  {
    id: "ttcpd-maturity",
    from: "ttcpd",
    to: "maturity",
    label: "Input",
    sourceHandle: "bottom",
    targetHandle: "left",
    animated: true,
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
  },
  {
    id: "correlation-rwa",
    from: "correlation",
    to: "rwa",
    label: "Input",
    sourceHandle: "bottom",
    targetHandle: "top",
    animated: true,
  },
  {
    id: "lgd-rwa",
    from: "lgd",
    to: "rwa",
    label: "Input",
    sourceHandle: "right",
    targetHandle: "left",
    animated: true,
  },
  {
    id: "ead-rwa",
    from: "ead",
    to: "rwa",
    label: "Input",
    sourceHandle: "right",
    targetHandle: "bottom",
    animated: true,
  },
  {
    id: "maturity-rwa",
    from: "maturity",
    to: "rwa",
    label: "Input",
    sourceHandle: "right",
    targetHandle: "right",
    animated: true,
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
  data,
  results,
  onModuleSelect,
  onCreditReview,
  modifiedModules = [],
}: ModuleFlowchartProps) {
  const [selectedModule, setSelectedModule] = useState(null)
  const [isModuleDetailOpen, setIsModuleDetailOpen] = useState(false)

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
        if (!results) return "N/A"

        if (module.id === "rwa") {
          const finalRwa = results.rwa
          const hasAdjustment = results.hasAdjustment || results.hasPortfolioAdjustment || results.originalRwa

          if (hasAdjustment) {
            const originalRwa = results.originalRwa || results.rwa
            const adjustmentPercentage = (finalRwa / originalRwa - 1) * 100
            return `$${Math.round(finalRwa).toLocaleString()} (${adjustmentPercentage >= 0 ? "+" : ""}${adjustmentPercentage.toFixed(1)}%)`
          }

          return `$${Math.round(finalRwa).toLocaleString()}`
        }

        switch (module.id) {
          case "pd":
            return data ? (data.pd * 100).toFixed(2) + "%" : "N/A"
          case "ttcpd":
            return data ? (data.ttcPd * 100).toFixed(2) + "%" : "N/A"
          case "creditreview":
            return data ? (data.creditRating ? data.creditRating : "Not Reviewed") : "N/A"
          case "lgd":
            return data ? (data.lgd * 100).toFixed(2) + "%" : "N/A"
          case "ead":
            return data ? `$${Math.round(data.ead).toLocaleString()}` : "N/A"
          case "avc":
            return results ? results.avcMultiplier.toFixed(2) + "x" : "N/A"
          case "correlation":
            return results ? (results.correlation * 100).toFixed(2) + "%" : "N/A"
          case "maturity":
            return results ? results.maturityAdjustment.toFixed(4) : "N/A"
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
    labelStyle: { fill: "#888", fontSize: 10 },
    labelBgStyle: { fill: "rgba(255, 255, 255, 0.8)" },
    animated: connection.animated,
    style: {
      stroke: connection.style?.strokeDasharray ? "#888" : "#666",
      strokeWidth: 1.5,
      ...(connection.style || {}),
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 15,
      height: 15,
      color: connection.style?.strokeDasharray ? "#888" : "#666",
    },
    sourceHandle: connection.sourceHandle,
    targetHandle: connection.targetHandle,
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
      onModuleSelect(node.id)

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
    [setNodes, onModuleSelect, onCreditReview],
  )

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
        >
          <Controls />
          <Background variant="dots" gap={12} size={1} />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  )
}
