module.exports = function transformer(file, api) {
  const j = api.jscodeshift;
  const root = j(file.source);

  // Remove useCallback import if unused
  root.find(j.ImportDeclaration)
    .filter(path => path.node.source.value === 'react')
    .forEach(path => {
      const specifiers = path.node.specifiers;
      if (!specifiers) return;
      const filtered = specifiers.filter(
        s => !(s.type === 'ImportSpecifier' && s.imported.name === 'useCallback')
      );
      if (filtered.length !== specifiers.length) {
        if (filtered.length === 0) {
          j(path).remove();
        } else {
          path.node.specifiers = filtered;
        }
      }
    });

  // Replace useCallback assignment
  root.find(j.VariableDeclarator, {
    init: {
      type: 'CallExpression',
      callee: { name: 'useCallback' }
    }
  }).forEach(path => {
    const callbackFn = path.node.init && path.node.init.arguments && path.node.init.arguments[0];
    if (
      callbackFn &&
      (callbackFn.type === 'ArrowFunctionExpression' ||
        callbackFn.type === 'FunctionExpression')
    ) {
      path.node.init = callbackFn;
    }
  });

  // Replace useCallback in assignment expressions (rare, but possible)
  root.find(j.AssignmentExpression, {
    right: {
      type: 'CallExpression',
      callee: { name: 'useCallback' }
    }
  }).forEach(path => {
    const callbackFn = path.node.right.arguments && path.node.right.arguments[0];
    if (
      callbackFn &&
      (callbackFn.type === 'ArrowFunctionExpression' ||
        callbackFn.type === 'FunctionExpression')
    ) {
      path.node.right = callbackFn;
    }
  });

  // Replace return useCallback(...)
  root.find(j.ReturnStatement, {
    argument: {
      type: 'CallExpression',
      callee: { name: 'useCallback' }
    }
  }).forEach(path => {
    const callbackFn = path.node.argument && path.node.argument.arguments && path.node.argument.arguments[0];
    if (
      callbackFn &&
      (callbackFn.type === 'ArrowFunctionExpression' ||
        callbackFn.type === 'FunctionExpression')
    ) {
      path.node.argument = callbackFn;
    }
  });

  return root.toSource({ quote: 'single' });
};
