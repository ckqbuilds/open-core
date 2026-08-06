import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ZipProvider } from "@/hooks/ZipContext";
import { TopNav } from "@/components/TopNav";
import { ChatWidget } from "@/components/ChatWidget";
import { FoodsPage } from "@/pages/FoodsPage";
import { FoodPage } from "@/pages/FoodPage";
import { OutbreaksPage } from "@/pages/OutbreaksPage";
import { OutbreakPage } from "@/pages/OutbreakPage";
import { RecallsPage } from "@/pages/RecallsPage";
import { ShopLocalPage } from "@/pages/ShopLocalPage";
import { CheckPage } from "@/pages/CheckPage";
import { LearnPage } from "@/pages/LearnPage";

export default function App() {
  return (
    <BrowserRouter>
      <ZipProvider>
        <div className="min-h-screen bg-background">
          <TopNav />

          <main className="container py-6">
            <Routes>
              <Route path="/" element={<FoodsPage />} />
              <Route path="/food/:foodId" element={<FoodPage />} />
              <Route path="/outbreaks" element={<OutbreaksPage />} />
              <Route path="/outbreak/:refId" element={<OutbreakPage />} />
              <Route path="/recalls" element={<RecallsPage />} />
              <Route path="/shop-local" element={<ShopLocalPage />} />
              <Route path="/check" element={<CheckPage />} />
              <Route path="/learn" element={<LearnPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>

          <footer className="mt-8 border-t bg-card/30">
            <div className="container space-y-2 py-6 text-xs text-muted-foreground">
              <p>
                <strong className="text-foreground">Not medical or official guidance.</strong> This
                tool aggregates public FDA and CDC data for convenience. It does not determine that
                any specific store location is unsafe, and it never infers risk from supplier
                relationships — only companies explicitly named in the official record appear, each
                with a citation. Always confirm details against the linked FDA/CDC sources.
              </p>
              <p>
                Data: openFDA food enforcement API · FDA CORE outbreak table · CDC investigations ·
                Mapbox (location search &amp; maps). If you are ill, contact a healthcare provider.
              </p>
            </div>
          </footer>

          <ChatWidget />
        </div>
      </ZipProvider>
    </BrowserRouter>
  );
}
