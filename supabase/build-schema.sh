#!/usr/bin/env bash
# Gera supabase/schema.sql concatenando as migrations numeradas em ordem.
#
# Existe porque o SQL Editor do Supabase nao guarda estado de migracao: la
# nao ha "aplicar as pendentes", so colar e executar. Um arquivo unico e
# idempotente resolve isso -- roda quantas vezes quiser e converge sempre
# para o mesmo schema.
#
# Uso: bash supabase/build-schema.sh
set -euo pipefail
cd "$(dirname "$0")"

OUT=schema.sql

{
  echo "-- ====================================================================="
  echo "-- SCHEMA COMPLETO — cole este arquivo inteiro no SQL Editor do Supabase."
  echo "--"
  echo "-- GERADO AUTOMATICAMENTE por supabase/build-schema.sh a partir das"
  echo "-- migrations numeradas. Nao edite este arquivo: edite a migration"
  echo "-- correspondente em supabase/migrations/ e rode o script de novo."
  echo "--"
  echo "-- Pode rodar quantas vezes quiser. Tudo aqui e idempotente, entao"
  echo "-- executar de novo nao quebra nada e nao duplica nada: o banco"
  echo "-- converge para este estado, venha de onde vier."
  echo "-- ====================================================================="
  echo ""

  for file in migrations/0*.sql; do
    echo ""
    echo "-- #####################################################################"
    echo "-- ### $(basename "$file")"
    echo "-- #####################################################################"
    echo ""
    cat "$file"
    echo ""
  done
} > "$OUT"

echo "Gerado $OUT a partir de:"
ls -1 migrations/0*.sql
