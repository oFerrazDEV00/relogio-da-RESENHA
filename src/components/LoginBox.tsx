"use client";

import { useState } from "react";
import { Lock, LogIn } from "lucide-react";

const VALID_USER = "resenha";
const VALID_PASS = "absoluta";

export default function LoginBox({
  variant,
  onSuccess,
  onClose,
}: {
  variant: "mobile" | "modal";
  onSuccess: () => void;
  onClose?: () => void;
}) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    window.setTimeout(() => {
      if (user.trim() === VALID_USER && pass === VALID_PASS) {
        onSuccess();
      } else {
        setError("Usuário ou senha incorretos.");
      }
      setLoading(false);
    }, 250);
  }

  const box = (
    <div className="w-full max-w-[340px] rounded-[10px] border border-[#b3b3b3] bg-white px-6 py-7 shadow-[0_10px_40px_rgba(0,0,0,0.18)]">
      <div className="mb-5 flex items-center justify-center gap-2 text-[#222]">
        <Lock size={20} />
        <h2 className="text-[19px] font-bold">Área restrita</h2>
      </div>

      <form onSubmit={submit} className="space-y-4 text-left">
        <div>
          <label className="mb-1 block text-[13px] font-bold text-[#333]">
            Usuário
          </label>
          <input
            type="text"
            value={user}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            onChange={(event) => setUser(event.target.value)}
            placeholder="Digite o usuário"
            className="w-full rounded-[6px] border border-[#999] px-3 py-[10px] text-[15px] text-[#222] outline-none transition focus:border-[#1a1a1a] focus:ring-2 focus:ring-[#222]/15"
          />
        </div>

        <div>
          <label className="mb-1 block text-[13px] font-bold text-[#333]">
            Senha
          </label>
          <input
            type="password"
            value={pass}
            autoComplete="current-password"
            onChange={(event) => setPass(event.target.value)}
            placeholder="Digite a senha"
            className="w-full rounded-[6px] border border-[#999] px-3 py-[10px] text-[15px] text-[#222] outline-none transition focus:border-[#1a1a1a] focus:ring-2 focus:ring-[#222]/15"
          />
        </div>

        {error ? (
          <p className="rounded-[6px] bg-[#fff2f2] px-3 py-2 text-[13px] font-bold text-[#c00]">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-[6px] bg-[#222] px-4 py-[11px] text-[15px] font-bold text-white transition hover:bg-[#000] disabled:opacity-60"
        >
          <LogIn size={17} />
          {loading ? "Verificando..." : "Entrar"}
        </button>
      </form>

      <p className="mt-4 text-center text-[12px] leading-[16px] text-[#888]">
        Acesso exclusivo para abrir o Painel Resenha.
      </p>
    </div>
  );

  if (variant === "mobile") {
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#e6e6e6] px-5">
        {box}
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 px-5"
      onClick={onClose}
    >
      <div onClick={(event) => event.stopPropagation()} className="relative">
        <button
          onClick={onClose}
          className="absolute -right-2 -top-3 flex h-7 w-7 items-center justify-center rounded-full bg-[#222] text-[15px] font-bold text-white"
          aria-label="Fechar"
        >
          ×
        </button>
        {box}
      </div>
    </div>
  );
}
