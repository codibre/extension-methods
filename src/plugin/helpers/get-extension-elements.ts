import * as ts from 'typescript';
import { TsRef, findClassForMethod } from '.';

export function getExtensionElements(
  node: ts.MethodDeclaration,
  typeChecker: ts.TypeChecker,
) {
  const decorators = ts.getDecorators(node);
  // Check for the @ExtensionMethod decorator
  const extensionDecorator = decorators?.find(
    (decorator) => decorator.getText() === '@ExtensionMethod',
  );
  const first = node.parameters[0];
  const type = first ? typeChecker.getTypeAtLocation(first) : undefined;
  const cls = findClassForMethod(node);
  if (!extensionDecorator || !type || !cls) return undefined;
  return { type, cls };
}
