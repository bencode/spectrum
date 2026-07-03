// The parser seam — the one place structure extraction touches a language parser.
// Primitives depend on this interface, not a concrete parser, so a treeSitterParser
// (for polyglot repos) can drop in later without changing the module/symbol planes.
// v1 ships tsParser; both host repos are pure TypeScript.

import ts from 'typescript'

export type ParsedImport = { specifier: string }

export type Parser = {
  // Import/export-from/dynamic-import specifiers found in a source text.
  imports: (source: string) => ParsedImport[]
}

// Uses the TS pre-processor: fast, no tsconfig or full Program (that's reserved for the
// symbol plane's type resolution). Reuses the host's own `typescript` per harvest/ts.ts.
export const tsParser = (): Parser => ({
  imports: source =>
    ts.preProcessFile(source, true, true).importedFiles.map(f => ({ specifier: f.fileName })),
})
