import app from './app';
import { config } from './config';

app.listen(config.app.port, () => {
  console.log(`Server running on http://localhost:${config.app.port}`);
  console.log('Auth API: POST /api/auth/register');
  console.log('Auth API: POST /api/auth/login');
  console.log('Progress API: GET /api/users/:userId/progress');
  console.log('Progress API: PUT /api/users/:userId/progress');
  console.log('Map API: GET /api/maps/default');
});
