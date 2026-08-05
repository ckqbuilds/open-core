import { Stethoscope, Sprout, GraduationCap } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SymptomsSection } from "@/sections/SymptomsSection";
import { GrowSection } from "@/sections/GrowSection";
import { PageHeader } from "@/components/PageHeader";

/** Educational section: how to recognize the illnesses + how to grow your own. */
export function LearnPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        icon={<GraduationCap className="size-6 text-primary" />}
        title="Learn"
        description="Recognize the illnesses these outbreaks cause, and grow your own produce to control what you eat."
      />

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
