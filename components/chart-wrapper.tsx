"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

export function ChartWrapper({ children }) {
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div className="w-full h-full flex items-center justify-center">Loading chart...</div>
  }

  return (
    <div className="w-full h-full" data-theme={theme}>
      {children}
    </div>
  )
}
