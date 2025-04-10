import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import History from "./History";
import Apptest from "./Apptest";
import Historytest from "./Historytest";
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <BrowserRouter>
    <Routes>
      <Route path="/Order" element={<App />} />
      <Route path="/History" element={<History />} />
      <Route path="/Test" element={<Apptest />} />
      <Route path="/HTest" element={<Historytest />} />
    </Routes>
  </BrowserRouter>
);
