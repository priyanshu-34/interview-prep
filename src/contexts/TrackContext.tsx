import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { tracks } from '../data';

interface TrackContextValue {
  trackId: string;
  setTrackId: (id: string) => void;
}

const TrackContext = createContext<TrackContextValue | null>(null);

const defaultTrackId = tracks[0]?.id ?? 'dsa';

export function TrackProvider({ children }: { children: ReactNode }) {
  const [trackId, setTrackId] = useState(defaultTrackId);
  const setTrack = useCallback((id: string) => setTrackId(id), []);
  return (
    <TrackContext.Provider value={{ trackId, setTrackId: setTrack }}>
      {children}
    </TrackContext.Provider>
  );
}

export function useTrack() {
  const ctx = useContext(TrackContext);
  if (!ctx) throw new Error('useTrack must be used within TrackProvider');
  return ctx;
}
