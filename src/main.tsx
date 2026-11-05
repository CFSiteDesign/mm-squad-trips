import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initSaleAccess } from "./lib/black-friday";

// Prices are worked out as pages load, so Black Friday early access has to be known first.
initSaleAccess().finally(() => createRoot(document.getElementById("root")!).render(<App />));

// build-bust 2026-07-24: force new chunk hash after a partial publish left a cached 404 on the old chunk URL
