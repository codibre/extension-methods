import * as ts from 'typescript';

export function getExtensionFromMap(
  typeChecker: ts.TypeChecker,
  extensionList: Map<ts.Type, Map<string, ts.Identifier>>,
  methodName: string,
  type: ts.Type,
) {
  for (const [key, value] of extensionList.entries()) {
    if (typeChecker.isTypeAssignableTo(type, key)) {
      const extension = value.get(methodName);
      if (extension) return extension;
    }
  }
}
