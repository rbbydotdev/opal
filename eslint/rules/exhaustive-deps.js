// eslint/rules/exhaustive-deps.js
export default {
  meta: {
    type: "problem",
    docs: {
      description: "Checks that all dependencies are specified in the dependency array for custom hooks",
      category: "Best Practices",
      recommended: false,
    },
    schema: [
      {
        type: "object",
        properties: {
          hooks: {
            type: "array",
            items: { type: "string" },
            minItems: 1,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      missingDep: "Dependency '{{dep}}' is missing in dependency array.",
    },
  },

  create(context) {
    const options = context.options[0] || {};
    const hookNames = new Set(options.hooks || []);
    const sourceCode = context.sourceCode;

    // Track stable variables like state setters
    const stableVars = new Set();

    return {
      VariableDeclarator(node) {
        // Detect: const [state, setState] = useState(...)
        if (
          node.id.type === "ArrayPattern" &&
          node.init &&
          node.init.type === "CallExpression" &&
          node.init.callee.type === "Identifier" &&
          node.init.callee.name === "useState"
        ) {
          const elements = node.id.elements;
          if (elements.length > 1 && elements[1].type === "Identifier") {
            stableVars.add(elements[1].name);
          }
        }

        // Detect: const [state, dispatch] = useReducer(...)
        if (
          node.id.type === "ArrayPattern" &&
          node.init &&
          node.init.type === "CallExpression" &&
          node.init.callee.type === "Identifier" &&
          node.init.callee.name === "useReducer"
        ) {
          const elements = node.id.elements;
          if (elements.length > 1 && elements[1].type === "Identifier") {
            stableVars.add(elements[1].name);
          }
        }
      },

      CallExpression(node) {
        // Only match our custom hooks
        if (node.callee.type !== "Identifier" || !hookNames.has(node.callee.name)) {
          return;
        }

        const [callbackArg, depsArg] = node.arguments;
        if (!callbackArg || !depsArg) return;

        if (callbackArg.type !== "ArrowFunctionExpression" && callbackArg.type !== "FunctionExpression") {
          return;
        }

        const callbackScope = sourceCode.getScope(callbackArg);
        if (!callbackScope) return;

        const usedVars = new Set();
        callbackScope.through.forEach((ref) => {
          const name = ref.identifier.name;

          // ✅ Ignore stable vars (setState, dispatch, etc.)
          if (stableVars.has(name)) return;

          // ✅ Ignore type-only references (TS)
          if (
            ref.resolved &&
            ref.resolved.defs.every((def) => def.type === "Type" || def.type === "TSType" || def.type === "TypeName")
          ) {
            return;
          }

          usedVars.add(name);
        });

        if (depsArg.type !== "ArrayExpression") return;

        const deps = new Set();
        depsArg.elements.forEach((el) => {
          if (!el) return;
          deps.add(sourceCode.getText(el));
        });

        usedVars.forEach((v) => {
          if (!deps.has(v)) {
            context.report({
              node: depsArg,
              messageId: "missingDep",
              data: { dep: v },
            });
          }
        });
      },
    };
  },
};
