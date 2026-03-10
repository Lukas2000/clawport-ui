import fs from 'fs'
import path from 'path'
import os from 'os'
import { generateId } from './id'
import type { WorkspaceProfile } from './types'

function getConfigDir(): string {
  const dir = path.join(os.homedir(), '.config', 'clawport-ui')
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  return dir
}

function getProfilesPath(): string {
  return path.join(getConfigDir(), 'workspaces.json')
}

function loadProfilesFile(): WorkspaceProfile[] {
  const filePath = getProfilesPath()
  if (!fs.existsSync(filePath)) return []
  try {
    const raw = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(raw) as WorkspaceProfile[]
  } catch {
    return []
  }
}

function saveProfilesFile(profiles: WorkspaceProfile[]): void {
  fs.writeFileSync(getProfilesPath(), JSON.stringify(profiles, null, 2))
}

export function getProfiles(): WorkspaceProfile[] {
  return loadProfilesFile().sort((a, b) => b.lastUsed.localeCompare(a.lastUsed))
}

export function getProfile(id: string): WorkspaceProfile | null {
  return loadProfilesFile().find(p => p.id === id) ?? null
}

export function addProfile(name: string, workspacePath: string): WorkspaceProfile {
  const profiles = loadProfilesFile()
  // Avoid duplicate paths
  const existing = profiles.find(p => p.path === workspacePath)
  if (existing) {
    existing.name = name
    existing.lastUsed = new Date().toISOString()
    saveProfilesFile(profiles)
    return existing
  }

  const profile: WorkspaceProfile = {
    id: generateId(),
    name,
    path: workspacePath,
    lastUsed: new Date().toISOString(),
  }
  profiles.push(profile)
  saveProfilesFile(profiles)
  return profile
}

export function removeProfile(id: string): boolean {
  const profiles = loadProfilesFile()
  const idx = profiles.findIndex(p => p.id === id)
  if (idx === -1) return false
  profiles.splice(idx, 1)
  saveProfilesFile(profiles)
  return true
}

export function touchProfile(id: string): void {
  const profiles = loadProfilesFile()
  const profile = profiles.find(p => p.id === id)
  if (profile) {
    profile.lastUsed = new Date().toISOString()
    saveProfilesFile(profiles)
  }
}

export function getCurrentWorkspacePath(): string | null {
  return process.env.WORKSPACE_PATH ?? null
}
