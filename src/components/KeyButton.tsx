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
export function KeyButton() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Info className="size-4" /> Key
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>How to read the classifications</DialogTitle>
          <DialogDescription>
            What the severity classes, statuses, and "named in the record" labels mean.
          </DialogDescription>
        </DialogHeader>
        <ClassificationKey />
      </DialogContent>
    </Dialog>
  );
}
