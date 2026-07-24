import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// build-bust 2026-07-24: force new chunk hash after a partial publish left a cached 404 on the old chunk URL
