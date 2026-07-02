// Generic TypeScript type harvester — engine side, uses the project's own `typescript`
// compiler API (no version mismatch with whatever TS the repo is on). Extracts a type's
// method signatures (params + return types) from real TS types. Project-agnostic.

import ts from 'typescript'

export type ParamSig = { name: string; type: string }
export type MethodSig = { name: string; params: ParamSig[]; returns: string }
export type TsProject = { program: ts.Program; checker: ts.TypeChecker }
export type NamedType = { name: string; type: ts.Type }

// Keep alias names (Store, PagingResult) instead of expanding them inline.
const TYPE_FLAGS =
  ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope | ts.TypeFormatFlags.NoTruncation

export const loadProject = (tsconfigPath: string): TsProject => {
  const { config } = ts.readConfigFile(tsconfigPath, ts.sys.readFile)
  const parsed = ts.parseJsonConfigFileContent(config, ts.sys, tsconfigPath.replace(/[^/]+$/, ''))
  const program = ts.createProgram(parsed.fileNames, parsed.options)
  return { program, checker: program.getTypeChecker() }
}

// Members of a top-level `type <alias> = { ... }` (located by file-path suffix), each with
// its resolved property type.
export const aliasMembers = (proj: TsProject, fileSuffix: string, alias: string): NamedType[] => {
  const sf = proj.program.getSourceFiles().find(s => s.fileName.endsWith(fileSuffix))
  const node = sf?.statements.find(
    (s): s is ts.TypeAliasDeclaration => ts.isTypeAliasDeclaration(s) && s.name.text === alias,
  )
  const sym = node && proj.checker.getSymbolAtLocation(node.name)
  if (!node || !sym) return []
  return proj.checker.getPropertiesOfType(proj.checker.getDeclaredTypeOfSymbol(sym)).map(p => ({
    name: p.getName(),
    type: proj.checker.getTypeOfSymbolAtLocation(p, node),
  }))
}

// Method (call-signature-bearing) members of a type, with param + return signatures.
export const methodsOf = (proj: TsProject, type: ts.Type): MethodSig[] =>
  proj.checker.getPropertiesOfType(type).flatMap(sym => {
    const decl = sym.valueDeclaration ?? sym.getDeclarations()?.[0]
    const sig = decl && proj.checker.getTypeOfSymbolAtLocation(sym, decl).getCallSignatures()[0]
    if (!decl || !sig) return []
    return [
      {
        name: sym.getName(),
        params: sig.getParameters().map(p => ({
          name: p.getName(),
          type: proj.checker.typeToString(
            proj.checker.getTypeOfSymbolAtLocation(p, p.valueDeclaration ?? decl),
            decl,
            TYPE_FLAGS,
          ),
        })),
        returns: proj.checker.typeToString(sig.getReturnType(), decl, TYPE_FLAGS),
      },
    ]
  })

// Source file path where a type is declared (tells project src from generated/node_modules).
export const declaredIn = (type: ts.Type): string | undefined =>
  type.getSymbol()?.getDeclarations()?.[0]?.getSourceFile().fileName
