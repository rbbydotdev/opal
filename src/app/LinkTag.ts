import React, { useEffect, useRef } from "react";

type LinkTagProps = {
  href: string;
};

export const LinkTag: React.FC<LinkTagProps> = ({ href }) => {
  const prevLinkRef = useRef<HTMLLinkElement | null>(null);

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.setAttribute("data-fake-link-tag", href);

    // Insert the new link before the old one (if any)
    if (prevLinkRef.current && prevLinkRef.current.nextSibling) {
      document.head.insertBefore(link, prevLinkRef.current.nextSibling);
    } else {
      document.head.appendChild(link);
    }

    link.onload = () => {
      // Remove the previous link after the new one has loaded
      if (prevLinkRef.current) {
        document.head.removeChild(prevLinkRef.current);
      }
      prevLinkRef.current = link;
    };

    // Fallback: if onload doesn't fire (e.g., error), remove old after a timeout
    const timeout = setTimeout(() => {
      if (prevLinkRef.current && prevLinkRef.current !== link) {
        document.head.removeChild(prevLinkRef.current);
        prevLinkRef.current = link;
      }
    }, 3000);

    return () => {
      clearTimeout(timeout);
      // Remove this link if component unmounts or href changes
      if (link.parentNode) {
        link.parentNode.removeChild(link);
      }
      // Remove any lingering link tags with this href
      const lingering = document.querySelectorAll(`link[data-fake-link-tag="${href}"]`);
      lingering.forEach((el) => el.parentNode?.removeChild(el));
    };
  }, [href]);

  return null;
};
