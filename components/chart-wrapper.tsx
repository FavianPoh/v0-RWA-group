"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

export function ChartWrapper({
  children,
  data,
  xKey,
  yKey,
  xLabel,
  yLabel,
  formatXLabel,
  formatYLabel,
  formatTooltip,
  height = 400,
}) {
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div className="w-full h-full flex items-center justify-center">Loading chart...</div>
  }

  // If children are provided, render them directly
  if (children) {
    return (
      <div className="w-full h-full" data-theme={theme}>
        {children}
      </div>
    )
  }

  // Otherwise, render a line chart with the provided data
  return (
    <div className="w-full h-full" data-theme={theme}>
      <div style={{ width: "100%", height: height }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 25 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey={xKey}
              label={{ value: xLabel, position: "insideBottom", offset: -10 }}
              tickFormatter={formatXLabel}
            />
            <YAxis label={{ value: yLabel, angle: -90, position: "insideLeft" }} tickFormatter={formatYLabel} />
            <Tooltip
              formatter={(value, name) => [formatYLabel ? formatYLabel(value) : value, name]}
              labelFormatter={(label) => (formatXLabel ? formatXLabel(label) : label)}
              content={({ active, payload, label }) => {
                if (active && payload && payload.length && formatTooltip) {
                  const point = payload[0].payload
                  const tooltipData = formatTooltip(point)

                  return (
                    <div className="bg-white dark:bg-gray-800 p-2 border border-gray-200 dark:border-gray-700 rounded shadow-lg">
                      {tooltipData.map((item, index) => (
                        <div key={index} className="flex justify-between gap-4">
                          <span className="font-medium">{item.label}:</span>
                          <span>{item.value}</span>
                        </div>
                      ))}
                    </div>
                  )
                }
                return null
              }}
            />
            <Legend />
            <Line type="monotone" dataKey={yKey} stroke="#8884d8" activeDot={{ r: 8 }} name={yLabel || yKey} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
