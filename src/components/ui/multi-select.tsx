import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  emptyMessage?: string;
  searchPlaceholder?: string;
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "Select options",
  emptyMessage = "No results found.",
  searchPlaceholder = "Search...",
}: MultiSelectProps) {
  const selectedSet = useMemo(() => new Set(value), [value]);
  const [query, setQuery] = useState("");

  const filteredOptions = useMemo(() => {
    if (!query.trim()) return options;
    const lower = query.toLowerCase();
    return options.filter((option) => option.label.toLowerCase().includes(lower));
  }, [options, query]);

  const toggleValue = (optionValue: string) => {
    const next = new Set(selectedSet);
    if (next.has(optionValue)) {
      next.delete(optionValue);
    } else {
      next.add(optionValue);
    }
    onChange(Array.from(next));
  };

  const selectedOptions = useMemo(() => {
    if (value.length === 0) return [];
    return options.filter((option) => selectedSet.has(option.value));
  }, [options, selectedSet, value.length]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded="false"
          className={cn(
            "w-full justify-between",
            selectedOptions.length === 0 && "text-muted-foreground"
          )}
        >
          <div className="flex flex-wrap gap-1">
            {selectedOptions.length ? (
              selectedOptions.map((option) => (
                <Badge key={option.value} variant="secondary">
                  {option.label}
                </Badge>
              ))
            ) : (
              <span>{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0">
        <div className="p-2">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            className="h-8"
          />
        </div>
        <ScrollArea className="max-h-64">
          <div className="py-1">
            {filteredOptions.length === 0 ? (
              <p className="px-3 py-4 text-sm text-muted-foreground">{emptyMessage}</p>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = selectedSet.has(option.value);
                return (
                  <button
                    type="button"
                    key={option.value}
                    onClick={() => toggleValue(option.value)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                    role="menuitemcheckbox"
                    aria-checked={isSelected}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "flex h-4 w-4 items-center justify-center rounded border transition-colors",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted bg-background"
                      )}
                    >
                      {isSelected ? <Check className="h-3 w-3" /> : null}
                    </span>
                    <span>{option.label}</span>
                    {isSelected ? (
                      <Check className="ml-auto h-4 w-4 text-muted-foreground" />
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
