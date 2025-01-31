import * as ts from 'typescript';

export function getImportFileName(
  program: ts.Program,
  importNode: ts.ImportDeclaration | ts.ExportDeclaration,
  currentFile: ts.SourceFile,
) {
  const moduleSpecifier = importNode.moduleSpecifier;

  if (!moduleSpecifier || !ts.isStringLiteral(moduleSpecifier)) {
    return undefined;
  }
  const importPath = moduleSpecifier.text;
  const resolvedModule = ts.resolveModuleName(
    importPath,
    currentFile.fileName,
    program.getCompilerOptions(),
    ts.sys,
  ).resolvedModule;
  const fileName = resolvedModule?.resolvedFileName;
  if (!fileName) return undefined;
  return fileName;
}
