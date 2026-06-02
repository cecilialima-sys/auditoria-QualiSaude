import type { LucideIcon } from "lucide-react";

export function MetricCard({
  title,
  value,
  detail,
  icon: Icon,
  tone = "default"
}: {
  title: string;
  value: string | number;
  detail: string;
  icon: LucideIcon;
  tone?: "default" | "danger" | "warning" | "success";
}) {
  return (
    <div className="card metric-card">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div className="muted">{title}</div>
        <span className={`badge ${tone === "default" ? "" : tone}`}>
          <Icon size={15} />
        </span>
      </div>
      <div>
        <div className="metric-value">{value}</div>
        <div className="muted">{detail}</div>
      </div>
    </div>
  );
}
