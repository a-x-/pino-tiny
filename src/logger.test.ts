import { describe, it, expect } from 'vitest'
import { format, parse } from './logger'
import { PinoTinyOptions } from './index'

describe('pino-tiny logger', () => {
  const mockLogData = {
    level: 30,
    time: 1698765432123,
    pid: 12345,
    hostname: 'localhost',
    msg: 'Test message',
    userId: '123',
    userEmail: 'test@example.com',
    sessionId: 'abc123'
  }

  describe('parse', () => {
    it('should parse valid JSON', () => {
      const jsonString = '{"level":30,"msg":"test"}'
      const result = parse(jsonString)
      expect(result).toEqual({ level: 30, msg: 'test' })
    })

    it('should handle invalid JSON as info log', () => {
      const invalidJson = 'not a json string'
      const result = parse(invalidJson)
      expect(result.level).toBe(30)
      expect(result.msg).toBe(invalidJson)
      expect(result.message).toBe(invalidJson)
    })
  })

  describe('format', () => {
    it('should format basic log without options', () => {
      const result = format(mockLogData)
      expect(result).toContain('INF')
      expect(result).toContain('ℹ️')
      expect(result).toContain('Test message')
      expect(result).toContain('16:17:12.123')
    })

    it('should hide milliseconds when hideMs is true', () => {
      const options: PinoTinyOptions = { hideMs: true }
      const result = format(mockLogData, options)
      expect(result).toContain('16:17:12')
      expect(result).not.toContain('16:17:12.123')
    })

    it('should show objects when showObjects is true', () => {
      const options: PinoTinyOptions = { showObjects: true }
      const result = format(mockLogData, options)
      expect(result).toContain('Test message')
      expect(result).toContain('"userId":"123"')
      expect(result).toContain('"userEmail":"test@example.com"')
      expect(result).toContain('"sessionId":"abc123"')
    })

    it('should not show objects when showObjects is false', () => {
      const options: PinoTinyOptions = { showObjects: false }
      const result = format(mockLogData, options)
      expect(result).toContain('Test message')
      expect(result).not.toContain('"userId"')
      expect(result).not.toContain('"userEmail"')
    })

    it('should hide icons when hideIcons is true', () => {
      const options: PinoTinyOptions = { hideIcons: true }
      const result = format(mockLogData, options)
      expect(result).toContain('INF')
      expect(result).not.toContain('ℹ️')
    })

    it('should hide letters when hideLetters is true', () => {
      const options: PinoTinyOptions = { hideLetters: true }
      const result = format(mockLogData, options)
      expect(result).not.toContain('INF')
      expect(result).toContain('Test message')
    })

    it('should hide timestamp when hideTimestamp is true', () => {
      const options: PinoTinyOptions = { hideTimestamp: true }
      const result = format(mockLogData, options)
      expect(result).not.toContain('16:17:12')
      expect(result).toContain('Test message')
    })

    it('should filter standard pino fields from showObjects output', () => {
      const options: PinoTinyOptions = { showObjects: true }
      const result = format(mockLogData, options)

      // Should not contain standard pino fields
      expect(result).not.toContain('"level"')
      expect(result).not.toContain('"time"')
      expect(result).not.toContain('"pid"')
      expect(result).not.toContain('"hostname"')
      expect(result).not.toContain('"msg"')

      // Should contain additional fields
      expect(result).toContain('"userId":"123"')
    })

    it('should handle log with req/res data', () => {
      const webLogData = {
        ...mockLogData,
        req: { method: 'GET', url: '/api/test' },
        res: { statusCode: 200 },
        responseTime: 150
      }

      const result = format(webLogData)
      expect(result).toContain('GET /api/test (200/150ms)')
    })

    it('should filter tags that duplicate log level', () => {
      const logWithDuplicateTags = {
        ...mockLogData,
        tags: ['info', 'custom', 'debug', 'important']
      }
      const options: PinoTinyOptions = { showObjects: true }
      const result = format(logWithDuplicateTags, options)

      // Should not contain level-duplicate tags
      expect(result).not.toContain('["info"')
      expect(result).not.toContain('["debug"')

      // Should contain non-level tags
      expect(result).toContain('["custom","important"]')
    })

    it('should hide tags completely if only level tags remain', () => {
      const logWithOnlyLevelTags = {
        ...mockLogData,
        tags: ['info', 'debug', 'error']
      }
      const options: PinoTinyOptions = { showObjects: true }
      const result = format(logWithOnlyLevelTags, options)

      // Should not contain tags at all since all were level duplicates
      expect(result).not.toContain('tags')
      expect(result).not.toContain('["info"')
    })

    it('should keep non-array tags unchanged', () => {
      const logWithStringTag = {
        ...mockLogData,
        tags: 'single-tag'
      }
      const options: PinoTinyOptions = { showObjects: true }
      const result = format(logWithStringTag, options)

      // Should keep string tags as-is
      expect(result).toContain('"tags":"single-tag"')
    })

    it('should apply custom message key', () => {
      const customData = {
        level: 30,
        time: 1698765432123,
        customMsg: 'Custom message'
      }
      const options: PinoTinyOptions = { msgKey: 'customMsg' }
      const result = format(customData, options)
      expect(result).toContain('Custom message')
    })

    it('should handle different log levels', () => {
      const levels = [
        { level: 10, expected: 'TRC' },
        { level: 20, expected: 'DBG' },
        { level: 30, expected: 'INF' },
        { level: 40, expected: 'WRN' },
        { level: 50, expected: 'ERR' },
        { level: 60, expected: 'FTL' },
        { level: 99, expected: '???' }
      ]

      levels.forEach(({ level, expected }) => {
        const logData = { ...mockLogData, level }
        const result = format(logData)
        expect(result).toContain(expected)
      })
    })

    it('should apply filter function', () => {
      const options: PinoTinyOptions = {
        filter: (data) => ({ ...data, msg: `[FILTERED] ${String(data.msg)}` })
      }
      const result = format(mockLogData, options)
      expect(result).toContain('[FILTERED] Test message')
    })

    it('should return undefined when filter returns null', () => {
      const options: PinoTinyOptions = {
        filter: () => null
      }
      const result = format(mockLogData, options)
      expect(result).toBeUndefined()
    })

    it('should filter loggerName from showObjects output', () => {
      const logWithLoggerName = {
        ...mockLogData,
        loggerName: 'app-logger',
        additionalField: 'should-be-shown'
      }
      const options: PinoTinyOptions = { showObjects: true }
      const result = format(logWithLoggerName, options)

      // Should not contain loggerName
      expect(result).not.toContain('"loggerName"')
      expect(result).not.toContain('app-logger')

      // Should contain other additional fields
      expect(result).toContain('"additionalField":"should-be-shown"')
    })
  })
})
