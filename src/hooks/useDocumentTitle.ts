import { useEffect } from "react";

/** Sets document.title for the current route. */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = title;
  }, [title]);
}
