import { useEffect, useState } from "react";
import { timeAgo } from "short-time-ago";

export function useTimeAgoUpdater({ date, delay }: { date?: Date | null; delay?: number }) {
  const [timeAgoStr, setTimeAgoStr] = useState("");
  useEffect(() => {
    const updateTimeAgo = () => {
      if (date) setTimeAgoStr(timeAgo(date));
    };
    const intervalTimer = setInterval(updateTimeAgo, delay || 1000);
    updateTimeAgo();

    return () => clearInterval(intervalTimer);
  }, [date, delay]);
  return timeAgoStr;
}
