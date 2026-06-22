"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { LogOut, Menu, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { appRoutes, mainFallbackRoutes } from "@/lib/navigation/routes";
import { hasPermission } from "@/lib/permissions/permissions";

type StoredUser = {
  role?: string;
  permissions?: string[];
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const desktopOpenButtonRef = useRef<HTMLButtonElement>(null);
  const desktopCloseButtonRef = useRef<HTMLButtonElement>(null);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileCloseButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const raw = localStorage.getItem("sisapec_user");
    setUser(raw ? JSON.parse(raw) : null);
    setSidebarCollapsed(localStorage.getItem("qualisaude_sidebar_collapsed") === "true");
  }, []);

  useEffect(() => {
    if (!mobileSidebarOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    mobileCloseButtonRef.current?.focus();

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileSidebarOpen(false);
        window.requestAnimationFrame(() => mobileMenuButtonRef.current?.focus());
      }
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [mobileSidebarOpen]);

  const visibleItems = useMemo(() => {
    if (!user) return appRoutes.filter((item) => mainFallbackRoutes.includes(item.href));
    return appRoutes.filter((item) => hasPermission(user.permissions, item.permission));
  }, [user]);

  const mobileItems = visibleItems.slice(0, 5);

  function setDesktopSidebarCollapsed(collapsed: boolean) {
    setSidebarCollapsed(collapsed);
    localStorage.setItem("qualisaude_sidebar_collapsed", String(collapsed));
  }

  function closeDesktopSidebar() {
    setDesktopSidebarCollapsed(true);
    window.requestAnimationFrame(() => desktopOpenButtonRef.current?.focus());
  }

  function openDesktopSidebar() {
    setDesktopSidebarCollapsed(false);
    window.requestAnimationFrame(() => desktopCloseButtonRef.current?.focus());
  }

  function closeMobileSidebar() {
    if (!mobileSidebarOpen) return;
    setMobileSidebarOpen(false);
    window.requestAnimationFrame(() => mobileMenuButtonRef.current?.focus());
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    localStorage.removeItem("sisapec_user");
    localStorage.removeItem("sisapec_token");
    window.location.href = "/login";
  }

  return (
    <>
      <header className="mobile-nav sisapec-gradient">
        <div className="mobile-nav-start">
          <button
            aria-controls="main-sidebar"
            aria-expanded={mobileSidebarOpen}
            aria-label="Abrir menu lateral"
            className="sidebar-icon-button mobile-menu-button"
            onClick={() => setMobileSidebarOpen(true)}
            ref={mobileMenuButtonRef}
            type="button"
          >
            <Menu size={21} aria-hidden="true" />
          </button>
          <div className="mobile-brand">
            <img src="/qualisaude-logo-white-bg.png" alt="QualiSaúde" />
            <strong>QualiSaúde</strong>
          </div>
        </div>
        <button className="button secondary" onClick={logout} type="button">
          Sair
        </button>
      </header>
      <div className={`app-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
        <aside
          className={`sidebar sisapec-gradient ${mobileSidebarOpen ? "mobile-sidebar-open" : ""}`}
          aria-label="Menu lateral"
          id="main-sidebar"
        >
          <button
            aria-label="Fechar menu lateral"
            className="sidebar-icon-button desktop-sidebar-close"
            onClick={closeDesktopSidebar}
            ref={desktopCloseButtonRef}
            type="button"
          >
            <PanelLeftClose size={20} aria-hidden="true" />
          </button>
          <button
            aria-label="Fechar menu lateral"
            className="sidebar-icon-button mobile-sidebar-close"
            onClick={closeMobileSidebar}
            ref={mobileCloseButtonRef}
            type="button"
          >
            <X size={21} aria-hidden="true" />
          </button>
          <div className="brand">
            <div className="brand-logo">
              <img src="/qualisaude-logo-white-bg.png" alt="QualiSaúde Hospitalar" />
            </div>
            <div>
              <strong>QualiSaúde</strong>
              <div style={{ fontSize: 13, opacity: 0.82 }}>Auditoria Hospitalar</div>
            </div>
          </div>
          <div className="sidebar-scroll">
            <nav className="nav-list" aria-label="Navegação principal">
              {visibleItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link className="nav-item" href={item.href} key={item.href} onClick={closeMobileSidebar}>
                    <Icon size={18} aria-hidden="true" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="sidebar-footer">
            <button className="nav-item logout-button" onClick={logout} type="button">
              <LogOut size={18} aria-hidden="true" />
              Sair
            </button>
          </div>
        </aside>
        {sidebarCollapsed ? (
          <button
            aria-controls="main-sidebar"
            aria-label="Abrir menu lateral"
            className="sidebar-icon-button desktop-sidebar-open"
            onClick={openDesktopSidebar}
            ref={desktopOpenButtonRef}
            type="button"
          >
            <PanelLeftOpen size={21} aria-hidden="true" />
          </button>
        ) : null}
        <main className="main">{children}</main>
      </div>
      {mobileSidebarOpen ? (
        <button aria-label="Fechar menu lateral" className="sidebar-backdrop" onClick={closeMobileSidebar} type="button" />
      ) : null}
      <nav className="bottom-nav" aria-label="Navegação mobile">
        {mobileItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link href={item.href} key={item.href}>
              <Icon size={19} aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}

