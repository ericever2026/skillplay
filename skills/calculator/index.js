const args = process.argv[2];
let params;

try {
  params = JSON.parse(args);
} catch (e) {
  params = { input: args, context: [] };
}

const input = params.input || '';

function extractExpression(text) {
  const patterns = [
    /(\d+(?:\.\d+)?)\s*[\+\-\*\/\^]\s*(\d+(?:\.\d+)?)/,
    /(\d+(?:\.\d+)?)\s*加\s*(\d+(?:\.\d+)?)/,
    /(\d+(?:\.\d+)?)\s*减\s*(\d+(?:\.\d+)?)/,
    /(\d+(?:\.\d+)?)\s*乘\s*(\d+(?:\.\d+)?)/,
    /(\d+(?:\.\d+)?)\s*除以?\s*(\d+(?:\.\d+)?)/,
    /(\d+(?:\.\d+)?)\s*的\s*(\d+(?:\.\d+)?)\s*次方/,
    /开方\s*(\d+(?:\.\d+)?)/,
    /平方根\s*(\d+(?:\.\d+)?)/,
    /(\d+(?:\.\d+)?)\s*的平方/
  ];
  
  for (let i = 0; i < patterns.length; i++) {
    const match = text.match(patterns[i]);
    if (match) {
      if (i === 0) {
        return { type: 'expression', expr: match[0] };
      } else if (i === 1) {
        return { type: 'add', a: parseFloat(match[1]), b: parseFloat(match[2]) };
      } else if (i === 2) {
        return { type: 'subtract', a: parseFloat(match[1]), b: parseFloat(match[2]) };
      } else if (i === 3) {
        return { type: 'multiply', a: parseFloat(match[1]), b: parseFloat(match[2]) };
      } else if (i === 4) {
        return { type: 'divide', a: parseFloat(match[1]), b: parseFloat(match[2]) };
      } else if (i === 5) {
        return { type: 'power', a: parseFloat(match[1]), b: parseFloat(match[2]) };
      } else if (i === 6 || i === 7) {
        return { type: 'sqrt', a: parseFloat(match[1]) };
      } else if (i === 8) {
        return { type: 'square', a: parseFloat(match[1]) };
      }
    }
  }
  return null;
}

function calculate(expr) {
  if (!expr) {
    return { success: false, error: '无法识别的计算表达式' };
  }
  
  let result;
  let expression;
  
  try {
    switch (expr.type) {
      case 'expression':
        const safeExpr = expr.expr.replace(/[^0-9+\-*/^().]/g, '');
        result = Function('"use strict"; return (' + safeExpr + ')')();
        expression = expr.expr;
        break;
      case 'add':
        result = expr.a + expr.b;
        expression = `${expr.a} + ${expr.b}`;
        break;
      case 'subtract':
        result = expr.a - expr.b;
        expression = `${expr.a} - ${expr.b}`;
        break;
      case 'multiply':
        result = expr.a * expr.b;
        expression = `${expr.a} × ${expr.b}`;
        break;
      case 'divide':
        if (expr.b === 0) {
          return { success: false, error: '除数不能为零' };
        }
        result = expr.a / expr.b;
        expression = `${expr.a} ÷ ${expr.b}`;
        break;
      case 'power':
        result = Math.pow(expr.a, expr.b);
        expression = `${expr.a} ^ ${expr.b}`;
        break;
      case 'sqrt':
        if (expr.a < 0) {
          return { success: false, error: '不能对负数开平方根' };
        }
        result = Math.sqrt(expr.a);
        expression = `√${expr.a}`;
        break;
      case 'square':
        result = expr.a * expr.a;
        expression = `${expr.a}²`;
        break;
    }
    
    if (isNaN(result) || !isFinite(result)) {
      return { success: false, error: '计算结果无效' };
    }
    
    return { success: true, result, expression };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function formatResponse(calcResult) {
  if (!calcResult.success) {
    return `❌ 计算错误: ${calcResult.error}`;
  }
  
  return `🧮 计算结果

📝 表达式: ${calcResult.expression}
📊 结果: ${calcResult.result}

✅ 计算完成！`;
}

try {
  const expr = extractExpression(input);
  const calcResult = calculate(expr);
  console.log(formatResponse(calcResult));
} catch (error) {
  console.log(`抱歉，计算时出现错误: ${error.message}`);
}
