import "./index.css";
import "@fontsource/inter/latin.css";

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

import { AuthProvider }    from "./context/AuthContext";
import { InvoiceProvider } from "./context/InvoiceContext";
import { ThemeProvider }   from "./context/ThemeContext";
import { JobLogProvider } from "./context/JobLogContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <InvoiceProvider>
          <JobLogProvider>
            <App />
          </JobLogProvider>
        </InvoiceProvider>
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);
