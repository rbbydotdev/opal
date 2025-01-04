import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export const EditableLink = ({
  children,
  depth,
  isSelected,
  onRename,
  ...props
}: React.ComponentProps<typeof Link> & {
  children: string;
  isSelected: boolean;
  onRename: (newName: string) => Promise<string>;
  depth: number;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [linkText, setLinkText] = useState(children);
  const linkRef = useRef<HTMLAnchorElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    //  attempting to focus the input immediately after setting the state might fail because the input
    //   may not yet exist in the DOM.
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // cancel on escape key and reset the text
    if (e.key === "Escape") {
      setLinkText(children);
      setIsEditing(false);
      linkRef.current?.focus();
    }
    if (e.key === "Enter") {
      if (isEditing) {
        setIsEditing(false);
        // console.log("Save", linkText);
        onRename(linkText).then((newPath) => {
          setLinkText(newPath);
          linkRef.current?.focus();
        });
      } else {
        setIsEditing(true);
      }
    } else if (e.key === " ") {
      if (!isEditing) {
        e.preventDefault(); // Prevent page scroll on space key
        linkRef.current?.click(); // Simulate click to navigate
      }
    }
  };
  const handleBlur = () => isEditing && setIsEditing(false);
  return (
    <div>
      {!isEditing ? (
        <Link
          {...props}
          ref={linkRef}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          onClick={() => {
            linkRef.current?.focus();
          }}
        >
          <div style={{ marginLeft: depth + 1 + "rem" }}>
            <File selected={isSelected}>
              <span className="py-1.5">{linkText}</span>
            </File>
          </div>
        </Link>
      ) : (
        <div style={{ marginLeft: depth + 1.5 + "rem" }}>
          <File selected={isSelected}>
            <input
              ref={inputRef}
              className="bg-transparent py-1.5 outline-none font-bold border-b border-dashed border-black"
              type="text"
              value={linkText}
              onChange={(e) => setLinkText(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
            />
          </File>
        </div>
      )}
    </div>
  );
};

export function File({ selected = false, children }: { selected?: boolean; children: React.ReactNode }) {
  return (
    <span
      className={`items-center flex gap-2 ${
        selected ? "before:content-[attr(data-star)] before:text-purple-700 " : ""
      }`}
      data-star="✦"
    >
      {children}
    </span>
  );
}
