import { networkInterfaces } from "node:os";

/** Collect all local network IPs so the dev server accepts cross-origin
 *  requests from LAN, Tailscale, or any non-localhost address. */
function getLocalIPs() {
  const ips = [];
  const interfaces = networkInterfaces();
  for (const addrs of Object.values(interfaces)) {
    for (const addr of addrs) {
      if (!addr.internal) ips.push(addr.address);
    }
  }
  return ips;
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    viewTransition: true,
  },
  allowedDevOrigins: ["local-origin.dev", "*.local-origin.dev", ...getLocalIPs()],
};

export default nextConfig;
