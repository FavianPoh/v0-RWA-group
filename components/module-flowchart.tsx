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

// Update the connections array to include a method to determine if a connection is affected by modified modules
const connections = [
  {
    from: "pd",
    to: "ttcpd",
    label: "Input",
    path: { type: "straight", offsetY: 0 },
  },
  {
    from: "ttcpd",
    to: "correlation",
    label: "Input",
    path: { type: "straight", offsetY: 0 },
  },
  {
    from: "avc",
    to: "correlation",
    label: "Multiplier",
    path: { type: "straight", offsetY: 0 },
  },
  {
    from: "ttcpd",
    to: "maturity",
    label: "Input",
    path: { type: "angled", startSide: "bottom", endSide: "top" },
  },
  {
    from: "creditreview",
    to: "rwa",
    label: "Optional Input",
    dashed: true,
    path: { type: "curved", startSide: "bottom", endSide: "top", controlPointOffset: 100 },
  },
  {
    from: "correlation",
    to: "rwa",
    label: "Input",
    path: { type: "angled", startSide: "bottom", endSide: "top" },
  },
  {
    from: "lgd",
    to: "rwa",
    label: "Input",
    path: { type: "angled", startSide: "bottom", endSide: "top" },
  },
  {
    from: "ead",
    to: "rwa",
    label: "Input",
    path: { type: "angled", startSide: "bottom", endSide: "right" },
  },
  {
    from: "maturity",
    to: "rwa",
    label: "Input",
    path: { type: "angled", startSide: "bottom", endSide: "left" },
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

export function ModuleFlowchart({ data, results, onModuleSelect, onCreditReview, modifiedModules = [] }) {
  const containerRef = useRef(null)
  const [lines, setLines] = useState([])
  const moduleRefs = useRef({})
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })

  // Define fixed positions for each module to match the image layout
  const modulePositions = {
    pd: { x: 50, y: 50 },
    ttcpd: { x: 250, y: 50 },
    creditreview: { x: 450, y: 50 },
    avc: { x: 50, y: 200 },
    correlation: { x: 250, y: 200 },
    lgd: { x: 450, y: 200 },
    ead: { x: 50, y: 350 },
    maturity: { x: 250, y: 350 },
    rwa: { x: 250, y: 500 }, // Centered at the bottom
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

  // Update the calculateLines function to add affected status to connections
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

          // Determine connection sides based on module positions
          let fromSide, toSide

          if (connection.path.type === "straight") {
            // For horizontal connections
            if (fromRect.left < toRect.left) {
              fromSide = "right"
              toSide = "left"
            } else {
              fromSide = "left"
              toSide = "right"
            }
          } else if (connection.path.startSide && connection.path.endSide) {
            fromSide = connection.path.startSide
            toSide = connection.path.endSide
          } else {
            // Default for vertical or diagonal connections
            if (fromRect.top < toRect.top) {
              fromSide = "bottom"
              toSide = "top"
            } else {
              fromSide = "top"
              toSide = "bottom"
            }
          }

          // Get connection points based on specified sides
          const fromPoint = getConnectionPoint(fromRect, fromSide)
          const toPoint = getConnectionPoint(toRect, toSide)

          // Adjust for container position
          const fromX = fromPoint.x - containerRect.left
          const fromY = fromPoint.y - containerRect.top
          const toX = toPoint.x - containerRect.left
          const toY = toPoint.y - containerRect.top

          // Calculate path based on connection type
          let path

          if (connection.path.type === "straight") {
            // Simple straight line
            path = `M${fromX},${fromY} L${toX},${toY}`
          } else if (connection.path.type === "angled") {
            // Angled path with right angles
            if (fromSide === "bottom" && toSide === "top") {
              const midY = (fromY + toY) / 2
              path = `M${fromX},${fromY} L${fromX},${midY} L${toX},${midY} L${toX},${toY}`
            } else if (fromSide === "right" && toSide === "left") {
              const midX = (fromX + toX) / 2
              path = `M${fromX},${fromY} L${midX},${fromY} L${midX},${toY} L${toX},${toY}`
            } else if (fromSide === "bottom" && toSide === "right") {
              path = `M${fromX},${fromY} L${fromX},${toY} L${toX},${toY}`
            } else if (fromSide === "bottom" && toSide === "left") {
              path = `M${fromX},${fromY} L${fromX},${toY} L${toX},${toY}`
            } else {
              // Default angled path
              const midY = (fromY + toY) / 2
              path = `M${fromX},${fromY} L${fromX},${midY} L${toX},${midY} L${toX},${toY}`
            }
          } else if (connection.path.type === "curved") {
            // Curved path with control points
            const offset = connection.path.controlPointOffset || 50

            if (fromSide === "bottom" && toSide === "top") {
              // Vertical curve
              path = `M${fromX},${fromY} C${fromX},${fromY + offset} ${toX},${toY - offset} ${toX},${toY}`
            } else if (fromSide === "right" && toSide === "left") {
              // Horizontal curve
              path = `M${fromX},${fromY} C${fromX + offset},${fromY} ${toX - offset},${toY} ${toX},${toY}`
            } else {
              // Diagonal curve
              path = `M${fromX},${fromY} C${fromX},${fromY + offset} ${toX},${toY - offset} ${toX},${toY}`
            }
          }

          // Calculate label position
          let labelX, labelY

          if (connection.path.type === "straight") {
            labelX = (fromX + toX) / 2
            labelY = (fromY + toY) / 2 - 10
          } else if (connection.path.type === "angled") {
            if (fromSide === "bottom" && toSide === "top") {
              const midY = (fromY + toY) / 2
              labelX = (fromX + toX) / 2
              labelY = midY - 10
            } else if (fromSide === "right" && toSide === "left") {
              const midX = (fromX + toX) / 2
              labelX = midX
              labelY = (fromY + toY) / 2 - 10
            } else {
              // Default label position
              labelX = (fromX + toX) / 2
              labelY = (fromY + toY) / 2 - 10
            }
          } else {
            // Curved path label
            labelX = (fromX + toX) / 2
            labelY = (fromY + toY) / 2 - 20
          }

          // Check if this connection is affected by modified modules
          const isFromModified = modifiedModules.includes(connection.from)
          const isToAffected = isAffectedByModifiedModules(connection.to, modifiedModules)
          const isAffected = isFromModified && isToAffected

          return {
            fromX,
            fromY,
            toX,
            toY,
            path,
            labelX,
            labelY,
            fromModule: connection.from,
            toModule: connection.to,
            label: connection.label,
            dashed: connection.dashed,
            isAffected,
          }
        })
        .filter(Boolean)

      setLines(newLines)
    }

    // Use a small delay to ensure all modules are rendered
    const timer = setTimeout(calculateLines, 100)
    return () => clearTimeout(timer)
  }, [containerSize, modifiedModules])

  const getModuleValue = (moduleId) => {
    if (!results) return "N/A"

    // Only show adjustment information for the RWA module
    if (moduleId === "rwa") {
      const finalRwa = results.rwa
      const hasAdjustment = results.hasAdjustment || results.hasPortfolioAdjustment || results.originalRwa

      if (hasAdjustment) {
        const originalRwa = results.originalRwa || results.rwa
        const adjustmentPercentage = (finalRwa / originalRwa - 1) * 100
        return `$${Math.round(finalRwa).toLocaleString()} (${adjustmentPercentage >= 0 ? "+" : ""}${adjustmentPercentage.toFixed(1)}%)`
      }

      return `$${Math.round(finalRwa).toLocaleString()}`
    }

    // For all other modules, show the regular value without adjustment info
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
      default:
        return "N/A"
    }
  }

  // Check if a module has been modified
  const isModified = (moduleId) => {
    return modifiedModules.includes(moduleId)
  }

  // Update the SVG rendering to show different colors for affected connections
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
                <polygon points="0 0, 10 3.5, 0 7" fill={line.isAffected ? "#f59e0b" : "#94a3b8"} />
              </marker>
            </defs>
            <path
              d={line.path}
              stroke={line.isAffected ? "#f59e0b" : "#94a3b8"}
              strokeWidth={line.isAffected ? "3" : "2"}
              fill="none"
              strokeDasharray={line.dashed ? "5,5" : "none"}
              markerEnd={`url(#arrowhead-${index})`}
            />
            {/* Add label to the connection with background */}
            <rect
              x={line.labelX - 40}
              y={line.labelY - 10}
              width="80"
              height="20"
              rx="4"
              fill="white"
              className="dark:fill-slate-800"
              fillOpacity="0.8"
            />
            <text
              x={line.labelX}
              y={line.labelY}
              textAnchor="middle"
              fill={line.isAffected ? "#f59e0b" : "#64748b"}
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
              isModified={isModified(module.id)}
              // Only show adjustment indicator for RWA module
              hasAdjustment={module.id === "rwa" && (results.hasAdjustment || results.hasPortfolioAdjustment)}
            />
          </div>
        )
      })}
    </div>
  )
}

