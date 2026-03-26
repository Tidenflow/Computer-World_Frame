import app from './app';

const PORT = process.env.PORT ?? 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Auth API: POST /api/auth/register');
  console.log('Auth API: POST /api/auth/login');
  console.log('Progress API: GET /api/users/:userId/progress');
  console.log('Progress API: PUT /api/users/:userId/progress');
});
