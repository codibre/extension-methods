import * as ts from 'typescript';
import { TsRef } from './ts-ref';

export function createProgramAndGetTypeChecker(
  context: ts.TransformationContext,
): TsRef {
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
