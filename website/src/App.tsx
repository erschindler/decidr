import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import Landing from "./pages/Landing";
import Debate from "./pages/Debate";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/debate/:id" element={<Debate />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
