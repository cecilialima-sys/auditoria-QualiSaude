import { ShieldCheck } from "lucide-react";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <main className="login-page sisapec-gradient">
      <section className="login-card">
        <div className="login-hero sisapec-gradient">
          <div className="login-logo-wrap" style={{ marginBottom: 22 }}>
            <img className="login-logo" src="/qualisaude-logo.png" alt="QualiSaúde Hospitalar" />
          </div>
          <h1 style={{ fontSize: "2.8rem", lineHeight: 1.02, margin: "0 0 16px" }}>
            QualiSaúde
          </h1>
          <p style={{ fontSize: "1.08rem", lineHeight: 1.6, opacity: 0.9 }}>
            Controle assistencial, qualidade hospitalar e melhoria contínua em uma plataforma segura para auditorias por setor.
          </p>
          <div className="grid grid-3" style={{ marginTop: 28 }}>
            {["Segurança", "Qualidade", "Indicadores"].map((item) => (
              <div className="badge" key={item} style={{ background: "rgba(255,255,255,.16)", color: "white" }}>
                <ShieldCheck size={14} />
                {item}
              </div>
            ))}
          </div>
        </div>
        <div className="login-form">
          <div className="badge">QualiSaúde Hospitalar</div>
          <h2 style={{ fontSize: "2rem", marginBottom: 8 }}>Acessar sistema</h2>
          <p className="muted">
            Apenas usuários autenticados acessam o sistema. O ADMIN principal deve trocar a senha inicial no primeiro acesso.
          </p>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}

