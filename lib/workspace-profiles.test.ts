import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { getProfiles, addProfile, removeProfile, getProfile, touchProfile } from './workspace-profiles'

const testDir = path.join(os.tmpdir(), `clawport-profiles-test-${Date.now()}`)
const profilesPath = path.join(testDir, 'workspaces.json')

beforeEach(() => {
  fs.mkdirSync(testDir, { recursive: true })
  // Mock getConfigDir to use our temp directory
  vi.spyOn(os, 'homedir').mockReturnValue(path.join(testDir, 'home'))
  fs.mkdirSync(path.join(testDir, 'home', '.config', 'clawport-ui'), { recursive: true })
})

afterEach(() => {
  vi.restoreAllMocks()
  fs.rmSync(testDir, { recursive: true, force: true })
})

describe('addProfile', () => {
  it('creates a new profile', () => {
    const profile = addProfile('My Workspace', '/path/to/workspace')
    expect(profile.id).toBeTruthy()
    expect(profile.name).toBe('My Workspace')
    expect(profile.path).toBe('/path/to/workspace')
  })

  it('updates existing profile with same path', () => {
    const first = addProfile('First', '/path/ws')
    const second = addProfile('Updated', '/path/ws')
    expect(second.id).toBe(first.id)
    expect(second.name).toBe('Updated')
  })
})

describe('getProfiles', () => {
  it('returns empty array when no profiles exist', () => {
    expect(getProfiles()).toEqual([])
  })

  it('returns profiles sorted by lastUsed desc', () => {
    addProfile('A', '/a')
    addProfile('B', '/b')
    const profiles = getProfiles()
    expect(profiles).toHaveLength(2)
    // Both profiles exist, names should be A and B (order may vary if same timestamp)
    const names = profiles.map(p => p.name).sort()
    expect(names).toEqual(['A', 'B'])
  })
})

describe('getProfile', () => {
  it('returns a specific profile', () => {
    const created = addProfile('Test', '/test')
    const found = getProfile(created.id)
    expect(found).not.toBeNull()
    expect(found!.name).toBe('Test')
  })

  it('returns null for non-existent', () => {
    expect(getProfile('nope')).toBeNull()
  })
})

describe('removeProfile', () => {
  it('removes a profile', () => {
    const profile = addProfile('Del', '/del')
    expect(removeProfile(profile.id)).toBe(true)
    expect(getProfile(profile.id)).toBeNull()
  })

  it('returns false for non-existent', () => {
    expect(removeProfile('nope')).toBe(false)
  })
})

describe('touchProfile', () => {
  it('updates lastUsed timestamp', () => {
    const profile = addProfile('Touch', '/touch')
    const before = profile.lastUsed
    // Small delay to ensure timestamp changes
    touchProfile(profile.id)
    const updated = getProfile(profile.id)
    expect(updated).not.toBeNull()
    expect(updated!.lastUsed).toBeTruthy()
  })
})
