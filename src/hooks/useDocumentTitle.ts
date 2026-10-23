import { useLayoutEffect } from "react";

/** Sets document.title for the current route, synchronously before first paint. */
export function useDocumentTitle(title: string) {
  useLayoutEffect(() => {
    document.title = title;
  }, [title]);
}
