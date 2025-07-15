import "./index.css";
import "@fontsource/inter/latin.css";

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import ToastSetup from "./components/ToastSetup";

import { AuthProvider }    from "./context/AuthContext";
import { InvoiceProvider } from "./context/InvoiceContext";
import { CustomerProvider } from "./context/CustomerContext";
import { VehicleProvider } from "./context/VehicleContext";
import { ThemeProvider }   from "./context/ThemeContext";
import { JobLogProvider } from "./context/JobLogContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <CustomerProvider>
          <VehicleProvider>
            <InvoiceProvider>
              <JobLogProvider>
                <App />
                <ToastSetup />
              </JobLogProvider>
            </InvoiceProvider>
          </VehicleProvider>
        </CustomerProvider>
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);
