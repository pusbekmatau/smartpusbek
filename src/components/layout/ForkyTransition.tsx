"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { BASE_PATH } from "@/lib/config";
import { ForkyEngine, loadThree, webglAvailable } from "@/lib/forky/engine";

const STORAGE_KEY = "smartpusbek:forky";
/** Hanya halaman aplikasi ini yang diberi transisi. */
const ROUTES = /^\/(dashboard|admin)(\/|$)/;

interface ForkyCtx {
  enabled: boolean;
  setEnabled: (on: boolean) => void;
}
const Ctx = createContext<ForkyCtx>({ enabled: false, setEnabled: () => {} });
export const useForky = () => useContext(Ctx);

function readPref(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
}

function labelOf(a: HTMLAnchorElement): string {
  const raw = a.getAttribute("data-forky-label") || a.getAttribute("aria-label") || a.innerText || "Menu";
  const line = raw.split("\n").map((s) => s.trim()).find(Boolean) ?? "Menu";
  return line.length > 28 ? `${line.slice(0, 27)}…` : line;
}

const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Memasang transisi FORKY pada semua tautan internal (Sidebar, kartu sektor, pencarian, dll.).
 * Klik dicegat di fase capture, lalu navigasi dilakukan lewat router saat layar tertutup tirai.
 */
export function ForkyTransition({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const curtainRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<ForkyEngine | null>(null);
  const enginePromise = useRef<Promise<ForkyEngine | null> | null>(null);
  const arrival = useRef<{ path: string; resolve: () => void } | null>(null);
  const [enabled, setEnabledState] = useState(false);
  const [label, setLabel] = useState("");

  useEffect(() => setEnabledState(readPref()), []);

  const setEnabled = useCallback((on: boolean) => {
    setEnabledState(on);
    try {
      localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
    } catch {
      /* opsional */
    }
  }, []);

  const getEngine = useCallback((): Promise<ForkyEngine | null> => {
    if (engineRef.current) return Promise.resolve(engineRef.current);
    if (!enginePromise.current) {
      enginePromise.current = (async () => {
        if (!canvasRef.current || !webglAvailable()) return null;
        try {
          const THREE = await loadThree();
          const engine = new ForkyEngine(THREE, canvasRef.current);
          engine.warmUp();
          engineRef.current = engine;
          return engine;
        } catch (err) {
          console.warn("[forky] three.js gagal dimuat, transisi dilewati.", err);
          enginePromise.current = null;
          return null;
        }
      })();
    }
    return enginePromise.current;
  }, []);

  // Siapkan mesin saat browser senggang agar klik pertama langsung jalan.
  useEffect(() => {
    if (!enabled) return;
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
    const id = idle ? idle(() => void getEngine()) : window.setTimeout(() => void getEngine(), 2500);
    return () => {
      if (!idle) clearTimeout(id);
    };
  }, [enabled, getEngine]);

  useEffect(() => () => engineRef.current?.dispose(), []);

  // Tandai halaman tujuan sudah tampil.
  useEffect(() => {
    if (arrival.current && arrival.current.path === pathname) {
      arrival.current.resolve();
      arrival.current = null;
    }
  }, [pathname]);

  useEffect(() => {
    if (!enabled) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (reduced.matches) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download") || a.hasAttribute("data-no-forky")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      let path = url.pathname;
      if (BASE_PATH && path.startsWith(BASE_PATH)) path = path.slice(BASE_PATH.length) || "/";
      if (!ROUTES.test(path) || path === pathname) return;
      if (engineRef.current?.busy) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      const target = `${path}${url.search}${url.hash}`;
      const name = labelOf(a);

      void (async () => {
        const engine = await Promise.race([getEngine(), sleep(1500).then(() => null)]);
        if (!engine || !curtainRef.current) {
          router.push(target);
          return;
        }
        setLabel(name);
        await engine.run({
          label: name,
          curtain: curtainRef.current,
          onCovered: async () => {
            const arrived = new Promise<void>((resolve) => {
              arrival.current = { path, resolve };
            });
            router.push(target);
            await Promise.race([arrived, sleep(5000)]);
            await nextFrame();
            await sleep(120);
          },
        });
      })();
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [enabled, pathname, router, getEngine]);

  return (
    <Ctx.Provider value={{ enabled, setEnabled }}>
      {children}
      <div ref={curtainRef} className="forky-curtain" aria-hidden>
        <div className="forky-curtain__inner">
          <p className="eyebrow text-gold-soft">Mengantar modul</p>
          <p className="font-display text-3xl font-semibold text-ink sm:text-5xl">{label}</p>
          <div className="forky-curtain__bar" />
        </div>
      </div>
      <canvas ref={canvasRef} className="forky-canvas" aria-hidden />
    </Ctx.Provider>
  );
}
