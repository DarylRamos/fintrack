"use client";

import { X } from "lucide-react";
import { type ChangeEvent, type KeyboardEvent, useState } from "react";

import { FormField } from "@/components/auth/form-field";
import { authInputClass } from "@/components/auth/styles";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { normalizeTags, TAG_MAX_LENGTH, tagNameProblem, TAGS_MAX } from "@/lib/validation/transaction";

// The transaction form's Tags field (unit 2.3): a text input with the user's earlier tags as suggestions,
// and the added tags as chips above it. Enter, a comma or leaving the field adds what was typed; Backspace
// in the empty input removes the last tag; each chip is one button that removes it. A polite live region
// announces each change. The schema checks the tags again on submit and in the action.
//
// The suggestions are FinTrack's own list (an ARIA combobox), not a native <datalist>: the browser draws a
// datalist's popup itself, and it can't be styled to match the field (owner's hand check, 2026-11-27). See
// context/feature-specs/2.3-categories-and-tags.md and ui-context.md, Transactions.

const INPUT_ID = "transaction-tags";
const SUGGESTIONS_ID = "transaction-tags-suggestions";
export const TAG_SUGGESTIONS_SHOWN = 8;

const chipClass =
  "inline-flex min-h-11 max-w-full cursor-pointer items-center gap-1.5 rounded-md bg-fill px-3 text-sm text-ink transition-colors duration-200 outline-none hover:bg-line focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface motion-reduce:transition-none sm:min-h-8 sm:px-2.5";

const optionClass =
  "flex min-h-11 cursor-pointer items-center rounded-md px-2.5 text-sm text-ink sm:min-h-8";

function hasTag(tags: readonly string[], name: string): boolean {
  const key = name.toLowerCase();
  return tags.some((tag) => tag.toLowerCase() === key);
}

// The earlier tags that contain what's typed, ignoring case, leaving out those already added: names that
// start with it first, then alphabetical, at most TAG_SUGGESTIONS_SHOWN. Nothing typed matches every tag.
export function matchingSuggestions(
  suggestions: readonly string[],
  added: readonly string[],
  typed: string,
): string[] {
  const key = typed.trim().toLowerCase();
  return suggestions
    .filter((name) => !hasTag(added, name) && name.toLowerCase().includes(key))
    .sort((a, b) => {
      const aStarts = a.toLowerCase().startsWith(key);
      const bStarts = b.toLowerCase().startsWith(key);
      return aStarts === bStarts ? a.localeCompare(b) : aStarts ? -1 : 1;
    })
    .slice(0, TAG_SUGGESTIONS_SHOWN);
}

