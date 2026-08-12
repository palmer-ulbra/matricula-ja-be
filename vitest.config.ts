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
  },
});
