import * as ts from 'typescript';

export function* getExtensions(
  sources: Map<string, Set<ts.SourceFile>>,
  extensions: Map<ts.SourceFile, Map<ts.Type, Map<string, ts.Identifier>>>,
  rootNode: ts.SourceFile,
  importRefs: Map<string, ts.Identifier>,
) {
  let extensionList = extensions.get(rootNode);
  if (extensionList) yield { extensionList, identifier: undefined };
  const list = sources.get(rootNode.fileName);
  if (!list) return;
  for (const item of list) {
    extensionList = extensions.get(item);
    if (extensionList) {
      yield {
        extensionList,
        identifier: importRefs.get(item.fileName),
      };
    }
  }
}
