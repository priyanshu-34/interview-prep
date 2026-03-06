import { useBookmarkContext } from '../contexts/BookmarkContext';

/** Use shared bookmark state. Must be inside BookmarkProvider. */
export function useBookmarks() {
  return useBookmarkContext();
}
