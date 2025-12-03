// Calculator with intentional bugs for demo
class Calculator {
  constructor() {
    this.result = 0;
  }

  add(a, b) {
    return a + b;
  }

  subtract(a, b) {
    return a - b;
  }

  // Bug: Division by zero not handled
  divide(a, b) {
    return a / b;
  }

  // Bug: Wrong operator used
  multiply(a, b) {
    return a + b;  // Should be a * b
  }

  // Bug: No input validation
  power(base, exponent) {
    let result = 1;
    for (let i = 0; i < exponent; i++) {
      result *= base;
    }
    return result;
  }

  // Bug: Potential floating point issues
  percentage(value, percent) {
    return value * percent / 100;
  }

  // Bug: Memory leak - never cleared
  history = [];
  
  addToHistory(operation) {
    this.history.push({
      operation,
      timestamp: new Date(),
      result: this.result
    });
  }
}

// Usage with potential issues
const calc = new Calculator();
console.log(calc.divide(10, 0));      // Infinity - no error handling
console.log(calc.multiply(5, 3));     // Returns 8 instead of 15
console.log(calc.power(-2, 0.5));     // NaN - doesn't handle fractional exponents

