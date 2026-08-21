// Ambient `process` declaration so this package typechecks standalone
// (Next.js apps provide real types via @types/node; this is only used for
// the package's own `tsc --noEmit` and for compiling shared source).
declare const process: {
  env: Record<string, string | undefined>;
};
