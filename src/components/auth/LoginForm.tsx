"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, Mail } from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "Não foi possível autenticar.");
      return;
    }

    localStorage.setItem("sisapec_user", JSON.stringify(data.user));
    localStorage.setItem("sisapec_token", data.token);
    router.push(data.user.mustChangePassword ? "/admin/change-password" : "/dashboard");
  }

  return (
    <form className="grid" onSubmit={handleSubmit} style={{ marginTop: 24 }}>
      <div className="field">
        <label htmlFor="email">E-mail</label>
        <div style={{ position: "relative" }}>
          <Mail size={18} style={{ position: "absolute", left: 12, top: 12, color: "#667085" }} />
          <input className="input" id="email" onChange={(event) => setEmail(event.target.value)} required style={{ paddingLeft: 40 }} value={email} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="password">Senha</label>
        <div style={{ position: "relative" }}>
          <LockKeyhole size={18} style={{ position: "absolute", left: 12, top: 12, color: "#667085" }} />
          <input className="input" id="password" onChange={(event) => setPassword(event.target.value)} required style={{ paddingLeft: 40 }} type="password" value={password} />
        </div>
      </div>
      {error ? <div className="badge danger">{error}</div> : null}
      <button className="button" disabled={loading} type="submit">
        {loading ? "Validando..." : "Entrar com segurança"}
      </button>
    </form>
  );
}
