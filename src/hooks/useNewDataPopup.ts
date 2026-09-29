"use client";

/**
 * Hook: erkennt, ob seit dem letzten Besuch neue Kassendaten eingespielt wurden,
 * und liefert ein `shouldShowPopup`-Flag dafür (einmalig pro neuer Datenversion).
 *
 * Funktionsweise: `fetchLatestDataVersion()` liefert den neuesten `updated_at`
 * aus `pos_order_daily`. Diesen String vergleichen wir mit dem zuletzt gesehenen
 * Wert in localStorage. Sind sie unterschiedlich, ist "neue Daten da" — nach dem
 * Anzeigen des Popups wird der neue Wert gemerkt, damit es nicht erneut aufpoppt.
 *
 * TODO(integration): Storage-Key ggf. an bestehende App-Konventionen anpassen.
 */

import { useEffect, useState } from "react";
import { fetchLatestDataVersion } from "../lib/weekly-trend";

const STORAGE_KEY = "karmafood_finanzuebersicht_last_seen_data_version";

export function useNewDataPopup() {
  const [shouldShowPopup, setShouldShowPopup] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetchLatestDataVersion()
      .then((latest) => {
        if (cancelled || !latest) return;

        let lastSeen: string | null = null;
        try {
          lastSeen = window.localStorage.getItem(STORAGE_KEY);
        } catch {
          // localStorage kann in seltenen Fällen (privater Modus etc.) fehlschlagen —
          // dann zeigen wir das Popup im Zweifel einfach an.
        }

        if (lastSeen !== latest) {
          setShouldShowPopup(true);
        }
      })
      .finally(() => {
        if (!cancelled) setChecked(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function dismiss() {
    setShouldShowPopup(false);
    fetchLatestDataVersion()
      .then((latest) => {
        if (!latest) return;
        try {
          window.localStorage.setItem(STORAGE_KEY, latest);
        } catch {
          // ignorieren — beim nächsten Laden wird einfach erneut geprüft
        }
      })
      .catch(() => {
        // wenn das fehlschlägt, poppt es beim nächsten Besuch halt noch einmal auf
      });
  }

  return { shouldShowPopup, checked, dismiss };
}
