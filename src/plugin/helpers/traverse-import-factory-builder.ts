import * as ts from 'typescript';
import { createImportAsDeclaration } from './create-import-as-declaration';
import { getExtensionFromMap } from './get-extension-from-map';
import { getExtensions } from './get-extensions';
import { getImportFileName } from './get-import-file-names';
import { TsRef } from './ts-ref';

function getStaticCall(
  identifier: ts.Identifier | undefined,
  extension: ts.Identifier,
  methodName: string,
  targetInstance: ts.LeftHandSideExpression,
  args: ts.NodeArray<ts.Expression>,
): ts.Node {
  return ts.factory.createCallExpression(
    ts.factory.createPropertyAccessExpression(
      identifier
        ? ts.factory.createPropertyAccessExpression(identifier, extension)
        : extension,
      ts.factory.createIdentifier(methodName),
    ),
    undefined,
    [targetInstance, ...args],
  );
}

export function traverseImportFactoryBuilder(
  extensions: Map<ts.SourceFile, Map<ts.Type, Map<string, ts.Identifier>>>,
  sources: Map<string, Set<ts.SourceFile>>,
  tsRef: TsRef,
) {
  function traverseImportFactory(
    rootNode: ts.SourceFile,
    sourceNameMap: Map<string, ts.SourceFile>,
  ) {
    const importRefs = new Map<string, ts.Identifier>();
    let importCounter = 0;
    function rewriteImport(
      node: ts.ImportDeclaration,
    ): [ts.ImportDeclaration, string | undefined] {
      if (
        ts.isImportDeclaration(node) &&
        node.importClause === undefined &&
        ts.isStringLiteral(node.moduleSpecifier)
      ) {
        const alias = `extension_${++importCounter}`; // Generate a unique alias like pkg_1, pkg_2
        return [createImportAsDeclaration(node.moduleSpecifier, alias), alias];
      }

      return [node, undefined];
    }

    function traverseImport(node: ts.ImportDeclaration) {
      const fileName = getImportFileName(tsRef.program, node, rootNode);
      if (!fileName) return node;
      const importSource = sourceNameMap.get(fileName);
      if (!importSource || !sources.get(rootNode.fileName)?.has(importSource)) {
        return node;
      }
      let name: string | undefined;
      [node, name] = rewriteImport(node);
      if (name !== undefined) {
        importRefs.set(fileName, ts.factory.createIdentifier(name));
      }
      return node;
    }

    function getExtensionCall(node: ts.CallExpression) {
      const { expression, arguments: args } = node;
      if (!ts.isPropertyAccessExpression(expression)) return undefined;
      const targetInstance = expression.expression;
      const methodName = expression.name.getText();
      if (!targetInstance || !methodName) return undefined;
      for (const { extensionList, identifier } of getExtensions(
        sources,
        extensions,
        rootNode,
        importRefs,
      )) {
        const type = tsRef.typeChecker.getTypeAtLocation(targetInstance);
        const extension = type
          ? (extensionList.get(type)?.get(methodName) ??
            getExtensionFromMap(
              tsRef.typeChecker,
              extensionList,
              methodName,
              type,
            ))
          : undefined;
        // Create the transformed call: MyExtensionClass.myExtensionMethod(myInstance)
        if (extension) {
          return getStaticCall(
            identifier,
            extension,
            methodName,
            targetInstance,
            args,
          );
        }
      }
    }

    return {
      getExtensionCall,
      traverseImport,
    };
  }

  return {
    traverseImportFactory,
  };
}
