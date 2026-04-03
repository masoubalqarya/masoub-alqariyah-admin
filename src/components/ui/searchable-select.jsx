"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

export function SearchableSelect({
  options = [],
  value,
  onValueChange,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  className,
  disabled = false,
}) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const filteredOptions = React.useMemo(() => {
    if (!search) return options;
    return options.filter((option) =>
      option.label.toLowerCase().includes(search.toLowerCase()),
    );
  }, [options, search]);

  const selectedOption = options.find((option) => option.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
          disabled={disabled}>
          {selectedOption ? selectedOption.label : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <div className="p-2">
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8"
          />
        </div>
        <div className="max-h-64 overflow-y-auto">
          {filteredOptions.length === 0 ? (
            <div className="p-2 text-sm text-muted-foreground">
              No items found.
            </div>
          ) : (
            filteredOptions.map((option) => (
              <div
                key={option.value}
                className={cn(
                  "flex items-center px-2 py-1.5 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground",
                  value === option.value && "bg-accent text-accent-foreground",
                )}
                onClick={() => {
                  onValueChange(option.value);
                  setOpen(false);
                  setSearch("");
                }}>
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === option.value ? "opacity-100" : "opacity-0",
                  )}
                />
                {option.label}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
