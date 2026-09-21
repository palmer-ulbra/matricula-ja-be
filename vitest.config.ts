import { defineConfig } from 'vitest/config';

// Um arquivo, três níveis. O filtro de caminho é o que separa:
//   npm test -- tests/unit          → rápido, sem banco
//   npm test -- tests/integration   → precisa de DATABASE_URL com o seed
//   npm test -- tests/api           → idem, e sobe o Express em memória
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    // O nível de integração e o de API compartilham o mesmo banco semeado: rodar em
    // paralelo faria um teste consumir a vaga que o outro espera encontrar.
    fileParallelism: false,
    testTimeout: 15_000,
    // Aula 6. Sem `thresholds` de propósito: transformar cobertura em nota de corte é
    // assunto da Aula 12 (quality gates), e aqui contradiria a tese da aula — o número
    // sozinho não diz se algum comportamento foi verificado.
    coverage: {
      provider: 'v8',
      reporter: ['text'],
      include: ['src/dominio/**'],
    },
  },
});
