"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Bell, CalendarClock, ChevronRight, ExternalLink, Headphones, Info, Sparkles } from "lucide-react";
import { appRoutes } from "@/lib/navigation/routes";
import { hasPermission } from "@/lib/permissions/permissions";
import { defaultWelcomeContent, type WelcomeContent } from "@/lib/constants/welcome-data";

type StoredUser = {
  name?: string;
  email?: string;
  role?: string;
  permissions?: string[];
};

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "full",
    timeStyle: "medium"
  }).format(date);
}

export function WelcomePortal() {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [content, setContent] = useState<WelcomeContent>(defaultWelcomeContent);

  useEffect(() => {
    const raw = localStorage.getItem("sisapec_user");
    setUser(raw ? JSON.parse(raw) : null);
  }, []);

  useEffect(() => {
    fetch("/config/welcome-content.json", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: WelcomeContent | null) => {
        if (data?.highlights?.length) setContent(data);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const shortcuts = useMemo(() => {
    const permissions = user?.permissions ?? [];
    return appRoutes
      .filter((item) => item.href !== "/welcome" && hasPermission(permissions, item.permission))
      .slice(0, 8);
  }, [user]);

  const canViewDashboard = hasPermission(user?.permissions ?? [], "dashboard.view");
  const firstName = user?.name?.trim().split(/\s+/)[0] || "usuario";

  return (
    <div className="grid">
      <section className="card welcome-hero" aria-labelledby="welcome-title">
        <div>
          <span className="badge">
            <Sparkles size={15} aria-hidden="true" />
            Portal inicial
          </span>
          <h1 className="page-title" id="welcome-title">Boas-Vindas, {firstName}</h1>
          <p className="muted welcome-intro">
            Este e o ponto de entrada do QualiSaude Hospitalar para apoiar auditorias, registros de conformidade,
            acompanhamento de acoes e consulta aos indicadores institucionais.
          </p>
        </div>
        <div className="welcome-clock" aria-label="Data e hora atual">
          <CalendarClock size={22} aria-hidden="true" />
          <strong>{formatDateTime(now)}</strong>
          <span>{user?.role ? `Perfil: ${user.role}` : "Sessao ativa"}</span>
        </div>
      </section>

      <section className="card" aria-labelledby="quick-access-title">
        <div className="section-heading">
          <div>
            <span className="badge">Acesso rapido</span>
            <h2 className="section-title" id="quick-access-title">Modulos disponiveis</h2>
          </div>
          {canViewDashboard ? <Link className="button secondary" href="/dashboard">Abrir Dashboard</Link> : null}
        </div>
        <div className="quick-access-grid">
          {shortcuts.map((item) => {
            const Icon = item.icon;
            return (
              <Link className="quick-access-card" href={item.href} key={item.href}>
                <span className="badge">
                  <Icon size={16} aria-hidden="true" />
                </span>
                <strong>{item.label}</strong>
                <ChevronRight size={18} aria-hidden="true" />
              </Link>
            );
          })}
          {!shortcuts.length ? <p className="muted">Nenhum modulo disponivel para este perfil no momento.</p> : null}
        </div>
      </section>

      <div className="grid grid-2">
        <section className="card" aria-labelledby="features-title">
          <span className="badge">
            <Info size={15} aria-hidden="true" />
            Funcionalidades
          </span>
          <h2 className="section-title" id="features-title">Resumo do sistema</h2>
          <div className="grid">
            {content.highlights.map((item) => (
              <div className="welcome-list-item" key={item}>
                <span aria-hidden="true" />
                <p>{item}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="card" aria-labelledby="announcements-title">
          <span className="badge">
            <Bell size={15} aria-hidden="true" />
            Comunicados
          </span>
          <h2 className="section-title" id="announcements-title">Avisos institucionais</h2>
          <div className="grid">
            {content.announcements.map((item) => (
              <article className="welcome-announcement" key={item.title}>
                <strong>{item.title}</strong>
                <p className="muted">{item.description}</p>
              </article>
            ))}
            {content.administrativeMessages?.map((item) => (
              <article className="welcome-announcement" key={item.title}>
                <strong>{item.title}</strong>
                <p className="muted">{item.description}</p>
              </article>
            ))}
          </div>
        </section>
      </div>

      <div className="grid grid-2">
        <section className="card" aria-labelledby="support-title">
          <span className="badge">
            <Headphones size={15} aria-hidden="true" />
            Suporte
          </span>
          <h2 className="section-title" id="support-title">Contato e apoio</h2>
          <div className="grid">
            {content.supportContacts.map((item) => (
              <article className="support-card" key={item.label}>
                <div className="muted">{item.label}</div>
                <strong>{item.value}</strong>
              </article>
            ))}
          </div>
        </section>

        <section className="card" aria-labelledby="useful-links-title">
          <span className="badge">
            <ExternalLink size={15} aria-hidden="true" />
            Links
          </span>
          <h2 className="section-title" id="useful-links-title">Links uteis</h2>
          <div className="grid">
            {content.usefulLinks?.length ? (
              content.usefulLinks.map((item) => (
                <a className="welcome-announcement" href={item.href} key={item.href}>
                  <strong>{item.label}</strong>
                  {item.description ? <p className="muted">{item.description}</p> : null}
                </a>
              ))
            ) : (
              <p className="muted">Area preparada para publicacao de links institucionais.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
