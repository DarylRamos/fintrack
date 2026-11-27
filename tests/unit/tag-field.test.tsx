import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { CategoryField } from "@/components/transactions/category-field";
import { matchingSuggestions, TagField } from "@/components/transactions/tag-field";

// The transaction form's Tags and Category fields (unit 2.3), rendered without a form. See
// context/feature-specs/2.3-categories-and-tags.md, Pages and UI.

function renderTags(props: Partial<Parameters<typeof TagField>[0]> = {}): string {
  return renderToStaticMarkup(
    <TagField value={["weekly", "family"]} onChange={() => {}} suggestions={["Weekly", "work", "home"]} {...props} />,
  );
}

describe("TagField", () => {
  test("each added tag is a chip button named for what it does", () => {
    const html = renderTags();
    expect(html).toContain('aria-label="Remove tag weekly"');
    expect(html).toContain('aria-label="Remove tag family"');
    expect(html).toContain('type="button"');
  });

  test("has a label, the helper text and a 30-character input linked to the suggestions", () => {
    const html = renderTags();
    expect(html).toContain('for="transaction-tags"');
    expect(html).toContain(">Tags<");
    expect(html).toContain("Press Enter or type a comma to add a tag. Up to 10.");
    expect(html).toContain('role="combobox"');
    expect(html).toContain('aria-controls="transaction-tags-suggestions"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('maxLength="30"');
    expect(html).toContain('placeholder="Add a tag"');
  });

  test("starts with the suggestion list closed and empty", () => {
    const html = renderTags();
    expect(html).toContain('role="listbox"');
    expect(html).not.toContain('role="option"');
  });

  test("shows no chip list without tags, and a field error under the field", () => {
    const html = renderTags({ value: [], error: "Use at most 10 tags." });
    expect(html).not.toContain("Added tags");
    expect(html).toContain("Use at most 10 tags.");
    expect(html).toContain('aria-invalid="true"');
  });

  test("has a polite live region for added and removed tags", () => {
    expect(renderTags()).toContain('role="status"');
  });
});

describe("matchingSuggestions", () => {
  const earlier = ["Weekly", "work", "home", "Homework", "rework"];

  test("leaves out tags already added, ignoring case", () => {
    expect(matchingSuggestions(earlier, ["weekly", "family"], "")).not.toContain("Weekly");
  });

  test("matches what's typed anywhere in the name, ignoring case, names starting with it first", () => {
    expect(matchingSuggestions(earlier, [], " WOR")).toEqual(["work", "Homework", "rework"]);
    expect(matchingSuggestions(earlier, [], "home")).toEqual(["home", "Homework"]);
  });

  test("shows at most eight", () => {
    const many = Array.from({ length: 12 }, (_, index) => `tag${index}`);
    expect(matchingSuggestions(many, [], "tag")).toHaveLength(8);
  });

  test("treats _ and % as ordinary characters", () => {
    expect(matchingSuggestions(["50%_off", "500ff"], [], "%_")).toEqual(["50%_off"]);
  });
});

describe("CategoryField", () => {
  const categories = [
    { id: "e1", type: "expense", name: "Groceries" },
    { id: "e2", type: "expense", name: "Other" },
    { id: "i1", type: "income", name: "Salary" },
  ] as const;
  const registration = { name: "categoryId", onChange: async () => {}, onBlur: async () => {}, ref: () => {} };

  test("offers No category first, then only the chosen type's categories in the given order", () => {
    const html = renderToStaticMarkup(<CategoryField categories={categories} type="expense" registration={registration} />);
    expect(html.indexOf("No category")).toBeLessThan(html.indexOf("Groceries"));
    expect(html.indexOf("Groceries")).toBeLessThan(html.indexOf("Other"));
    expect(html).not.toContain("Salary");
  });

  test("switches with the type", () => {
    const html = renderToStaticMarkup(<CategoryField categories={categories} type="income" registration={registration} />);
    expect(html).toContain("Salary");
    expect(html).not.toContain("Groceries");
  });
});
