// AST Node Types
export type NodeType = 'program' | 'function' | 'declarations' | 'statements' | 'expression' | 
                      'binary_op' | 'unary_op' | 'identifier' | 'constant' | 'keyword' | 
                      'operator' | 'statement' | 'declaration' | 'if_statement' | 'while_statement' |
                      'for_statement' | 'return_statement' | 'assignment' | 'call_expression' |
                      'variable_declaration' | 'function_declaration' | 'parameter_list';

export interface ASTNode {
  id: string;
  type: NodeType;
  value: string;
  tokenType: 'keyword' | 'operator' | 'identifier' | 'constant';
  children: ASTNode[];
  position: { x: number; y: number };
}

// Token classification
const keywords = [
  'if', 'else', 'while', 'for', 'return', 'goto', 'do', 'switch', 'case',
  'break', 'continue', 'struct', 'typedef', 'def', 'class', 'public',
  'private', 'static', 'import', 'from', 'as'
];

// Treat these as "constant kinds" (data types)
const constantKinds = ['int', 'float', 'double', 'char', 'string', 'void', 'bool'];

const operators = [
  '{', '}', '[', ']', '(', ')', '!', '+', '-', '*', '/', '%', '=', '==',
  '!=', '<', '>', '<=', '>=', ';', ':', ',', '.', '++', '--'
];

// Improved token classifier (compiler-style + AST-style hybrid)
function getTokenType(token: string): 'keyword' | 'operator' | 'identifier' | 'constant' {
  const lower = token.toLowerCase();

  if (keywords.includes(lower)) return 'keyword';
  if (constantKinds.includes(lower)) return 'constant'; // type constants like int, float
  if (operators.includes(token)) return 'operator';

  // Numeric literals (int/float)
  if (/^\d+(\.\d+)?$/.test(token)) return 'constant';

  // String or character literals
  if (/^".*"$/.test(token) || /^'.*'$/.test(token)) return 'constant';

  // Default fallback → identifier
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

// Main code parser for proper hierarchical AST
export function parseCode(input: string, language: string): ASTNode {
  nodeIdCounter = 0;
  
  if (language === 'expression') {
    const exprNode = parseExpression(input);
    // Wrap expression in program structure
    const programNode = createNode('program', 'Program', 'keyword', []);
    const expressionsNode = createNode('statements', 'Expressions', 'keyword', [exprNode]);
    programNode.children.push(expressionsNode);
    return programNode;
  }
  
  const lines = input.split('\n').filter(line => line.trim());
  const programNode = createNode('program', `${language.toUpperCase()} Program`, 'keyword', []);
  
  // Parse and categorize all statements
  const declarations: ASTNode[] = [];
  const statements: ASTNode[] = [];
  const functions: ASTNode[] = [];
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith('//') || trimmedLine.startsWith('#')) continue;
    
    const parsed = parseStatement(trimmedLine, language);
    if (parsed) {
      if (parsed.type === 'function_declaration') {
        functions.push(parsed);
      } else if (parsed.type === 'variable_declaration') {
        declarations.push(parsed);
      } else {
        statements.push(parsed);
      }
    }
  }
  
  // Create hierarchical structure
  if (functions.length > 0) {
    functions.forEach(func => programNode.children.push(func));
  }
  
  if (declarations.length > 0) {
    const declNode = createNode('declarations', 'Declarations', 'keyword', declarations);
    programNode.children.push(declNode);
  }
  
  if (statements.length > 0) {
    const stmtNode = createNode('statements', 'Statements', 'keyword', statements);
    programNode.children.push(stmtNode);
  }
  
  return programNode;
}

function parseStatement(statement: string, language: string): ASTNode | null {
  // Variable declaration (int a = 5, float b, etc.)
  if (isVariableDeclaration(statement, language)) {
    return parseVariableDeclaration(statement, language);
  }
  
  // Function declaration
  if (isFunctionDeclaration(statement)) {
    return parseFunctionDeclaration(statement, language);
  }
  
  // Control structures
  if (statement.startsWith('if')) {
    return parseIfStatement(statement);
  }
  
  if (statement.startsWith('while')) {
    return parseWhileStatement(statement);
  }
  
  if (statement.startsWith('for')) {
    return parseForStatement(statement);
  }
  
  // Return statement
  if (statement.startsWith('return')) {
    return parseReturnStatement(statement);
  }
  
  // Assignment (variable = expression)
  if (statement.includes('=') && !statement.includes('==') && !isVariableDeclaration(statement, language)) {
    return parseAssignment(statement);
  }
  
  // Expression statement
  return parseExpressionStatement(statement);
}

function isVariableDeclaration(statement: string, language: string): boolean {
  const declKeywords = ['int', 'float', 'double', 'char', 'void', 'bool', 'string'];
  const firstWord = statement.trim().split(/\s+/)[0];
  return declKeywords.includes(firstWord.toLowerCase());
}

