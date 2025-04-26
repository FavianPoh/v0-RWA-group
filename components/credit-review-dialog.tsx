"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { creditRatings, getPdFromRating } from "@/lib/credit-ratings"
import { format } from "date-fns"

export function CreditReviewDialog({ counterparty, onSave, onCancel }) {
  const [selectedRating, setSelectedRating] = useState(counterparty.creditRating || "BBB")
  const [useRatingPd, setUseRatingPd] = useState(counterparty.useCredRatingPd || false)

  const ratingPd = getPdFromRating(selectedRating)
  const ratingDescription = creditRatings.find((r) => r.rating === selectedRating)?.description

  const handleSave = () => {
    onSave({
      creditRating: selectedRating,
      creditRatingPd: ratingPd,
      creditReviewDate: format(new Date(), "yyyy-MM-dd"),
      useCredRatingPd: useRatingPd,
    })
  }

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Credit Review: {counterparty.name}</DialogTitle>
          <DialogDescription>
            Assign a credit rating to this counterparty and determine whether to use the rating-based PD.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="rating" className="text-right">
              Credit Rating
            </Label>
            <Select value={selectedRating} onValueChange={setSelectedRating} className="col-span-3">
              <SelectTrigger id="rating">
                <SelectValue placeholder="Select rating" />
              </SelectTrigger>
              <SelectContent>
                {creditRatings.map((rating) => (
                  <SelectItem key={rating.rating} value={rating.rating}>
                    {rating.rating} ({(rating.pd * 100).toFixed(4)}%)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <div className="text-right text-sm text-muted-foreground">Description</div>
            <div className="col-span-3 text-sm">{ratingDescription}</div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <div className="text-right text-sm text-muted-foreground">Rating PD</div>
            <div className="col-span-3 font-medium">{(ratingPd * 100).toFixed(4)}%</div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <div className="text-right text-sm text-muted-foreground">Model PD</div>
            <div className="col-span-3 font-medium">{(counterparty.ttcPd * 100).toFixed(4)}%</div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="use-rating" className="text-right">
              Use Rating PD
            </Label>
            <div className="col-span-3 flex items-center space-x-2">
              <Switch id="use-rating" checked={useRatingPd} onCheckedChange={setUseRatingPd} />
              <Label htmlFor="use-rating">{useRatingPd ? "Using credit rating PD" : "Using model PD"}</Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Credit Review</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
