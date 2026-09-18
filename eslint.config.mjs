import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),

  // A DAL e a unica porta para o banco. Esta regra nao e usada como portao
  // de verificacao (decisao do cliente: sem lint), mas o editor a mostra
  // inline e ela documenta a fronteira de forma executavel.
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/server/dal/_client.ts"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{
          group: ["@supabase/*", "@supabase/**"],
          message:
            "Apenas src/server/dal/_client.ts importa @supabase/*. Use uma funcao da DAL.",
        }],
      }],
    },
  },

  // Componente cliente e hook nunca alcancam codigo de servidor.
  {
    files: ["src/components/**/*.{ts,tsx}", "src/hooks/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{
          group: ["@/server", "@/server/*", "@/server/**"],
          message:
            "Componentes e hooks nao importam src/server. Receba dados por props ou chame uma server action.",
        }],
      }],
    },
  },
]);

export default eslintConfig;
