"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { roleLabels } from "@/lib/permissions/permissions";

type User = {
  id: string;
  name: string;
  email: string;
  role: keyof typeof roleLabels;
  active: boolean;
  isPrimaryAdmin: boolean;
};

export function UserDirectory() {
  const [users, setUsers] = useState<User[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("sisapec_token");
    fetch("/api/admin/users", {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error ?? "Nao foi possivel carregar usuarios.");
        setUsers(data.users ?? []);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return users;
    return users.filter((user) =>
      [user.name, user.email, user.role, user.active ? "ativo" : "inativo"].some((value) =>
        value.toLowerCase().includes(normalized)
      )
    );
  }, [query, users]);

  return (
    <div className="grid">
      <section className="card">
        <p className="muted" style={{ margin: 0 }}>
          Os usuarios cadastrados no gerenciamento de acessos aparecem aqui automaticamente.
        </p>
      </section>

      <section className="card">
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14 }}>
          <Search size={18} />
          <input
            className="input"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nome, e-mail, perfil ou status"
            value={query}
          />
        </div>

        {error ? <div className="badge danger">{error}</div> : null}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Perfil</th>
                <th>Status</th>
                <th>Tipo</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="muted" colSpan={5}>
                    Carregando usuarios...
                  </td>
                </tr>
              ) : filteredUsers.length ? (
                filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>{roleLabels[user.role] ?? user.role}</td>
                    <td>
                      <span className={`badge ${user.active ? "success" : "danger"}`}>
                        {user.active ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td>{user.isPrimaryAdmin ? "ADMIN principal" : "Usuario"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="muted" colSpan={5}>
                    Nenhum usuario encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
