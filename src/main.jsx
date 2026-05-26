import { Analytics } from "@vercel/analytics/react";
import React, { useState, useEffect, lazy, Suspense } from "react";
import ReactDOM from "react-dom/client";
import "./styles/globals.css";

const App       = lazy(() => import("./App"));
const WidgetApp = lazy(() => import("./WidgetApp"));

const Loader = () => <div style={{ minHeight:"100vh", background:"#080d08" }}/>;

function Root() {
  const [hash, setHash] = useState(() => {
    // On first load, never start on #/widget — clear it so app opens normally
    const h = window.location.hash;
    if (h === "#/widget" || h === "#/widget/") {
      window.location.hash = "";
      return "";
    }
    return h;
  });

  useEffect(() => {
    const onHash = () => setHash(window.location.hash);
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // #/widget is only valid when loaded by Electron's widget window, not by the user
  if ((hash === "#/widget" || hash === "#/widget/") && window.electron) {
    return <Suspense fallback={<Loader/>}><WidgetApp/></Suspense>;
  }
  return (
    <Suspense fallback={<Loader/>}>
      <App/>
      <Analytics/>
    </Suspense>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Root/>
  </React.StrictMode>
);