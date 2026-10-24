import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ClassificationKey } from "@/components/ClassificationKey";

/** "Key" button that opens the classification legend. Lives with the outbreaks. */
export function KeyButton({ variant = "button" }: { variant?: "button" | "link" }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {variant === "link" ? (
          <button
            type="button"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-sm text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Info className="size-4" /> What do these chips mean?
          </button>
        ) : (
          <Button variant="outline" size="sm" className="min-h-10">
            <Info className="size-4" /> Key
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>How to read this data</DialogTitle>
          <DialogDescription>
            What the data sources, severity classes, statuses, and "named in the record" labels mean.
          </DialogDescription>
        </DialogHeader>
        <ClassificationKey />
      </DialogContent>
    </Dialog>
  );
}
