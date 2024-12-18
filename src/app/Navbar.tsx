import clsx from "clsx";
import { Children } from "react";

export function Navbar({ className, children }: { children?: React.ReactNode; className?: string }) {
  return (
    <nav className={clsx("w-full flex", "min-h-[--navbar-height]", className)}>
      <ul className="flex gap-2 justify-center items-center">
        {Children.map(children, (child, index) => (
          <li key={index} className="flex">
            {child}
          </li>
        ))}
      </ul>
    </nav>
  );
}
