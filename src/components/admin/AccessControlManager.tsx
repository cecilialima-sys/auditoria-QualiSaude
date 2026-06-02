"use client";

import { useEffect, useMemo, useState } from "react";
import { KeyRound, Power, RotateCcw, Search } from "lucide-react";
import { roleLabels } from "@/lib/permissions/permissions";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  isPrimaryAdmin: boolean;
  permissions: string[];
};

type Permission = {
  key: string;
  label: string;
  module: string;
};

type AdminLog = {
  id: string;
  actorEmail: string;
  targetEmail: string;
  action: string;
  createdAt: string;
};

export function AccessControlManager() {
  const [users, setUsers] = useState<User[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  const selectedUser = users.find((user) => user.id === selectedId) ?? users[0];

  useEffect(() => {
    const token = localStorage.getItem("sisapec_token");
    fetch("/api/admin/access-control", { headers: { Authorization: `Bearer ${token}` } })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Acesso negado.");
        setUsers(data.users);
        setPermissions(data.permissions);
        setLogs(data.logs);
        setSelectedId(data.users[0]?.id ?? "");
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  const filteredUsers = useMemo(() => {
    const normalized = query.toLowerCase();
    return users.filter((user) =>
      [user.name, user.email, user.role].some((value) => value.toLowerCase().includes(normalized))
    );
  }, [query, users]);

  async function patchPermissions(user: User, nextPermissions: string[]) {
    const token = localStorage.getItem("sisapec_token");
    const response = await fetch(`/api/admin/users/${user.id}/permissions`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ permissions: nextPermissions })
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error);
      return;
    }
    setUsers((current) => current.map((item) => (item.id === user.id ? data.user : item)));
    setError("");
  }

  async function toggleActive(user: User) {
    const token = localStorage.getItem("sisapec_token");
    const response = await fetch(`/api/admin/users/${user.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ active: !user.active })
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error);
      return;
    }
    setUsers((current) => current.map((item) => (item.id === user.id ? data.user : item)));
  }

  async function createUser() {
    const name = window.prompt("Nome do novo usuario");
    const email = window.prompt("E-mail do novo usuario");
    const password = window.prompt("Senha inicial temporaria");
    if (!name || !email || !password) return;
    const token = localStorage.getItem("sisapec_token");
    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name, email, password, role: "USUARIO_COMUM" })
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error);
      return;
    }
    setUsers((current) => [...current, data.user]);
    setSelectedId(data.user.id);
  }

  async function updateRole(user: User, role: string) {
    const token = localStorage.getItem("sisapec_token");
    const response = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ role })
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error);
      return;
    }
    setUsers((current) => current.map((item) => (item.id === user.id ? data.user : item)));
  }

  async function deleteUser(user: User) {
    if (!window.confirm(`Excluir ${user.name}?`)) return;
    const token = localStorage.getItem("sisapec_token");
    const response = await fetch(`/api/admin/users/${user.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error);
      return;
    }
    setUsers((current) => current.filter((item) => item.id !== user.id));
    setSelectedId("");
  }

  async function resetPassword(user: User) {
    const password = window.prompt("Nova senha temporaria com pelo menos 8 caracteres");
    if (!password) return;
    const token = localStorage.getItem("sisapec_token");
    const response = await fetch(`/api/admin/users/${user.id}/reset-password`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ password })
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error);
      return;
    }
    setUsers((current) => current.map((item) => (item.id === user.id ? data.user : item)));
  }

  function togglePermission(permissionKey: string) {
    if (!selectedUser) return;
    const enabled = selectedUser.permissions.includes(permissionKey);
    const next = enabled
      ? selectedUser.permissions.filter((permission) => permission !== permissionKey)
      : [...selectedUser.permissions, permissionKey];
    patchPermissions(selectedUser, next);
  }

  if (error && !users.length) {
    return <div className="card"><span className="badge danger">{error}</span></div>;
  }

  return (
    <div className="grid grid-2">
      <section className="card">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 14 }}>
          <span className="badge">Usuarios cadastrados</span>
          <button className="button" onClick={createUser} type="button">Novo usuario</button>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14 }}>
          <Search size={18} />
          <input className="input" onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nome, e-mail ou função" value={query} />
        </div>
        <div className="grid">
          {filteredUsers.map((user) => (
            <button
              className="card"
              key={user.id}
              onClick={() => setSelectedId(user.id)}
              style={{ borderColor: selectedUser?.id === user.id ? "#0f78b8" : undefined, cursor: "pointer", textAlign: "left" }}
              type="button"
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <strong>{user.name}</strong>
                  <div className="muted">{user.email}</div>
                </div>
                <span className={`badge ${user.active ? "success" : "danger"}`}>{user.active ? "Ativo" : "Inativo"}</span>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                <span className="badge">{user.role}</span>
                {user.isPrimaryAdmin ? <span className="badge warning">ADMIN principal</span> : null}
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        {selectedUser ? (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
              <div>
                <span className="badge"><KeyRound size={14} /> Controle individual</span>
                <h2>{selectedUser.name}</h2>
                <p className="muted">{selectedUser.email}</p>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <select
                  className="input"
                  disabled={selectedUser.isPrimaryAdmin}
                  onChange={(event) => updateRole(selectedUser, event.target.value)}
                  style={{ width: 190 }}
                  value={selectedUser.role}
                >
                  {Object.keys(roleLabels).map((role) => (
                    <option key={role} value={role}>
                      {roleLabels[role as keyof typeof roleLabels]}
                    </option>
                  ))}
                </select>
                <button className="button secondary" disabled={selectedUser.isPrimaryAdmin} onClick={() => toggleActive(selectedUser)} type="button">
                  <Power size={16} />
                  {selectedUser.active ? "Desativar" : "Ativar"}
                </button>
                <button className="button secondary" disabled={selectedUser.isPrimaryAdmin} onClick={() => resetPassword(selectedUser)} type="button">
                  <RotateCcw size={16} />
                  Redefinir senha
                </button>
                <button className="button secondary" disabled={selectedUser.isPrimaryAdmin} onClick={() => deleteUser(selectedUser)} type="button">
                  Excluir
                </button>
              </div>
            </div>
            {error ? <div className="badge danger">{error}</div> : null}
            <div className="grid" style={{ marginTop: 16 }}>
              {permissions.map((permission) => {
                const checked = selectedUser.permissions.includes(permission.key);
                return (
                  <label className="card" key={permission.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                    <span>
                      <strong>{permission.label}</strong>
                      <div className="muted">{permission.module} · {permission.key}</div>
                    </span>
                    <input
                      checked={checked}
                      disabled={selectedUser.isPrimaryAdmin}
                      onChange={() => togglePermission(permission.key)}
                      style={{ width: 22, height: 22 }}
                      type="checkbox"
                    />
                  </label>
                );
              })}
            </div>
          </>
        ) : (
          <p className="muted">Selecione um usuário para editar permissões.</p>
        )}
      </section>

      <section className="card" style={{ gridColumn: "1 / -1" }}>
        <h3>Logs administrativos</h3>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Data</th><th>ADMIN</th><th>Usuário alterado</th><th>Ação</th></tr></thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{new Date(log.createdAt).toLocaleString("pt-BR")}</td>
                  <td>{log.actorEmail}</td>
                  <td>{log.targetEmail}</td>
                  <td>{log.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
