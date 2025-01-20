import * as ts from 'typescript';

// Function to find the class where the method belongs
export function findClassForMethod(
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
