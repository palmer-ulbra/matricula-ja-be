import { app } from './app.js';

const porta = Number(process.env.PORT) || 3000;
app.listen(porta, () => {
  console.log(`🎓 MatriculaJá em http://localhost:${porta}/api/v1`);
});