function isFunctionDeclaration(statement: string): boolean {
  return statement.includes('(') && statement.includes(')') && 
         (statement.includes('{') || statement.endsWith(')') || statement.endsWith(';'));
}

function parseVariableDeclaration(statement: string, language: string): ASTNode {
  const cleanStmt = statement.replace(';', '').trim();
  const parts = cleanStmt.split('=');
  const leftPart = parts[0].trim();
  const rightPart = parts[1]?.trim();
  
  // Parse type and variable name
  const leftTokens = leftPart.split(/\s+/);
  const type = leftTokens[0];
  const varName = leftTokens[leftTokens.length - 1];
  
  const declNode = createNode('variable_declaration', `${type} ${varName}`, 'keyword', []);
  declNode.children.push(createNode('keyword', type, 'keyword', []));
  declNode.children.push(createNode('identifier', varName, 'identifier', []));
  
  if (rightPart) {
    const initNode = createNode('assignment', '=', 'operator', []);
    initNode.children.push(createNode('identifier', varName, 'identifier', []));
    
    // Parse the right-hand side as expression
    const valueNode = parseExpressionRecursive(rightPart);
    initNode.children.push(valueNode);
    
    declNode.children.push(initNode);
  }
  
  return declNode;
}

function parseFunctionDeclaration(statement: string, language: string): ASTNode {
  const parts = statement.split('(');
  const leftPart = parts[0].trim();
  const paramsPart = parts[1]?.split(')')[0] || '';
  
  // Extract return type and function name
  const leftTokens = leftPart.split(/\s+/);
  const returnType = leftTokens.length > 1 ? leftTokens[0] : 'void';
  const functionName = leftTokens[leftTokens.length - 1];
  
  const functionNode = createNode('function_declaration', `Function: ${functionName}`, 'keyword', []);
  
  // Add return type
  if (returnType !== 'void') {
    functionNode.children.push(createNode('keyword', returnType, 'keyword', []));
  }
  
  // Add function name
  functionNode.children.push(createNode('identifier', functionName, 'identifier', []));
  
  // Add parameters
  if (paramsPart.trim()) {
    const paramListNode = createNode('parameter_list', 'Parameters', 'keyword', []);
    const paramList = paramsPart.split(',').map(p => p.trim());
    
    for (const param of paramList) {
      const paramTokens = param.split(/\s+/);
      if (paramTokens.length >= 2) {
        const paramType = paramTokens[0];
        const paramName = paramTokens[1];
        const paramNode = createNode('declaration', `${paramType} ${paramName}`, 'identifier', []);
        paramNode.children.push(createNode('keyword', paramType, 'keyword', []));
        paramNode.children.push(createNode('identifier', paramName, 'identifier', []));
        paramListNode.children.push(paramNode);
      }
    }
    
    if (paramListNode.children.length > 0) {
      functionNode.children.push(paramListNode);
    }
  }
  
  return functionNode;
}

function parseWhileStatement(statement: string): ASTNode {
  const condition = statement.match(/while\s*\((.*?)\)/)?.[1] || '';
  const whileNode = createNode('while_statement', 'while', 'keyword', []);
  
  if (condition) {
    const conditionNode = parseExpressionRecursive(condition);
    whileNode.children.push(conditionNode);
  }
  
  return whileNode;
}

function parseForStatement(statement: string): ASTNode {
  const forContent = statement.match(/for\s*\((.*?)\)/)?.[1] || '';
  const forNode = createNode('for_statement', 'for', 'keyword', []);
  
  if (forContent) {
    const parts = forContent.split(';').map(p => p.trim());
    if (parts.length >= 3) {
      // Initialization
      if (parts[0]) {
        const initNode = createNode('statement', 'Init', 'keyword', []);
        initNode.children.push(parseExpressionRecursive(parts[0]));
        forNode.children.push(initNode);
      }
      
      // Condition
      if (parts[1]) {
        const condNode = createNode('statement', 'Condition', 'keyword', []);
        condNode.children.push(parseExpressionRecursive(parts[1]));
        forNode.children.push(condNode);
      }
      
      // Update
      if (parts[2]) {
        const updateNode = createNode('statement', 'Update', 'keyword', []);
        updateNode.children.push(parseExpressionRecursive(parts[2]));
        forNode.children.push(updateNode);
      }
    }
  }
  
  return forNode;
}

function parseReturnStatement(statement: string): ASTNode {
  const returnValue = statement.replace('return', '').trim().replace(';', '');
  const returnNode = createNode('return_statement', 'return', 'keyword', []);
  
  if (returnValue) {
    const valueNode = parseExpressionRecursive(returnValue);
    returnNode.children.push(valueNode);
  }
  
  return returnNode;
}

function parseIfStatement(statement: string): ASTNode {
  const condition = statement.match(/if\s*\((.*?)\)/)?.[1] || '';
  const ifNode = createNode('if_statement', 'if', 'keyword', []);
  
  if (condition) {
    const conditionNode = parseExpressionRecursive(condition);
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
    const valueNode = parseExpressionRecursive(value);
    assignNode.children.push(valueNode);
  }
  
  return assignNode;
}

