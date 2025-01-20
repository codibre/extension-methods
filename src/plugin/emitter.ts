/* eslint-disable @typescript-eslint/no-explicit-any */
import * as ts from 'typescript';
import {
  findClassForMethod,
  createProgramAndGetTypeChecker,
  traverseImportFactoryBuilder,
  MapEx,
} from './helpers';
import { registerReferencedExtensions } from './helpers/register-referenced-extensions';

export function before() {
  const extensions = new MapEx<
    ts.SourceFile,
    MapEx<ts.Type, MapEx<string, ts.Identifier>>
  >();
  const sources = new MapEx<string, Set<ts.SourceFile>>();
  const sourceNameMap = new Map<string, ts.SourceFile>();
  return (context: ts.TransformationContext) => {
    const tsRef = createProgramAndGetTypeChecker(context);
    const { traverseImportFactory } = traverseImportFactoryBuilder(
      extensions,
      sources,
      tsRef,
    );

    return function transformExtensionRefs(rootNode: ts.SourceFile) {
      const { getExtensionCall, traverseImport } = traverseImportFactory(
        rootNode,
        sourceNameMap,
      );

      /**
       * Traverse function to register every extension the
       * declared
       * @param node The node to be analyzed
       */
      function registerExtensions(node: ts.Node): ts.Node {
        const visitNext = () =>
          ts.visitEachChild(node, registerExtensions, context);
        if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
          const visited = visitNext();
          registerReferencedExtensions(sources, node, rootNode, tsRef);
          return visited;
        }
        const decorators = ts.canHaveDecorators(node)
          ? ts.getDecorators(node)
          : undefined;
        // Handle method declarations with the @ExtensionMethod decorator
        if (!ts.isMethodDeclaration(node)) return visitNext();
        // Check for the @ExtensionMethod decorator
        const extensionDecorator = decorators?.find(
          (decorator) => decorator.getText() === '@ExtensionMethod',
        );
        const first = node.parameters[0];
        const type = first
          ? tsRef.typeChecker.getTypeAtLocation(first)
          : undefined;
        const cls = findClassForMethod(node);

        if (
          !extensionDecorator ||
          !node.parameters.length ||
          !node.modifiers?.some(
            (mod) => mod.kind === ts.SyntaxKind.StaticKeyword,
          ) ||
          !type ||
          !cls?.name
        ) {
          return visitNext();
        }
        extensions
          .getOrSet(rootNode, () => new MapEx())
          .getOrSet(type, () => new MapEx())
          .set(node.name.getText(), cls.name);
        sources.getOrSet(rootNode.fileName, () => new Set()).add(rootNode);
        sourceNameMap.set(rootNode.fileName, rootNode);
        return ts.visitEachChild(node, registerExtensions, context);
      }

      /**
       * Traverse function the replace every extension import
       * and every extension method call to static call reference
       * @param node the node to be analyzed
       */
      function transformExtensions(node: ts.Node): ts.Node {
        const visitNext = () =>
          ts.visitEachChild(node, transformExtensions, context);
        if (ts.isImportDeclaration(node)) return traverseImport(node);
        if (!ts.isCallExpression(node)) return visitNext();
        return getExtensionCall(node) ?? visitNext();
      }

      ts.visitNode(rootNode, registerExtensions);

      return ts.visitNode(rootNode, transformExtensions);
    };
  };
}
