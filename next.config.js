/** @type {import('next').NextConfig} */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const pkg = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'package.json'), 'utf-8')
)

const { version } = pkg

const nextConfig = {
  reactStrictMode: false,
  output: 'standalone',
  productionBrowserSourceMaps: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  turbopack: {},
  env: {
    NEXT_PUBLIC_APP_VERSION: version,
    NEXT_PUBLIC_CREATED_DATE: new Date().toISOString(),
  },
  webpack: (config, { isServer, webpack }) => {
    if (!isServer) {
      config.devtool = false
      config.plugins.push(
        new webpack.SourceMapDevToolPlugin({
          filename: '[file].map',
          noSources: false,
          module: true,
          columns: true,
        })
      )
    }
    return config
  },
}

export default nextConfig
