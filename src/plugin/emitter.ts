/* eslint-disable @typescript-eslint/no-explicit-any */
import * as ts from 'typescript';

function createProgramAndGetTypeChecker(context: ts.TransformationContext) {
  const compilerOptions = context.getCompilerOptions();
  const rootDir = compilerOptions.rootDir || '.';
  // Create a TypeScript program with the transformed source files
  const program = ts.createProgram({
    options: compilerOptions,
    rootNames: [rootDir],
  });

  // Get the TypeChecker from the program
  const typeChecker = program.getTypeChecker();

  return { program, typeChecker };
}

// Function to find the class where the method belongs
function findClassForMethod(
  methodNode: ts.MethodDeclaration,
): ts.ClassDeclaration | undefined {
  let parent: ts.Node = methodNode.parent;
  while (parent) {
    if (ts.isClassDeclaration(parent)) {
      return parent; // Found the class
    }
    parent = parent.parent; // Keep looking up the tree
  }
  return undefined; // No class found (in case it's not part of a class)
}

export function before() {
  return (context: ts.TransformationContext) => {
    const { typeChecker } = createProgramAndGetTypeChecker(context);
    const extensions = new Map<
      ts.SourceFile,
      Map<ts.Type, Map<string, ts.Identifier>>
    >();
    return (rootNode: ts.SourceFile) => {
      const registerExtensions: ts.Visitor = (node: ts.Node): ts.Node => {
        const visitNext = () =>
          ts.visitEachChild(node, registerExtensions, context);
        const decorators = ts.canHaveDecorators(node)
          ? ts.getDecorators(node)
          : undefined;
        // Handle method declarations with the @ExtensionMethod decorator
        if (!ts.isMethodDeclaration(node) || !decorators?.length) {
          return visitNext();
        }
        // Check for the @ExtensionMethod decorator
        const extensionDecorator = decorators.find(
          (decorator) => decorator.getText() === '@ExtensionMethod',
        );

        if (!extensionDecorator) return visitNext();
        // Ensure the method is static and has 'this' parameter for the extension type
        if (
          !node.parameters.length ||
          !node.modifiers?.some(
            (mod) => mod.kind === ts.SyntaxKind.StaticKeyword,
          )
        ) {
          return visitNext();
        }
        const first = node.parameters[0];
        if (!first) return visitNext();
        const type = typeChecker.getTypeAtLocation(first);
        if (!type) return visitNext();
        let sourceMap = extensions.get(rootNode);
        if (!sourceMap) {
          sourceMap = new Map();
          extensions.set(rootNode, sourceMap);
        }
        let extensionMethods = sourceMap.get(type);
        if (!extensionMethods) {
          extensionMethods = new Map();
          sourceMap.set(type, extensionMethods);
        }
        const cls = findClassForMethod(node);
        if (!cls?.name) return visitNext();
        extensionMethods.set(node.name.getText(), cls.name);
        return ts.visitEachChild(node, registerExtensions, context);
      };

      const transformExtensions: ts.Visitor = (node: ts.Node): ts.Node => {
        const visitNext = () =>
          ts.visitEachChild(node, transformExtensions, context);
        if (!ts.isCallExpression(node)) return visitNext();
        const { expression, arguments: args } = node;
        if (!ts.isPropertyAccessExpression(expression)) return visitNext();
        const targetInstance = expression.expression;
        const methodName = expression.name.getText();
        if (!targetInstance || !methodName) return visitNext();
        const extensionList = extensions.get(rootNode);
        if (!extensionList) return visitNext();
        const type = typeChecker.getTypeAtLocation(targetInstance);
        if (!type) return visitNext();
        let extension = extensionList.get(type)?.get(methodName);
        if (!extension) {
          for (const [key, value] of extensionList.entries()) {
            if (typeChecker.isTypeAssignableTo(type, key)) {
              extension = value.get(methodName);
              if (extension) break;
            }
          }
        }
        if (!extension) return visitNext();

        // Create the transformed call: MyExtensionClass.myExtensionMethod(myInstance)
        return ts.factory.createCallExpression(
          ts.factory.createPropertyAccessExpression(
            extension,
            ts.factory.createIdentifier(methodName),
          ),
          undefined,
          [targetInstance, ...args],
        );
      };

      ts.visitNode(rootNode, registerExtensions);

      return ts.visitNode(rootNode, transformExtensions);
    };
  };
}
