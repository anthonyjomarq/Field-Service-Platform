import React, { useState } from "react";

import { useAuth } from "../../contexts/AuthContext";

import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

export const Layout = ({ children }) => {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div
      className={`app-layout ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`}
    >
      <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      <Sidebar isOpen={sidebarOpen} user={user} />
      <main className="app-content">{children}</main>
    </div>
  );
};
