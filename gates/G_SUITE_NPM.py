#!/usr/bin/env python3
"""Quality Gate: suite JavaScript do RotaPrime (typecheck + lint + testes + build).

O G_TESTES_REAIS do forge so executa pytest; num projeto TypeScript ele passa
sem testar nada. Este gate corre `npm run verificar` e bloqueia o commit se
qualquer etapa falhar.

Uso: `python gates/G_SUITE_NPM.py [repo_root]`
Saida: exit 0 (suite verde) ou exit 1.
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

COMANDO = "npm run verificar"
TIMEOUT_S = 900
LINHAS_FINAIS = 25


def main(argv: list[str] | None = None) -> int:
    argv = sys.argv[1:] if argv is None else argv
    root = Path(argv[0]).resolve() if argv else Path.cwd()
    if not (root / "package.json").is_file():
        print(f"[G_SUITE_NPM] package.json ausente em {root}")
        return 1
    try:
        proc = subprocess.run(
            COMANDO, shell=True, cwd=root, capture_output=True, text=True,
            encoding="utf-8", errors="replace", timeout=TIMEOUT_S, check=False,
        )
    except subprocess.TimeoutExpired:
        print(f"[G_SUITE_NPM] '{COMANDO}' excedeu {TIMEOUT_S}s")
        return 1
    if proc.returncode != 0:
        saida = (proc.stdout + proc.stderr).strip().splitlines()
        print(f"[G_SUITE_NPM] '{COMANDO}' falhou (exit {proc.returncode}):")
        for linha in saida[-LINHAS_FINAIS:]:
            print(f"  {linha}")
        return 1
    print(f"[G_SUITE_NPM] '{COMANDO}' verde (typecheck, lint, testes, build)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
