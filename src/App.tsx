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
        <div className="min-h-screen bg-ground">
          <a
            href="#main"
            className="capsule capsule--sun sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:left-3 focus-visible:top-3 focus-visible:z-50"
          >
            Skip to content
          </a>
          <TopNav />

          <main id="main" className="container py-8 sm:py-10">
            <Routes>
              <Route path="/" element={<FoodsPage />} />
              <Route path="/food/:foodId" element={<FoodPage />} />
              <Route path="/outbreaks" element={<OutbreaksPage />} />
              <Route path="/outbreak/:refId" element={<OutbreakPage />} />
              <Route path="/recalls" element={<RecallsPage />} />
              <Route path="/shop-local" element={<ShopLocalPage />} />
              {/* Barcode check lives on the Recalls page; keep old links working. */}
              <Route path="/check" element={<Navigate to="/recalls" replace />} />
              <Route path="/learn" element={<LearnPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>

          {/* The standing disclaimer appears once per page: here. */}
          <footer className="mt-16 border-t-2 border-ink">
            <div className="container grid gap-8 py-10 md:grid-cols-2">
              <div className="space-y-3">
                <Wordmark />
                <p className="prose-measure text-sm text-ink-2">
                  <strong className="text-ink">Not medical or official guidance.</strong> OpenCORE shows
                  what public FDA, CDC and USDA FSIS records say, each with a citation. It never decides
                  that a store is unsafe and never infers risk from supplier relationships; only
                  companies named in the official record appear. Always confirm against the linked
                  sources. If you are ill, contact a healthcare provider.
                </p>
              </div>
              <div className="space-y-3 text-sm">
                <p className="font-bold">Not sure what to do next?</p>
                <ul className="flex flex-wrap gap-2">
                  <li>
                    <Link to="/recalls#check" className="capsule capsule--sm">Check a product barcode</Link>
                  </li>
                  <li>
                    <Link to="/learn" className="capsule capsule--sm">Signs of illness</Link>
                  </li>
                  <li>
                    <Link to="/shop-local" className="capsule capsule--sm">Local food sources</Link>
                  </li>
                </ul>
                <p className="prose-measure text-xs text-ink-2">
                  Data: openFDA food enforcement · USDA FSIS recalls · USDA Local Food Directories · FDA
                  CORE outbreak table · CDC investigations
                  {import.meta.env.VITE_MAPBOX_TOKEN ? " · Mapbox for location search and maps" : ""}.
                </p>
              </div>
            </div>
          </footer>

          <ChatWidget />
        </div>
      </ZipProvider>
    </BrowserRouter>
  );
}
