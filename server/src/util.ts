/* eslint-disable require-jsdoc */

import {
  Diagnostic,
  DiagnosticSeverity,
  PublishDiagnosticsParams,
} from 'vscode-languageserver';
import { URI } from 'vscode-uri';
import type { ISpotlightDiagnostic } from '@spotlight-rules/spotlight-core';
import { DiagnosticSeverity as SpotlightDiagnosticSeverity } from '@stoplight/types';

/**
 * Converts a Spotlight rule violation severity into a VS Code diagnostic severity.
 * @param {DiagnosticSeverity} severity - The Spotlight diagnostic severity to convert.
 * @return {DiagnosticSeverity} The converted severity for a VS Code diagnostic.
 */
function convertSeverity(severity: SpotlightDiagnosticSeverity): DiagnosticSeverity {
  switch (severity) {
    case SpotlightDiagnosticSeverity.Error:
      return DiagnosticSeverity.Error;
    case SpotlightDiagnosticSeverity.Warning:
      return DiagnosticSeverity.Warning;
    case SpotlightDiagnosticSeverity.Information:
      return DiagnosticSeverity.Information;
    case SpotlightDiagnosticSeverity.Hint:
      return DiagnosticSeverity.Hint;
    default:
      return DiagnosticSeverity.Error;
  }
}

/**
 * Converts a Spotlight rule violation to a VS Code diagnostic.
 * @param {ISpotlightDiagnostic} problem - The Spotlight rule result to convert to a VS Code diagnostic message.
 * @return {Diagnostic} The converted VS Code diagnostic to send to the client.
 */
export function makeDiagnostic(problem: ISpotlightDiagnostic): Diagnostic {
  return {
    range: {
      start: {
        line: problem.range.start.line,
        character: problem.range.start.character,
      },
      end: {
        line: problem.range.end.line,
        character: problem.range.end.character,
      },
    },
    severity: convertSeverity(problem.severity),
    code: problem.code,
    source: 'spotlight',
    message: problem.message,
  };
}

export function makePublishDiagnosticsParams(rootDocumentUri: string, knownDependencieUris: string[], problems: ISpotlightDiagnostic[]): PublishDiagnosticsParams[] {
  const grouped = problems.reduce<Record<string, ISpotlightDiagnostic[]>>((grouped, problem) => {
    if (problem.source === undefined) {
      return grouped;
    }

    const uri = URI.file(problem.source).toString();
    if (!(uri in grouped)) {
      grouped[uri] = [];
    }

    grouped[uri].push(problem);

    return grouped;
  }, {});

  for (const uri of [...knownDependencieUris, rootDocumentUri]) {
    if ((uri in grouped)) {
      continue;
    }

    grouped[uri] = [];
  }

  return Object.entries(grouped).map(([source, problems]) => {
    return {
      uri: source,
      diagnostics: problems.map((p) => makeDiagnostic(p)),
    };
  });
}
