export const AUTH_DOMAINS = {
  development: ['localhost', '127.0.0.1'],
  production: [
    // Add your production domains here after deployment
    // Example: 'your-app.vercel.app'
  ],
};

export const getAuthDomains = () => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  return isDevelopment ? AUTH_DOMAINS.development : AUTH_DOMAINS.production;
}; 