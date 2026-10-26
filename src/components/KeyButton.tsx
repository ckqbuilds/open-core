import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { ClassificationKey } from "@/components/ClassificationKey";

/** "Key" capsule (or inline link) that opens the legend for every chip and term. */
export function KeyButton({ variant = "button" }: { variant?: "button" | "link" }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {variant === "link" ? (
          <button type="button" className="link inline-flex min-h-9 pointer-coarse:min-h-10 items-center gap-1.5 text-sm">
            <Info className="size-4" /> What do these chips mean?
          </button>
        ) : (
          <Button size="sm" chip>
            <Info /> Key
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
