export function PageHeader({
  title,
  eyebrow,
  action
}: {
  title: string;
  eyebrow?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="topbar">
      <div>
        {eyebrow ? <div className="badge">{eyebrow}</div> : null}
        <h1 className="page-title" style={{ marginTop: eyebrow ? 10 : 0 }}>
          {title}
        </h1>
      </div>
      {action}
    </div>
  );
}
