"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export interface ComboboxOption {
  value: string;
  label: string;
  hint?: string;
  keywords?: string[];
}

interface ComboboxProps {
  options: ComboboxOption[];
  value?: string | null;
  onChange: (value: string | undefined) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  allowClear?: boolean;
  clearLabel?: string;
  allowCreate?: boolean;
  createLabel?: (query: string) => string;
  disabled?: boolean;
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Select an option",
  searchPlaceholder = "Search…",
  emptyMessage = "No results found.",
  allowClear = false,
  clearLabel = "Clear selection",
  allowCreate = false,
  createLabel,
  disabled = false,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
  };

  useEffect(() => {
    if (!open) {
      setQuery("");
    }
  }, [open]);

  const selectedOption = useMemo(() => {
    if (!value) return undefined;
    return options.find((option) => option.value === value) ?? undefined;
  }, [options, value]);

  const filteredOptions = useMemo(() => {
    if (!query.trim()) return options;
    const needle = query.trim().toLowerCase();
    return options.filter((option) => {
      const haystacks = [
        option.label,
        option.hint,
        ...(option.keywords ?? []),
      ]
        .filter(Boolean)
        .map((text) => text!.toLowerCase());
      return haystacks.some((haystack) => haystack.includes(needle));
    });
  }, [options, query]);

  const buttonLabel = selectedOption?.label ?? value ?? placeholder;

  const handleSelect = (option: ComboboxOption) => {
    onChange(option.value);
    setOpen(false);
  };

  const handleClear = () => {
    onChange(undefined);
    setOpen(false);
  };

  const handleCreate = () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    onChange(trimmed);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between",
            !selectedOption && !value && "text-muted-foreground"
          )}
          disabled={disabled}
        >
          <span className="truncate">{buttonLabel}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0">
        <div className="flex items-center gap-2 border-b bg-muted/40 px-2 py-2">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            className="h-8"
            autoFocus
          />
          {allowClear && (value || selectedOption) ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleClear}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">{clearLabel}</span>
            </Button>
          ) : null}
        </div>
        <ScrollArea className="max-h-60">
          <div className="py-1">
            {filteredOptions.length === 0 ? (
              allowCreate && query.trim() ? (
                <button
                  type="button"
                  className="flex w-full items-center px-3 py-2 text-left text-sm hover:bg-muted"
                  onClick={handleCreate}
                >
                  <Check className="mr-2 h-4 w-4 opacity-0" />
                  <span>{createLabel ? createLabel(query.trim()) : `Use "${query.trim()}"`}</span>
                </button>
              ) : (
                <p className="px-3 py-4 text-sm text-muted-foreground">{emptyMessage}</p>
              )
            ) : (
              filteredOptions.map((option) => {
                const isSelected = option.value === value;
                return (
                  <button
                    type="button"
                    key={option.value}
                    onClick={() => handleSelect(option)}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted",
                      isSelected && "bg-muted"
                    )}
                  >
                    <Check className={cn("h-4 w-4", isSelected ? "opacity-100" : "opacity-0")} />
                    <div className="flex flex-col">
                      <span>{option.label}</span>
                      {option.hint ? (
                        <span className="text-xs text-muted-foreground">{option.hint}</span>
                      ) : null}
                    </div>
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
