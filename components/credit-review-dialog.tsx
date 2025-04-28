"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { getCreditRatings } from "@/lib/credit-ratings"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Info } from "lucide-react"

export function CreditReviewDialog({
  counterparty,
  onComplete,
  onSave = () => {},
  onCancel = () => {},
  onDiscard = () => {},
}) {
  const [rating, setRating] = useState(counterparty?.rating || "BBB")

  // Initialize PD with a safe default
  const getInitialPd = () => {
    const pdValue = counterparty?.pd || 0.01
    return isNaN(pdValue) ? 0.01 : pdValue
  }

  const [pd, setPd] = useState(getInitialPd())
  const [pdOverride, setPdOverride] = useState(false)
  const [notes, setNotes] = useState("")
  const [error, setError] = useState("")
  const [creditRatings, setCreditRatings] = useState([])

  // Load credit ratings on component mount
  useEffect(() => {
    const ratings = getCreditRatings()
    setCreditRatings(ratings)

    // Set initial values from counterparty
    if (counterparty) {
      setRating(counterparty.rating || "BBB")

      // Ensure PD is a valid number
      const pdValue = counterparty.pd || 0.01
      setPd(isNaN(pdValue) ? 0.01 : pdValue)

      setPdOverride(counterparty.pdOverride || false)
    }
  }, [counterparty])

  // Update PD when rating changes (unless PD is overridden)
  useEffect(() => {
    if (!pdOverride && creditRatings.length > 0) {
      const selectedRating = creditRatings.find((r) => r.rating === rating)
      if (selectedRating) {
        const pdValue = selectedRating.pd
        setPd(isNaN(pdValue) ? 0.01 : pdValue)
      }
    }
  }, [rating, pdOverride, creditRatings])

  // Handle rating change
  const handleRatingChange = (value) => {
    setRating(value)
  }

  // Handle PD change
  const handlePdChange = (value) => {
    const pdValue = Number.parseFloat(value)
    if (!isNaN(pdValue) && pdValue >= 0 && pdValue <= 1) {
      setPd(pdValue)
    }
  }

  // Handle PD slider change
  const handlePdSliderChange = (value) => {
    const pdValue = value[0]
    setPd(isNaN(pdValue) ? 0.01 : pdValue)
  }

  // Handle save
  const handleSave = () => {
    try {
      console.log("Credit review save triggered with data:", { rating, pd, notes })

      // Validate inputs
      if (!rating) {
        setError("Rating is required")
        return
      }

      if (pd === null || pd === undefined || isNaN(pd)) {
        setError("Valid PD is required")
        return
      }

      // Prepare data to return
      const reviewData = {
        rating,
        pd,
        pdOverride,
        notes,
        reviewDate: new Date().toISOString(),
      }

      console.log("Credit review data prepared:", reviewData)

      // Call the appropriate callback
      if (typeof onComplete === "function") {
        console.log("Calling onComplete callback")
        onComplete(reviewData)
      } else if (typeof onSave === "function") {
        console.log("Calling onSave callback")
        onSave(reviewData)
      } else {
        console.error("No valid callback provided for credit review save")
        setError("Unable to save review: No callback provided")
      }
    } catch (err) {
      console.error("Error in credit review save:", err)
      setError(`Error saving review: ${err.message}`)
    }
  }

  // Handle cancel
  const handleCancel = () => {
    if (typeof onCancel === "function") {
      onCancel()
    }
  }

  // Handle discard
  const handleDiscard = () => {
    if (typeof onDiscard === "function") {
      onDiscard()
    }
  }

  // Format PD as percentage
  const formatPdPercentage = (value) => {
    if (isNaN(value)) return "0.0000%"
    return `${(value * 100).toFixed(4)}%`
  }

  return (
    <div className="space-y-4 py-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Counterparty Information</CardTitle>
          <CardDescription>Review the counterparty details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium">Name</p>
              <p>{counterparty?.name || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Industry</p>
              <p>{counterparty?.industry || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Region</p>
              <p>{counterparty?.region || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Current Rating</p>
              <div className="flex items-center gap-2">
                <Badge>{counterparty?.rating || "N/A"}</Badge>
                <span className="text-sm text-muted-foreground">
                  (PD: {counterparty?.pd ? formatPdPercentage(counterparty.pd) : "N/A"})
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="rating">Credit Rating</Label>
          <Select value={rating} onValueChange={handleRatingChange}>
            <SelectTrigger id="rating">
              <SelectValue placeholder="Select rating" />
            </SelectTrigger>
            <SelectContent>
              {creditRatings.map((r) => (
                <SelectItem key={r.rating} value={r.rating}>
                  {r.rating} ({formatPdPercentage(r.pd)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="pd-override">Override PD</Label>
            <input
              type="checkbox"
              id="pd-override"
              checked={pdOverride}
              onChange={(e) => setPdOverride(e.target.checked)}
              className="h-4 w-4"
            />
          </div>
          {pdOverride && (
            <>
              <div className="flex items-center justify-between">
                <Label htmlFor="pd">Probability of Default (PD)</Label>
                <span className="text-sm font-medium">{formatPdPercentage(pd)}</span>
              </div>
              <Slider
                id="pd"
                min={0.0001}
                max={0.2}
                step={0.0001}
                value={[isNaN(pd) ? 0.01 : pd]}
                onValueChange={handlePdSliderChange}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0.01%</span>
                <span>20%</span>
              </div>
              <div className="mt-2">
                <Label htmlFor="pd-input">Custom PD Value</Label>
                <Input
                  id="pd-input"
                  type="number"
                  min={0}
                  max={1}
                  step={0.0001}
                  value={isNaN(pd) ? "0.01" : pd}
                  onChange={(e) => handlePdChange(e.target.value)}
                />
              </div>
            </>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Review Notes</Label>
          <textarea
            id="notes"
            className="w-full min-h-[100px] p-2 border rounded-md"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Enter any notes about this credit review..."
          />
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Rating Information</AlertTitle>
          <AlertDescription>
            Changing the credit rating will update the PD used in RWA calculations. If you need to use a custom PD
            value, check the "Override PD" option.
          </AlertDescription>
        </Alert>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button variant="destructive" onClick={handleDiscard}>
          Discard
        </Button>
        <Button variant="outline" onClick={handleCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave}>Save Credit Review</Button>
      </div>
    </div>
  )
}
