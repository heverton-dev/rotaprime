#!/usr/bin/env python3
"""Quality Gate: regras de seguranca especificas do RotaPrime (Lovable + Supabase).

Regras deterministicas (sem LLM), cada uma nascida de um problema real
registado em POSTMORTEM.md:
  R1 nenhum ficheiro .env* versionado no git (exceto .env.example);
  R2 .env.example existe (modelo das variaveis);
  R3 SUPABASE_SERVICE_ROLE_KEY so aparece em src/**/*.server.ts e nunca como VITE_*;
  R4 toda tabela criada nas migrations tem RLS ativo;
  R5 migrations nao criam utilizadores com senha (crypt/encrypted_password);
  R6 user_roles nunca recebe INSERT/UPDATE/DELETE para anon/authenticated.

Uso: `python gates/G_SEGURANCA_ROTAPRIME.py [repo_root]`
Saida: exit 0 (todas as regras cumpridas) ou exit 1.
"""

from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

SERVICE_ROLE = "SUPABASE_SERVICE_ROLE_KEY"
FONTES = ("*.ts", "*.tsx", "*.js", "*.jsx")

# Migration historica ja aplicada no Lovable Cloud e ja publicada no git (nao se
# reescreve historico). As senhas dela TEM de ser trocadas; ver POSTMORTEM.md PM-02.
MIGRATIONS_COM_SENHA_HISTORICAS = {
    "20260925174826_daee476e-f545-478c-b2a0-8e131b1451ec.sql",
}

RE_CREATE = re.compile(r"CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.(\w+)", re.I)
RE_RLS = re.compile(r"ALTER\s+TABLE\s+(?:ONLY\s+)?public\.(\w+)\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY", re.I)
RE_SENHA = re.compile(r"\bcrypt\s*\(|\bencrypted_password\b", re.I)
RE_GRANT_ROLES = re.compile(
    r"GRANT\s+[^;]*\b(INSERT|UPDATE|DELETE|ALL)\b[^;]*\bON\s+(?:TABLE\s+)?public\.user_roles\s+TO\s+[^;]*\b(anon|authenticated|public)\b",
    re.I,
)


def _ficheiros_env_versionados(root: Path) -> list[str]:
    try:
        proc = subprocess.run(
            ["git", "-C", str(root), "ls-files"],
            capture_output=True, text=True, check=False, timeout=60,
        )
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return ["git indisponivel: nao foi possivel verificar .env versionado"]
    if proc.returncode != 0:
        return []
    erros = []
    for linha in proc.stdout.splitlines():
        nome = linha.rsplit("/", 1)[-1]
        if nome.startswith(".env") and nome != ".env.example":
            erros.append(f"R1: '{linha}' esta versionado no git (use git rm --cached)")
    return erros


def _service_role(root: Path) -> list[str]:
    erros = []
    src = root / "src"
    if src.is_dir():
        for padrao in FONTES:
            for caminho in src.rglob(padrao):
                texto = caminho.read_text(encoding="utf-8", errors="replace")
                rel = caminho.relative_to(root).as_posix()
                if f"VITE_{SERVICE_ROLE}" in texto:
                    erros.append(f"R3: {rel} expoe VITE_{SERVICE_ROLE} ao browser")
                elif SERVICE_ROLE in texto and not caminho.name.endswith(".server.ts"):
                    erros.append(f"R3: {rel} usa {SERVICE_ROLE} fora de um ficheiro *.server.ts")
    exemplo = root / ".env.example"
    if exemplo.is_file() and f"VITE_{SERVICE_ROLE}" in exemplo.read_text(encoding="utf-8", errors="replace"):
        erros.append(f"R3: .env.example declara VITE_{SERVICE_ROLE}")
    return erros


def _migrations(root: Path) -> list[str]:
    pasta = root / "supabase" / "migrations"
    if not pasta.is_dir():
        return []
    erros = []
    criadas: dict[str, str] = {}
    com_rls: set[str] = set()
    for caminho in sorted(pasta.glob("*.sql")):
        sql = caminho.read_text(encoding="utf-8", errors="replace")
        for tabela in RE_CREATE.findall(sql):
            criadas.setdefault(tabela, caminho.name)
        com_rls.update(RE_RLS.findall(sql))
        if RE_SENHA.search(sql) and caminho.name not in MIGRATIONS_COM_SENHA_HISTORICAS:
            erros.append(f"R5: {caminho.name} define senha de utilizador numa migration")
        if RE_GRANT_ROLES.search(sql):
            erros.append(f"R6: {caminho.name} concede escrita em public.user_roles a anon/authenticated")
    for tabela, origem in sorted(criadas.items()):
        if tabela not in com_rls:
            erros.append(f"R4: public.{tabela} ({origem}) sem ENABLE ROW LEVEL SECURITY")
    return erros


def scan(root: Path) -> list[str]:
    erros = _ficheiros_env_versionados(root)
    if not (root / ".env.example").is_file():
        erros.append("R2: .env.example ausente")
    erros += _service_role(root)
    erros += _migrations(root)
    return erros


def main(argv: list[str] | None = None) -> int:
    argv = sys.argv[1:] if argv is None else argv
    root = Path(argv[0]).resolve() if argv else Path.cwd()
    erros = scan(root)
    for erro in erros:
        print(f"[G_SEGURANCA_ROTAPRIME] {erro}")
    if erros:
        return 1
    print("[G_SEGURANCA_ROTAPRIME] R1-R6 cumpridas")
    return 0


if __name__ == "__main__":
    sys.exit(main())
