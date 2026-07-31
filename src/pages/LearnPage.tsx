import { Stethoscope, Sprout } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SymptomsSection } from "@/sections/SymptomsSection";
import { GrowSection } from "@/sections/GrowSection";

/** Educational section: how to recognize the illnesses + how to grow your own. */
export function LearnPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Learn</h1>
        <p className="text-sm text-muted-foreground">
          Recognize the illnesses these outbreaks cause, and grow your own produce to control what
          you eat.
        </p>
      </div>

      <Tabs defaultValue="symptoms">
        <TabsList>
          <TabsTrigger value="symptoms">
            <Stethoscope className="size-4" /> Signs &amp; care
          </TabsTrigger>
          <TabsTrigger value="grow">
            <Sprout className="size-4" /> Grow your own
          </TabsTrigger>
        </TabsList>
        <TabsContent value="symptoms">
          <SymptomsSection />
        </TabsContent>
        <TabsContent value="grow">
          <GrowSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
