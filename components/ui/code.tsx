"use client"

import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"
import Prism from "prismjs"
import "prismjs/components/prism-typescript"
import "prismjs/components/prism-javascript"
import "prismjs/components/prism-jsx"
import "prismjs/components/prism-tsx"
import "prismjs/themes/prism-tomorrow.css"

interface CodeProps {
  code: string
  language?: string
  className?: string
}

export function Code({ code, language = "typescript", className }: CodeProps) {
  const codeRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (codeRef.current) {
      Prism.highlightElement(codeRef.current)
    }
  }, [code])

  return (
    <div className={cn("relative rounded-md overflow-hidden", className)}>
      <div className="absolute top-0 right-0 bg-muted px-3 py-1 text-xs font-mono rounded-bl-md">{language}</div>
      <pre className="p-4 pt-8 overflow-x-auto bg-slate-900 text-slate-50 text-sm">
        <code ref={codeRef} className={`language-${language}`}>
          {code}
        </code>
      </pre>
    </div>
  )
}
