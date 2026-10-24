import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import { ZipProvider } from "@/hooks/ZipContext";
import { TopNav } from "@/components/TopNav";
import { Wordmark } from "@/components/Wordmark";
import { ChatWidget } from "@/components/ChatWidget";
import { FoodsPage } from "@/pages/FoodsPage";
import { FoodPage } from "@/pages/FoodPage";
import { OutbreaksPage } from "@/pages/OutbreaksPage";
import { OutbreakPage } from "@/pages/OutbreakPage";
import { RecallsPage } from "@/pages/RecallsPage";
import { ShopLocalPage } from "@/pages/ShopLocalPage";
import { LearnPage } from "@/pages/LearnPage";

export default function App() {
  return (
    <BrowserRouter>
      <ZipProvider>
        <div className="min-h-screen bg-background">
          <a
            href="#main"
            className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:left-3 focus-visible:top-3 focus-visible:z-50 focus-visible:rounded-md focus-visible:bg-background focus-visible:px-3 focus-visible:py-2 focus-visible:text-sm focus-visible:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Skip to content
          </a>
          <TopNav />

          <main id="main" className="container py-6">
            <Routes>
              <Route path="/" element={<FoodsPage />} />
              <Route path="/food/:foodId" element={<FoodPage />} />
              <Route path="/outbreaks" element={<OutbreaksPage />} />
              <Route path="/outbreak/:refId" element={<OutbreakPage />} />
              <Route path="/recalls" element={<RecallsPage />} />
              <Route path="/shop-local" element={<ShopLocalPage />} />
              {/* Barcode check moved onto the Recalls page; keep old links working. */}
              <Route path="/check" element={<Navigate to="/recalls" replace />} />
              <Route path="/learn" element={<LearnPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>

          <footer className="mt-8 border-t bg-card/30">
            <div className="container space-y-2 py-6 text-xs text-muted-foreground">
              <div className="flex flex-wrap items-center gap-x-5 text-sm text-foreground">
                <span>Not sure what to do next?</span>
                <Link to="/recalls#check" className="inline-block py-2 font-medium text-primary hover:underline">Check a product barcode</Link>
                <Link to="/learn" className="inline-block py-2 font-medium text-primary hover:underline">Learn the signs of illness</Link>
                <Link to="/shop-local" className="inline-block py-2 font-medium text-primary hover:underline">Find local food sources</Link>
              </div>
              <p className="max-w-prose">
                <strong className="text-foreground">Not medical or official guidance.</strong> This
                tool aggregates public FDA and CDC data for convenience. It does not determine that
                any specific store location is unsafe, and it never infers risk from supplier
                relationships — only companies explicitly named in the official record appear, each
                with a citation. Always confirm details against the linked FDA/CDC sources.
              </p>
              <p className="max-w-prose">
                <Wordmark showMark={false} className="font-sans text-foreground" /> data: openFDA food enforcement API · USDA FSIS recalls · USDA Local Food Directories ·
                FDA CORE outbreak table · CDC investigations
                {import.meta.env.VITE_MAPBOX_TOKEN ? " · Mapbox (location search & maps)" : ""}. If you are ill, contact a healthcare provider.
              </p>
            </div>
          </footer>

          <ChatWidget />
        </div>
      </ZipProvider>
    </BrowserRouter>
  );
}
