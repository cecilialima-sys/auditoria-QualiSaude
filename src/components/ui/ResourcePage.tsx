import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";

export type ResourceColumn<T> = {
  key: keyof T;
  label: string;
};

export function ResourcePage<T extends Record<string, string | number>>({
  title,
  eyebrow,
  description,
  columns,
  rows,
  actionLabel
}: {
  title: string;
  eyebrow: string;
  description: string;
  columns: ResourceColumn<T>[];
  rows: T[];
  actionLabel?: string;
}) {
  return (
    <AppShell>
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        action={actionLabel ? <button className="button">{actionLabel}</button> : undefined}
      />
      <div className="card" style={{ marginBottom: 16 }}>
        <p className="muted" style={{ margin: 0 }}>
          {description}
        </p>
      </div>
      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={String(column.key)}>{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row, index) => (
                <tr key={index}>
                  {columns.map((column) => (
                    <td key={String(column.key)}>{row[column.key]}</td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td className="muted" colSpan={columns.length}>
                  Nenhum registro cadastrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
