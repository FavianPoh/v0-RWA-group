"use client"

import { useState, useRef, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ClipboardEdit } from "lucide-react"

const modules = [
  { id: "pd", name: "PD Calculator", description: "Probability of Default", color: "#f97316", order: 1 },
  { id: "ttcpd", name: "TTC PD", description: "Through-The-Cycle PD", color: "#f43f5e", order: 2 },
  {
    id: "creditreview",
    name: "Credit Review",
    description: "Rating-Based PD",
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

// Define connections with explicit source and target points
const connections = [
  { from: "pd", to: "ttcpd", label: "Input", sourcePoint: "right", targetPoint: "left" },
  { from: "ttcpd", to: "correlation", label: "Input", sourcePoint: "bottom", targetPoint: "top" },
  { from: "ttcpd", to: "maturity", label: "Input", sourcePoint: "bottom", targetPoint: "top" },
  { from: "creditreview", to: "rwa", label: "Optional Input", dashed: true, sourcePoint: "bottom", targetPoint: "top" },
  { from: "avc", to: "correlation", label: "Multiplier", sourcePoint: "right", targetPoint: "left" },
  { from: "correlation", to: "rwa", label: "Input", sourcePoint: "bottom", targetPoint: "top" },
  { from: "lgd", to: "rwa", label: "Input", sourcePoint: "bottom", targetPoint: "top" },
  { from: "ead", to: "rwa", label: "Input", sourcePoint: "bottom", targetPoint: "top" },
  { from: "maturity", to: "rwa", label: "Input", sourcePoint: "bottom", targetPoint: "top" },
]

export function ModuleFlowchart({ data, results, onModuleSelect, onCreditReview }) {
  const containerRef = useRef(null)
  const [lines, setLines] = useState([])
  const moduleRefs = useRef({})
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })

  // Define fixed positions for each module
  const modulePositions = {
    pd: { x: 50, y: 50 },
    ttcpd: { x: 250, y: 50 },
    creditreview: { x: 450, y: 50 },
    avc: { x: 50, y: 200 },
    correlation: { x: 250, y: 200 },
    lgd: { x: 450, y: 200 },
    ead: { x: 50, y: 350 },
    maturity: { x: 250, y: 350 },
    rwa: { x: 450, y: 500 },
  }

  // Get connection points based on the specified side
  const getConnectionPoint = (rect, side) => {
    switch (side) {
      case "top":
        return { x: rect.left + rect.width / 2, y: rect.top }
      case "right":
        return { x: rect.left + rect.width, y: rect.top + rect.height / 2 }
      case "bottom":
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height }
      case "left":
        return { x: rect.left, y: rect.top + rect.height / 2 }
      default:
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
    }
  }

  useEffect(() => {
    if (!containerRef.current) return

    const updateContainerSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        })
      }
    }

    updateContainerSize()
    window.addEventListener("resize", updateContainerSize)

    return () => {
      window.removeEventListener("resize", updateContainerSize)
    }
  }, [])

  useEffect(() => {
    if (!containerRef.current || containerSize.width === 0) return

    const calculateLines = () => {
      const newLines = connections
        .map((connection) => {
          const fromModule = moduleRefs.current[connection.from]
          const toModule = moduleRefs.current[connection.to]

          if (!fromModule || !toModule) return null

          const fromRect = fromModule.getBoundingClientRect()
          const toRect = toModule.getBoundingClientRect()
          const containerRect = containerRef.current.getBoundingClientRect()

          // Get connection points based on specified sides
          const fromPoint = getConnectionPoint(fromRect, connection.sourcePoint)
          const toPoint = getConnectionPoint(toRect, connection.targetPoint)

          // Adjust for container position
          const fromX = fromPoint.x - containerRect.left
          const fromY = fromPoint.y - containerRect.top
          const toX = toPoint.x - containerRect.left
          const toY = toPoint.y - containerRect.top

          // Calculate control points for the curve
          let controlPoints
          if (connection.sourcePoint === "bottom" && connection.targetPoint === "top") {
            // Vertical connection
            const midY = (fromY + toY) / 2
            controlPoints = {
              cp1x: fromX,
              cp1y: midY,
              cp2x: toX,
              cp2y: midY,
            }
          } else if (connection.sourcePoint === "right" && connection.targetPoint === "left") {
            // Horizontal connection
            const midX = (fromX + toX) / 2
            controlPoints = {
              cp1x: midX,
              cp1y: fromY,
              cp2x: midX,
              cp2y: toY,
            }
          } else {
            // Diagonal or other connections
            controlPoints = {
              cp1x: fromX + (toX - fromX) * 0.5,
              cp1y: fromY,
              cp2x: toX - (toX - fromX) * 0.5,
              cp2y: toY,
            }
          }

          return {
            fromX,
            fromY,
            toX,
            toY,
            controlPoints,
            fromModule: connection.from,
            toModule: connection.to,
            label: connection.label,
            dashed: connection.dashed,
          }
        })
        .filter(Boolean)

      setLines(newLines)
    }

    // Use a small delay to ensure all modules are rendered
    const timer = setTimeout(calculateLines, 100)
    return () => clearTimeout(timer)
  }, [containerSize])

  const getModuleValue = (moduleId) => {
    if (!results) return "N/A"

    switch (moduleId) {
      case "pd":
        return `${(data.pd * 100).toFixed(2)}%`
      case "ttcpd":
        return `${(data.ttcPd * 100).toFixed(2)}%`
      case "creditreview":
        return data.creditRating ? data.creditRating : "Not Reviewed"
      case "lgd":
        return `${(data.lgd * 100).toFixed(2)}%`
      case "ead":
        return `$${Math.round(data.ead).toLocaleString()}`
      case "avc":
        return `${results.avcMultiplier.toFixed(2)}x`
      case "correlation":
        return `${(results.correlation * 100).toFixed(2)}%`
      case "maturity":
        return results.maturityAdjustment.toFixed(4)
      case "rwa":
        return `$${Math.round(results.rwa).toLocaleString()}`
      default:
        return "N/A"
    }
  }

  return (
    <div
      className="relative w-full h-[700px] overflow-auto bg-slate-50 dark:bg-slate-900 rounded-lg p-4"
      ref={containerRef}
    >
      <svg className="absolute top-0 left-0 w-full h-full pointer-events-none">
        {lines.map((line, index) => (
          <g key={index}>
            <defs>
              <marker id={`arrowhead-${index}`} markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
              </marker>
            </defs>
            <path
              d={`M${line.fromX},${line.fromY} C${line.controlPoints.cp1x},${line.controlPoints.cp1y} ${line.controlPoints.cp2x},${line.controlPoints.cp2y} ${line.toX},${line.toY}`}
              stroke="#94a3b8"
              strokeWidth="2"
              fill="none"
              strokeDasharray={line.dashed ? "5,5" : "none"}
              markerEnd={`url(#arrowhead-${index})`}
            />
            {/* Add label to the connection with background */}
            <rect
              x={(line.fromX + line.toX) / 2 - 40}
              y={(line.fromY + line.toY) / 2 - 20}
              width="80"
              height="20"
              rx="4"
              fill="white"
              className="dark:fill-slate-800"
              fillOpacity="0.8"
            />
            <text
              x={(line.fromX + line.toX) / 2}
              y={(line.fromY + line.toY) / 2 - 8}
              textAnchor="middle"
              fill="#64748b"
              fontSize="12"
              dominantBaseline="middle"
            >
              {line.label}
            </text>
          </g>
        ))}
      </svg>

      {modules.map((module) => {
        const position = modulePositions[module.id]
        return (
          <div
            key={module.id}
            className="absolute"
            style={{
              left: `${position.x}px`,
              top: `${position.y}px`,
              width: "160px",
            }}
            ref={(el) => (moduleRefs.current[module.id] = el)}
          >
            <ModuleCard
              module={module}
              value={getModuleValue(module.id)}
              onClick={() => onModuleSelect(module.id)}
              optional={module.optional}
              onAction={module.id === "creditreview" ? onCreditReview : undefined}
            />
          </div>
        )
      })}
    </div>
  )
}

const ModuleCard = ({ module, value, onClick, className, optional, onAction, ...props }) => {
  return (
    <Card
      className={`p-4 cursor-pointer hover:shadow-md transition-shadow border-l-4 ${className} ${
        optional ? "border-dashed" : ""
      }`}
      style={{ borderLeftColor: module.color }}
      onClick={onClick}
      {...props}
    >
      <div className="flex justify-between items-start">
        <div>
          <div className="font-medium">{module.name}</div>
          <div className="text-sm text-muted-foreground">{module.description}</div>
          <div className="mt-2 text-xl font-bold">{value}</div>
        </div>
        {optional && onAction && (
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation()
              onAction()
            }}
            title="Perform Credit Review"
          >
            <ClipboardEdit className="h-4 w-4" />
          </Button>
        )}
      </div>
    </Card>
  )
}
