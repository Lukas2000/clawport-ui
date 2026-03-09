/**
 * Setup detection helpers — extracted from scripts/setup.mjs for testability.
 *
 * These functions detect the user's OpenClaw installation state:
 *   - Workspace directory location
 *   - Gateway auth token from openclaw.json
 *   - HTTP endpoint configuration
 *   - OpenClaw binary on PATH
 *
 * Used by: npm run setup, clawport setup, clawport doctor
 */

import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import { execSync } from 'child_process'

// ── Workspace ─────────────────────────────────────────────────────

/** Detect the default workspace path (~/.openclaw/workspace). */
export function detectWorkspacePath(): string | null {
  const defaultPath = join(homedir(), '.openclaw', 'workspace')
  if (existsSync(defaultPath)) return defaultPath
  return null
}

// ── Binary ────────────────────────────────────────────────────────

/** Find the openclaw binary on PATH, with fallback to known npm global locations. */
export function detectOpenClawBin(): string | null {
  if (process.platform === 'win32') {
    try {
      return execSync('where openclaw', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim()
    } catch { return null }
  }
  // Try which first
  try {
    const result = execSync('which openclaw', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim()
    if (result) return result
  } catch { /* fall through */ }
  // Fallback: known npm global bin locations (nvm, fnm, volta, brew, system)
  const home = homedir()
  const directPaths = [
    join(home, '.volta', 'bin', 'openclaw'),
    '/usr/local/bin/openclaw',
    '/opt/homebrew/bin/openclaw',
    join(home, '.local', 'bin', 'openclaw'),
    join(home, 'bin', 'openclaw'),
  ]
  for (const p of directPaths) {
    if (existsSync(p)) return p
  }
  // Search nvm/fnm versioned node directories
  for (const base of [join(home, '.nvm', 'versions', 'node'), join(home, '.fnm', 'node-versions')]) {
    try {
      const versions = execSync(`ls "${base}"`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim().split('\n')
      for (const v of versions.reverse()) {
        const bin = join(base, v, 'bin', 'openclaw')
        if (existsSync(bin)) return bin
      }
    } catch { /* ignore */ }
  }
  return null
}

// ── Gateway Token ─────────────────────────────────────────────────

/** Read the gateway auth token from ~/.openclaw/openclaw.json. */
export function detectGatewayToken(): string | null {
  const configPath = join(homedir(), '.openclaw', 'openclaw.json')
  if (!existsSync(configPath)) return null
  try {
    const config = JSON.parse(readFileSync(configPath, 'utf-8'))
    const token = config?.gateway?.auth?.token
    return typeof token === 'string' ? token : null
  } catch {
    return null
  }
}

// ── HTTP Endpoint ─────────────────────────────────────────────────

/** Check if the HTTP chat completions endpoint is enabled in openclaw.json. */
export function checkHttpEndpointEnabled(): boolean | null {
  const configPath = join(homedir(), '.openclaw', 'openclaw.json')
  if (!existsSync(configPath)) return null
  try {
    const config = JSON.parse(readFileSync(configPath, 'utf-8'))
    return config?.gateway?.http?.endpoints?.chatCompletions?.enabled === true
  } catch {
    return null
  }
}

/** Enable the HTTP chat completions endpoint in openclaw.json. */
export function enableHttpEndpoint(): boolean {
  const configPath = join(homedir(), '.openclaw', 'openclaw.json')
  if (!existsSync(configPath)) return false
  try {
    const config = JSON.parse(readFileSync(configPath, 'utf-8'))
    if (!config.gateway) config.gateway = {}
    if (!config.gateway.http) config.gateway.http = {}
    if (!config.gateway.http.endpoints) config.gateway.http.endpoints = {}
    if (!config.gateway.http.endpoints.chatCompletions) config.gateway.http.endpoints.chatCompletions = {}
    config.gateway.http.endpoints.chatCompletions.enabled = true
    writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8')
    return true
  } catch {
    return false
  }
}

// ── Summary ───────────────────────────────────────────────────────

export interface DetectionResult {
  workspacePath: string | null
  openclawBin: string | null
  gatewayToken: string | null
  httpEndpointEnabled: boolean | null
}

/** Run all detectors and return a summary. */
export function detectAll(): DetectionResult {
  return {
    workspacePath: detectWorkspacePath(),
    openclawBin: detectOpenClawBin(),
    gatewayToken: detectGatewayToken(),
    httpEndpointEnabled: checkHttpEndpointEnabled(),
  }
}
