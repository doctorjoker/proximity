import { useEffect, useMemo, useState } from "react";

const MANIFEST_URL = "/devices/manifest.json";

const normalize = (value) => String(value || "")
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/g, "");

const scoreEntry = (entry, manufacturer, model, productClass) => {
  const haystack = normalize([
    entry?.path,
    entry?.name,
    entry?.vendor,
    entry?.model,
    ...(Array.isArray(entry?.aliases) ? entry.aliases : []),
  ].filter(Boolean).join(" "));

  const modelKey = normalize(model);
  const productKey = normalize(productClass);
  const manufacturerKey = normalize(manufacturer);

  let score = 0;
  if (modelKey && haystack.includes(modelKey)) score += 100;
  if (productKey && haystack.includes(productKey)) score += 70;
  if (manufacturerKey && haystack.includes(manufacturerKey)) score += 20;
  if (/unknown|generic|default/.test(haystack)) score -= 10;
  return score;
};

export function useDeviceImage({ manufacturer, model, productClass, explicitImage }) {
  const [manifest, setManifest] = useState([]);
  const [manifestLoaded, setManifestLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(MANIFEST_URL, { credentials: "same-origin" })
      .then((response) => response.ok ? response.json() : { items: [] })
      .then((body) => {
        if (!active) return;
        setManifest(Array.isArray(body) ? body : Array.isArray(body?.items) ? body.items : []);
      })
      .catch(() => {
        if (active) setManifest([]);
      })
      .finally(() => {
        if (active) setManifestLoaded(true);
      });
    return () => { active = false; };
  }, []);

  return useMemo(() => {
    if (explicitImage) return { src: explicitImage, source: "profile" };

    const ranked = manifest
      .map((entry) => ({ entry, score: scoreEntry(entry, manufacturer, model, productClass) }))
      .filter((candidate) => candidate.score > 0)
      .sort((a, b) => b.score - a.score);

    if (ranked.length) {
      const path = ranked[0].entry?.path || ranked[0].entry?.url;
      if (path) return { src: path.startsWith("/") ? path : `/devices/${path}`, source: "catalog" };
    }

    const slug = String(model || productClass || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const vendor = String(manufacturer || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    return {
      src: slug ? `/devices/${vendor ? `${vendor}/` : ""}${slug}.png` : null,
      source: manifestLoaded ? "fallback" : "loading",
    };
  }, [explicitImage, manifest, manifestLoaded, manufacturer, model, productClass]);
}
