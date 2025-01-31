import * as ts from 'typescript';
import { getImportFileName } from './get-import-file-names';
import { TsRef } from './ts-ref';
import { MapEx } from './map-ex';

export function registerReferencedExtensions(
  sources: MapEx<string, Set<ts.SourceFile>>,
  importNode: ts.ImportDeclaration | ts.ExportDeclaration,
  currentFile: ts.SourceFile,
  tsRef: TsRef,
): ts.SourceFile | undefined {
  const fileName = getImportFileName(tsRef.program, importNode, currentFile);
  if (!fileName) return;
  const list = sources.get(fileName);
  if (!list) return;
  const currentList = sources.getOrSet(currentFile.fileName, () => new Set());
  list.forEach((x) => currentList.add(x));
}
