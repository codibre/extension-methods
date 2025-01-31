import * as ts from 'typescript';

export interface TsRef {
  program: ts.Program;
  typeChecker: ts.TypeChecker;
}
