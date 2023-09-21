import { isValidNumericInput } from './useComponentInput'

describe('isValidNumericInput', () => {
  it('should return true for a valid numeric input', () => {
    const validInput = {
      numericValue: '42'
    }

    const result = isValidNumericInput(validInput.numericValue)

    expect(result).toBe(true)
  })

  it('should return false for an empty string', () => {
    const emptyStringInput = {
      emptyString: ''
    }

    const result = isValidNumericInput(emptyStringInput.emptyString)

    expect(result).toBe(false)
  })

  it('should return false for a non-numeric string', () => {
    const nonNumericStringInput = {
      nonNumericString: 'abc'
    }

    const result = isValidNumericInput(nonNumericStringInput.nonNumericString)

    expect(result).toBe(false)
  })

  it('should return true for a boolean true value', () => {
    const trueBooleanInput = {
      trueValue: true
    }

    const result = isValidNumericInput(trueBooleanInput.trueValue)

    expect(result).toBe(true)
  })

  it('should return false for a boolean false value', () => {
    const falseBooleanInput = {
      falseValue: false
    }

    const result = isValidNumericInput(falseBooleanInput.falseValue)

    expect(result).toBe(false)
  })

  it('should return true for an array of valid numeric values', () => {
    const validNumericArrayInput = {
      numericArray: ['1', '2', '3']
    }

    const result = isValidNumericInput(validNumericArrayInput.numericArray)

    expect(result).toBe(true)
  })

  it('should return false for an array with an invalid numeric value', () => {
    const invalidNumericArrayInput = {
      invalidNumericArray: ['1', 'abc', '3']
    }

    const result = isValidNumericInput(invalidNumericArrayInput.invalidNumericArray)

    expect(result).toBe(false)
  })

  it('should return true for a nested object with valid numeric values', () => {
    const nestedValidNumericInput = {
      nestedObject: {
        numericValue: '42'
      }
    }

    const result = isValidNumericInput(nestedValidNumericInput.nestedObject)

    expect(result).toBe(true)
  })

  it('should return false for a nested object with an invalid numeric value', () => {
    const nestedInvalidNumericInput = {
      nestedObject: {
        numericValue: 'abc'
      }
    }

    const result = isValidNumericInput(nestedInvalidNumericInput.nestedObject)

    expect(result).toBe(false)
  })

  it('should return true for a nested object with a valid numeric array', () => {
    const nestedValidNumericArrayInput = {
      nestedObject: {
        numericArray: ['1', '2', '3']
      }
    }

    const result = isValidNumericInput(nestedValidNumericArrayInput.nestedObject)

    expect(result).toBe(true)
  })

  it('should return false for a nested object with an invalid numeric array', () => {
    const nestedInvalidNumericArrayInput = {
      nestedObject: {
        numericArray: ['1', 'abc', '3']
      }
    }

    const result = isValidNumericInput(nestedInvalidNumericArrayInput.nestedObject)

    expect(result).toBe(false)
  })
})
