import { useState, useEffect } from "react";
import FingerprintJS from "@fingerprintjs/fingerprintjs";

const STORAGE_KEY = "bingo_identity";

interface Identity {
  visitorId: string;
  name: string;
}

export function useIdentity() {
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [needsName, setNeedsName] = useState(false);
  const [visitorId, setVisitorId] = useState<string>("");

  useEffect(() => {
    FingerprintJS.load()
      .then((fp) => fp.get())
      .then((result) => {
        const vid = result.visitorId;
        setVisitorId(vid);

        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const all = JSON.parse(stored) as Record<string, string>;
          if (all[vid]) {
            setIdentity({ visitorId: vid, name: all[vid] });
            return;
          }
        }
        // No name found — prompt user
        setNeedsName(true);
      });
  }, []);

  const saveName = (name: string) => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const all = stored ? JSON.parse(stored) : {};
    all[visitorId] = name;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    setIdentity({ visitorId, name });
    setNeedsName(false);
  };

  return { identity, needsName, saveName };
}