// Find the ModuleCard component and enhance it to show adjustment indicators

const ModuleCard = ({ module, value, onClick, className, optional, onAction, isModified, hasAdjustment, ...props }) => {
  // Extract the RWA value and potential adjustment information
  const isRwaModule = module.id === "rwa"
  const showAdjustment = isRwaModule && hasAdjustment && value.includes("(")

  // If it's an RWA value with an adjustment, split it
  let rwaValue = value
  let adjustmentInfo = null

  if (showAdjustment) {
    const parts = value.split(" (")
    rwaValue = parts[0]
    adjustmentInfo = parts[1].replace(")", "")
  }

  return (
    <Card
      className={`p-4 cursor-pointer hover:shadow-md transition-shadow border-l-4 ${className} ${
        optional ? "border-dashed" : ""
      } ${isModified ? "ring-2 ring-amber-400 dark:ring-amber-600" : ""} ${
        showAdjustment ? "border-b-4 border-b-purple-500 dark:border-b-purple-600" : ""
      }`}
      style={{ borderLeftColor: module.color }}
      onClick={onClick}
      {...props}
    >
      <div className="flex justify-between items-start">
        <div>
          <div className="font-medium">
            {module.name}
            {isModified && (
              <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                Modified
              </span>
            )}
          </div>
          <div className="text-sm text-muted-foreground">{module.description}</div>
          <div className="mt-2 text-xl font-bold">
            {showAdjustment ? (
              <>
                {rwaValue}
                <span
                  className={`ml-1 text-sm font-medium ${
                    adjustmentInfo.startsWith("+") ? "text-green-600" : "text-red-600"
                  }`}
                >
                  ({adjustmentInfo})
                </span>
              </>
            ) : (
              value
            )}
          </div>
          {showAdjustment && (
            <div className="mt-1 text-xs text-purple-600 dark:text-purple-400">Includes adjustment</div>
          )}
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
