import * as ts from 'typescript';

export function createImportAsDeclaration(
  moduleSpecifier: ts.Expression,
  alias: string,
): ts.ImportDeclaration {
  const importClause = ts.factory.createImportClause(
    false,
    ts.factory.createIdentifier(alias),
    undefined,
  );

  return ts.factory.createImportDeclaration(
    undefined,
    importClause,
    moduleSpecifier,
  );
}
