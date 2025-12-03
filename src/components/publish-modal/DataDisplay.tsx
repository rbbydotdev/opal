import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import React from "react";

interface DataDisplayProps {
  data: Record<string, unknown>;
  className?: string;
  keyClassName?: string;
  valueClassName?: string;
}

export function DataDisplay({ data, className = "", keyClassName = "", valueClassName = "" }: DataDisplayProps) {
  const formatValue = (value: unknown): React.ReactNode => {
    if (value === null || value === undefined) {
      return <span className="italic text-muted-foreground">none</span>;
    }

    if (typeof value === "boolean") {
      return value ? <b className="font-bold">yes</b> : "no";
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return <span className="italic text-muted-foreground">none</span>;
      }
      return (
        <div className="flex flex-wrap gap-1">
          {value.map((item, index) => (
            <Badge key={index} variant="secondary" className="text-2xs">
              {String(item)}
            </Badge>
          ))}
        </div>
      );
    }

    if (typeof value === "object") {
      try {
        return <code className="text-2xs bg-muted px-1 rounded">{JSON.stringify(value)}</code>;
      } catch {
        return String(value as any);
      }
    }

    return String(value as any);
  };

  return (
    <dl className={`grid [grid-template-columns:max-content_1fr] font-mono text-2xs text-left ${className}`}>
      {Object.entries(data).map(([key, value], index) => (
        <React.Fragment key={key}>
          <dt
            className={cn(
              "font-bold px-2 py-1 capitalize",
              {
                "bg-muted/20": index % 2 === 0,
                "bg-transparent": index % 2 !== 0,
              },
              keyClassName
            )}
          >
            {key
              .toLowerCase()
              .replace(/([A-Z])/g, " $1")
              .replace(/^./, (str) => str.toLowerCase())}
            :
          </dt>
          <dd
            className={cn(
              "truncate px-2 py-1",
              {
                "bg-muted/20": index % 2 === 0,
                "bg-transparent": index % 2 !== 0,
              },
              valueClassName
            )}
          >
            {formatValue(value)}
          </dd>
        </React.Fragment>
      ))}
    </dl>
  );
}
