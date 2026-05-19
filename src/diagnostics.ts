import type { ItmDiagnostic } from "./model";

export interface ItmProcessingResult<TValue> {
	value: TValue;
	diagnostics: ItmDiagnostic[];
}

export class ItmDiagnosticError<TValue = unknown> extends Error {
	readonly diagnostics: ItmDiagnostic[];
	readonly partialResult: TValue | undefined;

	constructor(message: string, diagnostics: ItmDiagnostic[], partialResult?: TValue) {
		super(message);
		this.name = "ItmDiagnosticError";
		this.diagnostics = diagnostics;
		this.partialResult = partialResult;
	}
}

export function hasErrorDiagnostics(diagnostics: readonly ItmDiagnostic[] | undefined): boolean {
	return (diagnostics ?? []).some((diagnostic) => diagnostic.severity === "error");
}

export function throwOnErrorDiagnostics<TValue>(
	diagnostics: readonly ItmDiagnostic[] | undefined,
	message: string,
	partialResult?: TValue
): void {
	const collectedDiagnostics = [...(diagnostics ?? [])];

	if (!hasErrorDiagnostics(collectedDiagnostics)) {
		return;
	}

	throw new ItmDiagnosticError(message, collectedDiagnostics, partialResult);
}