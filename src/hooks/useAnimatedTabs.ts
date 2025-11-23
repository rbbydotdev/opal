import { useEffect, useRef } from "react";

export function useAnimatedTabs<T extends string>(activeTab: T) {
  const tabsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (tabsRef.current) {
      const activeTabElement = tabsRef.current.querySelector('[data-active-tab="true"]');
      if (activeTabElement) {
        const tabsRect = tabsRef.current.getBoundingClientRect();
        const activeTabRect = activeTabElement.getBoundingClientRect();
        tabsRef.current.style.setProperty('--underline-width', `${activeTabElement.clientWidth}px`);
        tabsRef.current.style.setProperty('--underline-left', `${activeTabRect.left - tabsRect.left}px`);
      }
    }
  }, [activeTab]);

  return { tabsRef };
}