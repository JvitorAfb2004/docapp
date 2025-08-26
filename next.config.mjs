/** @type {import('next').NextConfig} */
const nextConfig = {

  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      
      config.devServer = {
        ...config.devServer,
       
        client: {
          webSocketURL: {
            pathname: '/_next/webpack-hmr'
          }
        }
      };
    }
    return config;
  },
  
};

export default nextConfig;
