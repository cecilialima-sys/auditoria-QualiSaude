"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ChangePasswordForm() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = localStorage.getItem("sisapec_token");
    const response = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ currentPassword, newPassword })
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Erro ao alterar senha.");
      return;
    }
    localStorage.setItem("sisapec_user", JSON.stringify(data.user));
    localStorage.setItem("sisapec_token", data.token);
    router.push("/admin/access-control");
  }

  return (
    <form className="card grid" onSubmit={submit}>
      <p className="muted">
        Por segurança, altere a senha inicial antes de acessar o painel administrativo.
      </p>
      <div className="field">
        <label>Senha atual</label>
        <input className="input" onChange={(event) => setCurrentPassword(event.target.value)} required type="password" value={currentPassword} />
      </div>
      <div className="field">
        <label>Nova senha</label>
        <input className="input" minLength={8} onChange={(event) => setNewPassword(event.target.value)} required type="password" value={newPassword} />
      </div>
      {error ? <span className="badge danger">{error}</span> : null}
      <button className="button" type="submit">Alterar senha e liberar painel</button>
    </form>
  );
}
