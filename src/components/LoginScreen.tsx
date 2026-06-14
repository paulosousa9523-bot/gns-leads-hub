import { useState } from "react";
import {
  ALL_LOGIN_NAMES,
  GESTOR_NAME,
  HOSANNA_NAME,
  JURIDICO_NAME,
  JURIDICOS_EXTRAS,
  signInWithName,
  VENDEDORES,
  type Session,
} from "@/lib/auth";

export function LoginScreen({ onLogin }: { onLogin: (s: Session) => void }) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (!name) return setErr("Selecione um nome");
    if (!password) return setErr("Informe a senha");
    setLoading(true);
    const res = await signInWithName(name, password);
    setLoading(false);
    if (!res.ok) return setErr("Usuário ou senha inválidos");
    onLogin(res.session ?? { name, isManager: false });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm bg-surface border border-border rounded-2xl p-6 space-y-5"
      >
        <div className="text-center space-y-1">
          <div className="inline-block px-3 py-1 rounded-full bg-primary/15 text-primary text-xs font-semibold tracking-wider">
            GNS LEADS
          </div>
          <h1 className="text-2xl font-bold mt-3">Grupo Nascimento e Souza</h1>
          <p className="text-sm text-muted-foreground">CRM de leads — WhatsApp</p>
        </div>

        <div className="space-y-2">
          <label className="text-xs uppercase tracking-wider text-muted-foreground">
            Quem está entrando?
          </label>
          <select
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setErr("");
            }}
            className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary"
          >
            <option value="">Selecione...</option>
            <optgroup label="Vendedores">
              {VENDEDORES.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </optgroup>
            <optgroup label="Gestão">
              <option value={GESTOR_NAME}>{GESTOR_NAME}</option>
              <option value={JURIDICO_NAME}>{JURIDICO_NAME}</option>
              <option value={HOSANNA_NAME}>{HOSANNA_NAME}</option>
            </optgroup>
          </select>
        </div>

        {ALL_LOGIN_NAMES.includes(name) && (
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-muted-foreground">
              Senha
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>
        )}

        {err && <div className="text-sm text-danger">{err}</div>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-primary-foreground font-semibold rounded-lg py-2.5 hover:opacity-90 transition disabled:opacity-50"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
