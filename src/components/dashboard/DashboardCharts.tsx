"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { monthlyEvolution, nonConformitiesByCategory, sectorRanking } from "@/lib/constants/audit-data";

const colors = ["#0f78b8", "#13b6c8", "#24b47e", "#d97706", "#dc2626"];

function EmptyState() {
  return <p className="muted">Nenhum dado registrado ainda.</p>;
}

export function DashboardCharts() {
  return (
    <div className="grid grid-2">
      <div className="card">
        <h3>Evolução mensal</h3>
        {monthlyEvolution.length ? (
          <div style={{ height: 280, minHeight: 280, minWidth: 0 }}>
            <ResponsiveContainer>
              <LineChart data={monthlyEvolution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#dbe7f0" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="conformidade" stroke="#0f78b8" strokeWidth={3} />
                <Line type="monotone" dataKey="auditorias" stroke="#24b47e" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyState />
        )}
      </div>
      <div className="card">
        <h3>Não conformidades por categoria</h3>
        {nonConformitiesByCategory.length ? (
          <div style={{ height: 280, minHeight: 280, minWidth: 0 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={nonConformitiesByCategory} dataKey="value" nameKey="name" outerRadius={96} label>
                  {nonConformitiesByCategory.map((entry, index) => (
                    <Cell key={entry.name} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyState />
        )}
      </div>
      <div className="card">
        <h3>Ranking de conformidade por setor</h3>
        {sectorRanking.length ? (
          <div style={{ height: 300, minHeight: 300, minWidth: 0 }}>
            <ResponsiveContainer>
              <BarChart data={sectorRanking}>
                <CartesianGrid strokeDasharray="3 3" stroke="#dbe7f0" />
                <XAxis dataKey="sector" interval={0} angle={-16} textAnchor="end" height={70} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="compliance" fill="#13b6c8" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyState />
        )}
      </div>
      <div className="card">
        <h3>Mapa visual de risco</h3>
        {sectorRanking.length ? (
          <div className="grid">
            {sectorRanking.map((sector) => (
              <div key={sector.sector}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <strong>{sector.sector}</strong>
                  <span className={`badge ${sector.risk === "Crítico" ? "danger" : sector.risk === "Alto" ? "warning" : "success"}`}>
                    {sector.risk}
                  </span>
                </div>
                <div className="progress">
                  <span style={{ width: `${sector.compliance}%` }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
}

