import { AlertTriangle, Moon, ShieldCheck, Sprout, Stethoscope, Store, Sun } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ZipBar } from "@/components/ZipBar";
import { ChatWidget } from "@/components/ChatWidget";
import { RecallsSection } from "@/sections/RecallsSection";
import { StoresSection } from "@/sections/StoresSection";
import { MarketsSection } from "@/sections/MarketsSection";
import { GrowSection } from "@/sections/GrowSection";
import { SymptomsSection } from "@/sections/SymptomsSection";
import { useZip } from "@/hooks/useZip";
import { useTheme } from "@/hooks/useTheme";

export default function App() {
  const { zip, setZip, geo, geoLoading, geoError } = useZip();
  const { theme, toggle } = useTheme();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur">
        <div className="container flex items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-6 text-primary" />
            <div>
              <h1 className="text-lg font-semibold leading-tight">OpenCORE</h1>
              <p className="text-xs text-muted-foreground">
                FDA &amp; CDC food-safety data, near you
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
        </div>
      </header>

      <main className="container py-8">
        <section className="mb-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-semibold tracking-tight">
              Know what's recalled, and shop safer
            </h2>
            <p className="mt-2 text-muted-foreground">
              Live FDA recalls and active CDC outbreak data, the specific companies named in the
              current investigation, how to recognize the illnesses themselves, farmers markets near
              you, and guides to grow your own produce.
            </p>
          </div>
          <ZipBar
            zip={zip}
            onZip={setZip}
            place={geo?.place}
            loading={geoLoading}
            error={geoError}
          />
        </section>

        <Tabs defaultValue="recalls">
          <TabsList>
            <TabsTrigger value="recalls">
              <AlertTriangle className="size-4" /> Recalls &amp; outbreaks
            </TabsTrigger>
            <TabsTrigger value="symptoms">
              <Stethoscope className="size-4" /> Signs &amp; care
            </TabsTrigger>
            <TabsTrigger value="stores">
              <Store className="size-4" /> Named locations
            </TabsTrigger>
            <TabsTrigger value="markets">
              <Sprout className="size-4" /> Farmers markets
            </TabsTrigger>
            <TabsTrigger value="grow">
              <Sprout className="size-4" /> Grow your own
            </TabsTrigger>
          </TabsList>

          <TabsContent value="recalls">
            <RecallsSection geo={geo} />
          </TabsContent>
          <TabsContent value="symptoms">
            <SymptomsSection />
          </TabsContent>
          <TabsContent value="stores">
            <StoresSection geo={geo} />
          </TabsContent>
          <TabsContent value="markets">
            <MarketsSection geo={geo} />
          </TabsContent>
          <TabsContent value="grow">
            <GrowSection />
          </TabsContent>
        </Tabs>
      </main>

      <footer className="mt-8 border-t bg-card/30">
        <div className="container space-y-2 py-6 text-xs text-muted-foreground">
          <p>
            <strong className="text-foreground">Not medical or official guidance.</strong> This
            tool aggregates public FDA and CDC data for convenience. It does not determine that any
            specific store location is unsafe, and it never infers risk from supplier relationships —
            only companies explicitly named in the official record appear, each with a citation.
            Always confirm details against the linked FDA/CDC sources.
          </p>
          <p>
            Data: openFDA food enforcement API · FDA CORE outbreak table · CDC cyclosporiasis
            investigations · Mapbox (location search &amp; maps). If you are ill, contact a
            healthcare provider.
          </p>
        </div>
      </footer>

      <ChatWidget geo={geo} />
    </div>
  );
}
