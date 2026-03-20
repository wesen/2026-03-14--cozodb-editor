import type { LRLanguage } from "@codemirror/language";
import type { CompletionContext, CompletionResult } from "@codemirror/autocomplete";

export declare const cozoLanguage: LRLanguage;
export declare function cozoCompletions(
  context: CompletionContext,
): CompletionResult | null;
