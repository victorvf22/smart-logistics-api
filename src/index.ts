import dotenv from 'dotenv';
import { app } from './app';

dotenv.config();

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

function startServer(): void {
  app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
    console.log(`Swagger UI available at http://localhost:${PORT}/docs`);
    console.log(`Health check at http://localhost:${PORT}/health`);
  });
}

startServer();
