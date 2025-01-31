import * as ts from 'typescript';
import { getExtensionElements } from './helpers';

export function create(info: ts.server.PluginCreateInfo) {
  const proxy = info.languageService;
  info.project.projectService.logger.info(
    "I'm getting set up now! Check the log for this message.",
  );

  const oldGetSemanticDiagnostics = proxy.getSemanticDiagnostics;
  proxy.getSemanticDiagnostics = (fileName: string) => {
    const diagnostics = oldGetSemanticDiagnostics(fileName);

    const program = info.languageService.getProgram();
    if (!program) return [];
    const typeChecker = program.getTypeChecker();
    const sourceFile = program?.getSourceFile(fileName);
    if (sourceFile) {
      ts.forEachChild(sourceFile, function checkNode(node) {
        if (!ts.isMethodDeclaration(node)) return undefined;
        const elements = getExtensionElements(node, typeChecker);
        if (!elements) return undefined;
        const { type } = elements;
        const property = type.getProperty(node.name.getText());
        if (
          !property?.valueDeclaration ||
          !ts.isMethodDeclaration(property.valueDeclaration)
        ) {
          return undefined;
        }
        diagnostics.push({
          file: sourceFile,
          start: node.getStart(),
          length: node.getWidth(),
          messageText: `Class already has a method called ${node.name.getText()}`,
          category: ts.DiagnosticCategory.Error,
          code: 9999,
        });
        ts.forEachChild(node, checkNode);
      });
    }

    return diagnostics;
  };

  return proxy;
}