function parseExpressionStatement(statement: string): ASTNode {
  const cleanStmt = statement.replace(';', '').trim();
  return parseExpressionRecursive(cleanStmt);
}

// Enhanced expression parser with proper operator precedence
function parseExpressionRecursive(input: string): ASTNode {
  const tokens = tokenizeExpression(input);
  let index = 0;
  
  function peek(): string | null {
    return index < tokens.length ? tokens[index] : null;
  }
  
  function consume(): string | null {
    return index < tokens.length ? tokens[index++] : null;
  }
  
  // Parse logical OR (lowest precedence)
  function parseLogicalOr(): ASTNode {
    let left = parseLogicalAnd();
    
    while (peek() === '||') {
      const operator = consume()!;
      const right = parseLogicalAnd();
      const opNode = createNode('binary_op', operator, 'operator', []);
      opNode.children.push(left);
      opNode.children.push(right);
      left = opNode;
    }
    
    return left;
  }
  
  // Parse logical AND
  function parseLogicalAnd(): ASTNode {
    let left = parseEquality();
    
    while (peek() === '&&') {
      const operator = consume()!;
      const right = parseEquality();
      const opNode = createNode('binary_op', operator, 'operator', []);
      opNode.children.push(left);
      opNode.children.push(right);
      left = opNode;
    }
    
    return left;
  }
  
  // Parse equality (==, !=)
  function parseEquality(): ASTNode {
    let left = parseComparison();
    
    while (peek() === '==' || peek() === '!=') {
      const operator = consume()!;
      const right = parseComparison();
      const opNode = createNode('binary_op', operator, 'operator', []);
      opNode.children.push(left);
      opNode.children.push(right);
      left = opNode;
    }
    
    return left;
  }
  
  // Parse comparison (<, >, <=, >=)
  function parseComparison(): ASTNode {
    let left = parseAddSub();
    
    while (peek() === '<' || peek() === '>' || peek() === '<=' || peek() === '>=') {
      const operator = consume()!;
      const right = parseAddSub();
      const opNode = createNode('binary_op', operator, 'operator', []);
      opNode.children.push(left);
      opNode.children.push(right);
      left = opNode;
    }
    
    return left;
  }
  
  // Parse addition and subtraction
  function parseAddSub(): ASTNode {
    let left = parseMulDiv();
    
    while (peek() === '+' || peek() === '-') {
      const operator = consume()!;
      const right = parseMulDiv();
      const opNode = createNode('binary_op', operator, 'operator', []);
      opNode.children.push(left);
      opNode.children.push(right);
      left = opNode;
    }
    
    return left;
  }
  
  // Parse multiplication and division
  function parseMulDiv(): ASTNode {
    let left = parseUnary();
    
    while (peek() === '*' || peek() === '/' || peek() === '%') {
      const operator = consume()!;
      const right = parseUnary();
      const opNode = createNode('binary_op', operator, 'operator', []);
      opNode.children.push(left);
      opNode.children.push(right);
      left = opNode;
    }
    
    return left;
  }
  
  // Parse unary expressions
  function parseUnary(): ASTNode {
    if (peek() === '-' || peek() === '!' || peek() === '++' || peek() === '--') {
      const operator = consume()!;
      const operand = parseUnary();
      const unaryNode = createNode('unary_op', operator, 'operator', []);
      unaryNode.children.push(operand);
      return unaryNode;
    }
    
    return parsePrimary();
  }
  
  // Parse primary expressions
  function parsePrimary(): ASTNode {
    const token = peek();
    if (!token) {
      return createNode('identifier', '', 'identifier', []);
    }
    
    // Parentheses
    if (token === '(') {
      consume(); // consume '('
      const expr = parseLogicalOr();
      consume(); // consume ')'
      return expr;
    }
    
    // Numbers
    if (/^\d+(\.\d+)?$/.test(token)) {
      consume();
      return createNode('constant', token, 'constant', []);
    }
    
    // String literals
    if (/^["'].*["']$/.test(token)) {
      consume();
      return createNode('constant', token, 'constant', []);
    }
    
    // Identifiers and function calls
    if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(token)) {
      consume();
      
      // Check for function call
      if (peek() === '(') {
        consume(); // consume '('
        const callNode = createNode('call_expression', token, 'identifier', []);
        
        // Parse arguments
        while (peek() && peek() !== ')') {
          const arg = parseLogicalOr();
          callNode.children.push(arg);
          if (peek() === ',') consume();
        }
        consume(); // consume ')'
        
        return callNode;
      }
      
      return createNode('identifier', token, 'identifier', []);
    }
    
    // Default fallback
    consume();
    return createNode('identifier', token, 'identifier', []);
  }
  
  return parseLogicalOr();
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