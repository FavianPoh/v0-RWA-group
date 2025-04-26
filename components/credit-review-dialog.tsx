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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertTriangle, Trash2 } from "lucide-react"

export function CreditReviewDialog({ counterparty, onSave, onCancel, onDiscard }) {
  const [selectedRating, setSelectedRating] = useState(counterparty.creditRating || "BBB")
  const [useRatingPd, setUseRatingPd] = useState(counterparty.useCredRatingPd || false)
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)

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

  const handleDiscard = () => {
    onDiscard()
    setShowDiscardConfirm(false)
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

        {showDiscardConfirm ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Discard Credit Review</AlertTitle>
            <AlertDescription>
              This will remove the credit rating and revert to using the model TTC PD. Are you sure?
              <div className="flex gap-2 mt-2">
                <Button variant="destructive" size="sm" onClick={handleDiscard}>
                  Yes, Discard
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowDiscardConfirm(false)}>
                  Cancel
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        ) : (
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

            {counterparty.creditRating && (
              <div className="mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                  onClick={() => setShowDiscardConfirm(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Discard Credit Review
                </Button>
              </div>
            )}
          </div>
        )}

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
