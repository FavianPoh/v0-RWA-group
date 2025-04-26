"use client"

import { useState } from "react"
import { RWADashboard } from "@/components/rwa-dashboard"
import { generateSyntheticData } from "@/lib/data-generator"

export default function Home() {
  const [data] = useState(generateSyntheticData(10))

  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-8">RWA Model Dashboard</h1>
      <RWADashboard data={data} />
    </main>
  )
}
