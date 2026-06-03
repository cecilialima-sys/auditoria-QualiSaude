"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { LogOut } from "lucide-react";
import { appRoutes, mainFallbackRoutes } from "@/lib/navigation/routes";
import { hasPermission } from "@/lib/permissions/permissions";

type StoredUser = {
  role?: string;
  permissions?: string[];
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<StoredUser | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("sisapec_user");
    setUser(raw ? JSON.parse(raw) : null);
  }, []);

  const visibleItems = useMemo(() => {
    if (!user) return appRoutes.filter((item) => mainFallbackRoutes.includes(item.href));
    return appRoutes.filter((item) => hasPermission(user.permissions, item.permission));
  }, [user]);

  const mobileItems = visibleItems.slice(0, 5);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    localStorage.removeItem("sisapec_user");
    localStorage.removeItem("sisapec_token");
    window.location.href = "/login";
  }

  return (
    <>
      <header className="mobile-nav sisapec-gradient">
        <div className="mobile-brand">
          <img src="/qualisaude-logo.png" alt="QualiSaúde" />
          <strong>QualiSaúde</strong>
        </div>
        <button className="button secondary" onClick={logout} type="button">
          Sair
        </button>
      </header>
      <div className="app-shell">
        <aside className="sidebar sisapec-gradient" aria-label="Menu lateral">
          <div className="brand">
            <div className="brand-logo">
              <img src="/qualisaude-logo.png" alt="QualiSaúde Hospitalar" />
            </div>
            <div>
              <strong>QualiSaúde</strong>
              <div style={{ fontSize: 13, opacity: 0.82 }}>Auditoria Hospitalar</div>
            </div>
          </div>
          <nav className="nav-list" aria-label="Navegação principal">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link className="nav-item" href={item.href} key={item.href}>
                  <Icon size={18} aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="sidebar-footer">
            <button className="nav-item logout-button" onClick={logout} type="button">
              <LogOut size={18} aria-hidden="true" />
              Sair
            </button>
          </div>
        </aside>
        <main className="main">{children}</main>
      </div>
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

