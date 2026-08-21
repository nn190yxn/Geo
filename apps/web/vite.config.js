import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
export default defineConfig({
    plugins: [react()],
    build: {
        rolldownOptions: {
            output: {
                codeSplitting: {
                    minSize: 20000,
                    groups: [
                        { name: 'react-vendor', test: /node_modules[\\/](react|react-dom|react-router-dom|zustand)/, priority: 30 },
                        { name: 'antd-vendor', test: /node_modules[\\/](@ant-design|antd|rc-|@rc-component)/, priority: 20 },
                        { name: 'query-vendor', test: /node_modules[\\/]@tanstack/, priority: 15 },
                        { name: 'vendor', test: /node_modules/, priority: 10 }
                    ]
                }
            }
        }
    },
    server: {
        allowedHosts: ['.monkeycode-ai.online'],
        proxy: {
            '/api': {
                target: 'http://localhost:3001',
                changeOrigin: true
            }
        }
    }
});
