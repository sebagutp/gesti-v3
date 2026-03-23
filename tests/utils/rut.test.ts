// Tests de RUT
import { describe, it, expect } from 'vitest'
import { validarRUT, formatearRUT } from '../../src/lib/utils/rut'

describe('validarRUT', () => {
  it('valida RUT correcto con formato', () => {
    expect(validarRUT('12.345.678-5')).toBe(true)
  })

  it('valida RUT correcto sin formato', () => {
    expect(validarRUT('123456785')).toBe(true)
  })

  it('rechaza RUT con DV incorrecto', () => {
    expect(validarRUT('12.345.678-0')).toBe(false)
  })

  it('rechaza string vacío', () => {
    expect(validarRUT('')).toBe(false)
  })

  it('valida RUT con K', () => {
    expect(validarRUT('10.727.393-K')).toBe(true)
  })
})

describe('formatearRUT', () => {
  it('formatea RUT sin puntos ni guión', () => {
    expect(formatearRUT('123456785')).toBe('12.345.678-5')
  })

  it('formatea RUT con K', () => {
    expect(formatearRUT('10727393k')).toBe('10.727.393-K')
  })
})
