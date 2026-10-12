import { CliError } from '../../logic/error'

/** The scene a request targets, as the insights service reads it from the signed metadata. */
export interface SceneTarget {
  /** Human-readable description, for the terminal and the linker dApp */
  label: string
  /** Signed `x-identity-metadata` JSON */
  metadata: string
  /** World name sent as `sceneId`, when the scene is in a World */
  world?: string
  /** Parcel sent as `parcel`, when one was given or read from scene.json */
  parcel?: string
}

export const LOG_LEVELS = ['debug', 'info', 'warn', 'error'] as const
export type LogLevel = (typeof LOG_LEVELS)[number]

const DURATION_UNITS_MS: Record<string, number> = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000
}

/**
 * Normalizes a World name the way creators type it: `foo`, `foo.dcl.eth` or any other ENS name
 * (`foo.eth`). Names without an `.eth` suffix are DCL names.
 */
export function normalizeWorldName(raw: string): string {
  const name = raw.trim().toLowerCase()
  if (!/^[a-z0-9][a-z0-9.-]*$/.test(name)) {
    throw new CliError('SCENE_INSIGHTS_INVALID_ARGUMENT', `Invalid --world "${raw}"`)
  }
  return name.endsWith('.eth') ? name : `${name}.dcl.eth`
}

/** Normalizes `x,y` parcel coordinates (spaces and leading zeros removed). */
export function normalizeParcel(raw: string): string {
  const match = raw.trim().match(/^(-?\d+)\s*,\s*(-?\d+)$/)
  if (!match) {
    throw new CliError(
      'SCENE_INSIGHTS_INVALID_ARGUMENT',
      `Invalid --position "${raw}"; expected "x,y" with integer coordinates`
    )
  }
  return `${parseInt(match[1], 10)},${parseInt(match[2], 10)}`
}

/**
 * Builds the scene target. A World is addressed by name (`sceneId`), plus the parcel of one of its
 * scenes when it has several; a Genesis City scene by any of its parcels.
 */
export function buildSceneTarget(world: string | undefined, parcel: string | undefined): SceneTarget {
  if (world) {
    return {
      label: parcel ? `${world} ${parcel}` : world,
      metadata: JSON.stringify({ sceneId: world, realmName: world, ...(parcel && { parcel }) }),
      world,
      parcel
    }
  }
  if (!parcel) {
    throw new CliError(
      'SCENE_INSIGHTS_MISSING_SCENE',
      'Provide --world (with an optional --position) for a World, or --position for a Genesis City scene'
    )
  }
  return {
    label: `Genesis City ${parcel}`,
    metadata: JSON.stringify({ parcel, realmName: 'main' }),
    parcel
  }
}

/**
 * Parses a `--from`/`--to` value into the ISO-8601 form the service expects. Accepts `now`, a
 * duration back from now (`30s`, `15m`, `2h`, `7d`), epoch milliseconds (13 digits) or ISO-8601
 * with an explicit offset (`2026-10-01T12:00:00Z`, `2026-10-01T09:00:00-03:00`).
 */
export function parseTime(raw: string, flag: string, now: number = Date.now()): string {
  const value = raw.trim()
  if (value === 'now') {
    return new Date(now).toISOString()
  }

  const duration = value.match(/^(\d+)([smhd])$/)
  if (duration) {
    return new Date(now - parseInt(duration[1], 10) * DURATION_UNITS_MS[duration[2]]).toISOString()
  }

  if (/^\d{13}$/.test(value)) {
    return new Date(parseInt(value, 10)).toISOString()
  }

  const hasOffset = /(Z|[+-]\d{2}:?\d{2})$/i.test(value)
  const parsed = Date.parse(value)
  if (!hasOffset || Number.isNaN(parsed)) {
    throw new CliError(
      'SCENE_INSIGHTS_INVALID_ARGUMENT',
      `Invalid ${flag} "${raw}"; use a duration back from now (15m, 2h, 7d), epoch milliseconds or ISO-8601 with an offset (2026-10-01T12:00:00Z)`
    )
  }
  return new Date(parsed).toISOString()
}

/** Parses a duration (`30s`, `5m`, `2h`, `1d`) into milliseconds. */
export function parseDuration(raw: string, flag: string): number {
  const duration = raw.trim().match(/^(\d+)([smhd])$/)
  const ms = duration ? parseInt(duration[1], 10) * DURATION_UNITS_MS[duration[2]] : 0
  if (!(ms > 0)) {
    throw new CliError(
      'SCENE_INSIGHTS_INVALID_ARGUMENT',
      `Invalid ${flag} "${raw}"; use a duration such as 30s, 5m or 2h`
    )
  }
  return ms
}

/** Validates a `--level` value. */
export function parseLevel(raw: string): LogLevel {
  const level = raw.trim().toLowerCase()
  if (!(LOG_LEVELS as readonly string[]).includes(level)) {
    throw new CliError('SCENE_INSIGHTS_INVALID_ARGUMENT', `Invalid --level "${raw}"; use ${LOG_LEVELS.join(', ')}`)
  }
  return level as LogLevel
}

/** Validates an integer flag inside [min, max]. */
export function parseInteger(value: number, flag: string, min: number, max: number): number {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new CliError('SCENE_INSIGHTS_INVALID_ARGUMENT', `${flag} must be an integer between ${min} and ${max}`)
  }
  return value
}

/** Expands a metric name, so `cpu.run_ms` can be typed for `dcl.scene.cpu.run_ms`. */
export function normalizeMetricName(raw: string): string {
  const name = raw.trim()
  return name.startsWith('dcl.scene.') ? name : `dcl.scene.${name}`
}
