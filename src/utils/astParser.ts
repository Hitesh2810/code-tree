// AST Node Types
export type NodeType = 'program' | 'function' | 'expression' | 'binary_op' | 'unary_op' | 
                      'identifier' | 'constant' | 'keyword' | 'operator' | 'statement' |
                      'if_statement' | 'return_statement' | 'assignment' | 'call_expression';

export interface ASTNode {
  id: string;
  type: NodeType;
  value: string;
  tokenType: 'keyword' | 'operator' | 'identifier' | 'constant';
  children: ASTNode[];
  position: { x: number; y: number };
}

// Token classification
const keywords = ['int', 'float', 'double', 'char', 'void', 'if', 'else', 'while', 'for', 'return', 
                 'def', 'class', 'public', 'private', 'static', 'import', 'from', 'as'];
const operators = ['+', '-', '*', '/', '=', '==', '!=', '<', '>', '<=', '>=', '&&', '||', '!', 
                  '%', '++', '--', '+=', '-=', '*=', '/=', '(', ')', '{', '}', '[', ']', ';', ','];

function getTokenType(token: string): 'keyword' | 'operator' | 'identifier' | 'constant' {
  if (keywords.includes(token.toLowerCase())) return 'keyword';
  if (operators.includes(token)) return 'operator';
  if (/^\d+(\.\d+)?$/.test(token)) return 'constant';
  if (/^".*"$/.test(token) || /^'.*'$/.test(token)) return 'constant';
  return 'identifier';
}

let nodeIdCounter = 0;
function generateNodeId(): string {
  return `node_${++nodeIdCounter}`;
}

// Expression parser for mathematical expressions
export function parseExpression(input: string): ASTNode {
  nodeIdCounter = 0;
  const tokens = tokenizeExpression(input);
  const result = parseExpressionTokens(tokens);
  return result || createNode('expression', input, 'constant', []);
}

function tokenizeExpression(input: string): string[] {
  const tokens: string[] = [];
  let current = '';
  
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    
    if (/\s/.test(char)) {
      if (current) {
        tokens.push(current);
        current = '';
      }
      continue;
    }
    
    if (/[+\-*/()^]/.test(char)) {
      if (current) {
        tokens.push(current);
        current = '';
      }
      tokens.push(char);
    } else {
      current += char;
    }
  }
  
  if (current) {
    tokens.push(current);
  }
  
  return tokens.filter(token => token.length > 0);
}

function parseExpressionTokens(tokens: string[]): ASTNode | null {
  let index = 0;
  
  function peek(): string | null {
    return index < tokens.length ? tokens[index] : null;
  }
  
  function consume(): string | null {
    return index < tokens.length ? tokens[index++] : null;
  }
  
  function parseAddSub(): ASTNode | null {
    let left = parseMulDiv();
    
    while (peek() === '+' || peek() === '-') {
      const operator = consume()!;
      const right = parseMulDiv();
      if (right) {
        left = createNode('binary_op', operator, 'operator', left ? [left, right] : [right]);
      }
    }
    
    return left;
  }
  
  function parseMulDiv(): ASTNode | null {
    let left = parsePrimary();
    
    while (peek() === '*' || peek() === '/') {
      const operator = consume()!;
      const right = parsePrimary();
      if (right) {
        left = createNode('binary_op', operator, 'operator', left ? [left, right] : [right]);
      }
    }
    
    return left;
  }
  
  function parsePrimary(): ASTNode | null {
    const token = peek();
    if (!token) return null;
    
    if (token === '(') {
      consume(); // consume '('
      const expr = parseAddSub();
      consume(); // consume ')'
      return expr;
    }
    
    if (/^\d+(\.\d+)?$/.test(token)) {
      consume();
      return createNode('constant', token, 'constant', []);
    }
    
    if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(token)) {
      consume();
      // Check if it's a function call
      if (peek() === '(') {
        consume(); // consume '('
        const args: ASTNode[] = [];
        while (peek() && peek() !== ')') {
          const arg = parseAddSub();
          if (arg) args.push(arg);
          if (peek() === ',') consume();
        }
        consume(); // consume ')'
        return createNode('call_expression', token, 'identifier', args);
      }
      return createNode('identifier', token, 'identifier', []);
    }
    
    return null;
  }
  
  return parseAddSub();
}

// Simple code parser for basic syntax
export function parseCode(input: string, language: string): ASTNode {
  nodeIdCounter = 0;
  const lines = input.split('\n').filter(line => line.trim());
  
  if (language === 'expression') {
    return parseExpression(input);
  }
  
  const programNode = createNode('program', `${language.toUpperCase()} Program`, 'keyword', []);
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith('//') || trimmedLine.startsWith('#')) continue;
    
    const statementNode = parseStatement(trimmedLine, language);
    if (statementNode) {
      programNode.children.push(statementNode);
    }
  }
  
  return programNode;
}

function parseStatement(statement: string, language: string): ASTNode | null {
  // Function declaration
  if (statement.includes('(') && statement.includes(')') && !statement.includes('=')) {
    return parseFunctionDeclaration(statement, language);
  }
  
  // Return statement
  if (statement.startsWith('return')) {
    return parseReturnStatement(statement);
  }
  
  // If statement
  if (statement.startsWith('if')) {
    return parseIfStatement(statement);
  }
  
  // Assignment
  if (statement.includes('=') && !statement.includes('==')) {
    return parseAssignment(statement);
  }
  
  // Default expression
  return createNode('statement', statement, 'identifier', []);
}

function parseFunctionDeclaration(statement: string, language: string): ASTNode {
  const parts = statement.split('(');
  const functionName = parts[0].trim().split(' ').pop() || 'function';
  const parameters = parts[1]?.split(')')[0] || '';
  
  const functionNode = createNode('function', functionName, 'identifier', []);
  
  if (parameters.trim()) {
    const paramList = parameters.split(',').map(p => p.trim());
    for (const param of paramList) {
      const paramNode = createNode('identifier', param, 'identifier', []);
      functionNode.children.push(paramNode);
    }
  }
  
  return functionNode;
}

function parseReturnStatement(statement: string): ASTNode {
  const returnValue = statement.replace('return', '').trim().replace(';', '');
  const returnNode = createNode('return_statement', 'return', 'keyword', []);
  
  if (returnValue) {
    const valueNode = parseExpression(returnValue);
    returnNode.children.push(valueNode);
  }
  
  return returnNode;
}

function parseIfStatement(statement: string): ASTNode {
  const condition = statement.match(/if\s*\((.*?)\)/)?.[1] || '';
  const ifNode = createNode('if_statement', 'if', 'keyword', []);
  
  if (condition) {
    const conditionNode = parseExpression(condition);
    ifNode.children.push(conditionNode);
  }
  
  return ifNode;
}

function parseAssignment(statement: string): ASTNode {
  const parts = statement.split('=');
  const variable = parts[0].trim();
  const value = parts[1]?.trim().replace(';', '') || '';
  
  const assignNode = createNode('assignment', '=', 'operator', []);
  assignNode.children.push(createNode('identifier', variable, 'identifier', []));
  
  if (value) {
    const valueNode = /^\d+(\.\d+)?$/.test(value) 
      ? createNode('constant', value, 'constant', [])
      : createNode('identifier', value, 'identifier', []);
    assignNode.children.push(valueNode);
  }
  
  return assignNode;
}

function createNode(type: NodeType, value: string, tokenType: 'keyword' | 'operator' | 'identifier' | 'constant', children: ASTNode[]): ASTNode {
  return {
    id: generateNodeId(),
    type,
    value,
    tokenType,
    children,
    position: { x: 0, y: 0 }
  };
}