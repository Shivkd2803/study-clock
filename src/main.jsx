import { Analytics } from "@vercel/analytics/react";
import React, { useState, useEffect, lazy, Suspense } from "react";
import ReactDOM from "react-dom/client";
import "./styles/globals.css";

const App            = lazy(() => import("./App"));
const AdminDashboard = lazy(() => import("./AdminDashboard"));
const WidgetApp      = lazy(() => import("./WidgetApp"));

const Loader = () => <div style={{ minHeight:"100vh", background:"#080d08" }}/>;

function Root() {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const onHash = () => setHash(window.location.hash);
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  if (hash === "#/admin" || hash === "#/admin/") {
    return <Suspense fallback={<Loader/>}><AdminDashboard/></Suspense>;
  }
  if (hash === "#/widget" || hash === "#/widget/") {
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