export function TagField({
  value,
  onChange,
  suggestions,
  error,
}: {
  value: readonly string[];
  onChange: (tags: string[]) => void;
  suggestions: readonly string[];
  error?: string;
}) {
  const [text, setText] = useState("");
  // A problem with what was just typed (an eleventh tag, a comma inside a pasted name), shown until the
  // next change; the schema's own error, after a submit, wins over it.
  const [localError, setLocalError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  // The suggestion list opens as the user types (or presses the down arrow) and closes on a pick, Escape
  // or leaving the field. `active` is the highlighted suggestion, moved with the arrow keys.
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const matches = matchingSuggestions(suggestions, value, text);
  const expanded = open && matches.length > 0;
  const activeIndex = active < matches.length ? active : -1;

  // Adds the typed names that are new, in order. Returns false when one couldn't be added.
  function add(names: readonly string[]): boolean {
    let next = [...value];
    const added: string[] = [];
    for (const name of normalizeTags(names)) {
      if (hasTag(next, name)) {
        continue;
      }
      if (next.length >= TAGS_MAX) {
        setLocalError(`Use at most ${TAGS_MAX} tags.`);
        return false;
      }
      const problem = tagNameProblem(name);
      if (problem) {
        setLocalError(problem);
        return false;
      }
      next = [...next, name];
      added.push(name);
    }
    if (added.length > 0) {
      onChange(next);
      setAnnouncement(added.map((name) => `Tag ${name} added`).join(". "));
    }
    return true;
  }

  function close() {
    setOpen(false);
    setActive(-1);
  }

  function commit(name: string) {
    if (name.trim() !== "" && add([name])) {
      setText("");
    }
    close();
  }

  function remove(name: string) {
    onChange(value.filter((tag) => tag !== name));
    setAnnouncement(`Tag ${name} removed`);
    setLocalError(null);
  }

  function onInputChange(event: ChangeEvent<HTMLInputElement>) {
    setLocalError(null);
    const next = event.target.value;
    // A comma (typed or pasted) ends a tag: add what's before it and keep the rest as text.
    if (next.includes(",")) {
      const parts = next.split(",");
      const rest = parts.pop() ?? "";
      setText(add(parts) ? rest.trimStart() : next.replaceAll(",", ""));
      close();
      return;
    }
    setText(next);
    setOpen(next.trim() !== "");
    setActive(-1);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!expanded) {
        setOpen(true);
        setActive(event.key === "ArrowDown" ? 0 : matches.length - 1);
        return;
      }
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((activeIndex + step + matches.length) % matches.length);
    } else if (event.key === "Enter") {
      // Enter adds the highlighted suggestion, or what was typed; it never submits the form.
      event.preventDefault();
      commit(expanded && activeIndex >= 0 ? matches[activeIndex] : text);
    } else if (event.key === "Escape" && expanded) {
      event.preventDefault();
      close();
    } else if (event.key === "Backspace" && text === "" && value.length > 0) {
      event.preventDefault();
      remove(value[value.length - 1]);
    }
  }

  return (
    <FormField
      id={INPUT_ID}
      label="Tags"
      description={`Press Enter or type a comma to add a tag. Up to ${TAGS_MAX}.`}
      error={error ?? localError ?? undefined}
    >
      {(control) => (
        <div className="flex flex-col gap-2">
          {value.length > 0 ? (
            <ul className="flex flex-wrap gap-2" aria-label="Added tags">
              {value.map((name) => (
                <li key={name} className="max-w-full">
                  <button
                    type="button"
                    className={chipClass}
                    aria-label={`Remove tag ${name}`}
                    onClick={() => remove(name)}
                  >
                    <span className="truncate">{name}</span>
                    <X className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="relative">
            <Input
              {...control}
              type="text"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={expanded}
              aria-controls={SUGGESTIONS_ID}
              aria-activedescendant={expanded && activeIndex >= 0 ? `${SUGGESTIONS_ID}-${activeIndex}` : undefined}
              value={text}
              onChange={onInputChange}
              onKeyDown={onKeyDown}
              onBlur={() => commit(text)}
              autoComplete="off"
              maxLength={TAG_MAX_LENGTH}
              placeholder="Add a tag"
              className={authInputClass}
            />
            {/* Sized to its longest name (never wider than the field), so a short tag gets a small list. */}
            <ul
              id={SUGGESTIONS_ID}
              role="listbox"
              aria-label="Earlier tags"
              hidden={!expanded}
              className="absolute top-full left-0 z-20 mt-1 max-h-72 w-max max-w-full min-w-32 overflow-y-auto rounded-lg border border-line bg-surface p-1 shadow-sm dark:shadow-none"
            >
              {expanded
                ? matches.map((name, index) => (
                    <li
                      key={name}
                      id={`${SUGGESTIONS_ID}-${index}`}
                      role="option"
                      aria-selected={index === activeIndex}
                      className={cn(optionClass, index === activeIndex ? "bg-fill" : "hover:bg-fill")}
                      // Keep the focus in the input, so leaving the field doesn't add the half-typed text.
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => commit(name)}
                    >
                      <span className="truncate">{name}</span>
                    </li>
                  ))
                : null}
            </ul>
          </div>
          <p role="status" className="sr-only">
            {announcement}
          </p>
        </div>
      )}
    </FormField>
  );
}
