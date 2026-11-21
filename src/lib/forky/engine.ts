/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * FORKY — forklift 3D untuk transisi antar menu.
 *
 * Alur satu transisi (dua kali lintas):
 *   1. "cover"  – forklift membawa peti berlabel menu tujuan dari kiri ke kanan; tirai blueprint
 *                 terbentang tepat di belakang bodinya sampai menutup layar.
 *   2. menunggu – halaman tujuan dimuat di balik tirai (callback `onCovered`).
 *   3. "reveal" – forklift (garpu kosong, peti sudah diantar) lewat lagi; tirai tergulung di
 *                 belakangnya sehingga halaman baru terbuka.
 *
 * Hemat sumber daya: three.js dimuat dari CDN hanya saat pertama dibutuhkan, render loop hanya
 * jalan selama transisi, tanpa shadow map (bayangan palsu berupa tekstur), DPR dibatasi 1.5.
 */

const THREE_URL = "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

let threePromise: Promise<any> | null = null;
export function loadThree(): Promise<any> {
  if (!threePromise) {
    threePromise = import(/* webpackIgnore: true */ THREE_URL).catch((err) => {
      threePromise = null;
      throw err;
    });
  }
  return threePromise;
}

export function webglAvailable(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

const YELLOW = 0xf5b800;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export interface ForkyRunOptions {
  label: string;
  curtain: HTMLElement;
  /** Dipanggil saat layar tertutup penuh; transisi lanjut setelah promise selesai. */
  onCovered: () => Promise<void>;
  passMs?: number;
}

export class ForkyEngine {
  private T: any;
  private renderer: any;
  private scene: any;
  private camera: any;
  private forklift: any;
  private carriage: any;
  private cargo: any;
  private crateMat: any;
  private beaconMat: any;
  private wheels: { mesh: any; radius: number }[] = [];
  private textures: any[] = [];
  private onResize = () => this.resize();
  busy = false;

  constructor(
    THREE: any,
    private canvas: HTMLCanvasElement,
  ) {
    this.T = THREE;
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    this.camera.position.set(0, 3.4, 14);
    this.camera.lookAt(0, 1.9, 0);

    this.scene.add(new THREE.HemisphereLight(0xdbeafe, 0x0b1222, 1.1));
    const key = new THREE.DirectionalLight(0xfff4dc, 1.6);
    key.position.set(6, 10, 9);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x7dd3fc, 0.9);
    rim.position.set(-8, 5, -6);
    this.scene.add(rim);

    this.build();
    this.resize();
    window.addEventListener("resize", this.onResize);
  }

  // ------------------------------------------------------------------ textures

  private tex(w: number, h: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void): any {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    draw(c.getContext("2d")!, w, h);
    const t = new this.T.CanvasTexture(c);
    t.colorSpace = this.T.SRGBColorSpace;
    t.anisotropy = 4;
    this.textures.push(t);
    return t;
  }

  private logoTex() {
    return this.tex(512, 160, (ctx, w, h) => {
      ctx.fillStyle = "#f5b800";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#18181b";
      ctx.fillRect(0, 0, w, 14);
      ctx.fillRect(0, h - 14, w, 14);
      ctx.font = '900 100px Impact, "Arial Black", sans-serif';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("FORKY", w / 2, h / 2 + 4);
    });
  }

  private hazardTex() {
    return this.tex(256, 64, (ctx, w, h) => {
      ctx.fillStyle = "#f5b800";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#18181b";
      for (let i = -h; i < w + h; i += 36) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + 18, 0);
        ctx.lineTo(i - 10, h);
        ctx.lineTo(i - 28, h);
        ctx.closePath();
        ctx.fill();
      }
    });
  }

  private shadowTex() {
    return this.tex(256, 128, (ctx, w, h) => {
      const g = ctx.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2);
      g.addColorStop(0, "rgba(0,0,0,0.55)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    });
  }

  private crateTex(label: string) {
    return this.tex(512, 512, (ctx, w, h) => {
      ctx.fillStyle = "#c89b63";
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = "#8b5e34";
      ctx.lineWidth = 28;
      ctx.strokeRect(14, 14, w - 28, h - 28);
      ctx.lineWidth = 4;
      for (let y = 110; y < h - 60; y += 95) {
        ctx.beginPath();
        ctx.moveTo(28, y);
        ctx.lineTo(w - 28, y);
        ctx.stroke();
      }
      ctx.fillStyle = "#0b1222";
      ctx.fillRect(40, h / 2 - 80, w - 80, 160);
      ctx.strokeStyle = "#f5b800";
      ctx.lineWidth = 6;
      ctx.strokeRect(40, h / 2 - 80, w - 80, 160);
      ctx.fillStyle = "#f5b800";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      // Bagi label panjang menjadi dua baris dan kecilkan huruf bila perlu.
      const words = label.toUpperCase().split(/\s+/);
      const lines: string[] = [];
      let cur = "";
      for (const word of words) {
        const next = cur ? `${cur} ${word}` : word;
        if (next.length > 14 && cur) {
          lines.push(cur);
          cur = word;
        } else cur = next;
      }
      if (cur) lines.push(cur);
      const shown = lines.slice(0, 2);
      let size = shown.length > 1 ? 50 : 64;
      ctx.font = `900 ${size}px system-ui, sans-serif`;
      while (shown.some((l) => ctx.measureText(l).width > w - 110) && size > 22) {
        size -= 2;
        ctx.font = `900 ${size}px system-ui, sans-serif`;
      }
      shown.forEach((l, i) => ctx.fillText(l, w / 2, h / 2 + (i - (shown.length - 1) / 2) * size * 1.05));
    });
  }

  // ------------------------------------------------------------------ model

  private build() {
    const T = this.T;
    const box = (w: number, h: number, d: number, mat: any, x: number, y: number, z: number, parent: any = this.forklift) => {
      const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat);
      m.position.set(x, y, z);
      parent.add(m);
      return m;
    };
    const yellow = new T.MeshStandardMaterial({ color: YELLOW, roughness: 0.38, metalness: 0.25 });
    const dark = new T.MeshStandardMaterial({ color: 0x1e2024, roughness: 0.5, metalness: 0.5 });
    const steel = new T.MeshStandardMaterial({ color: 0x9aa3ad, roughness: 0.28, metalness: 0.85 });
    const rubber = new T.MeshStandardMaterial({ color: 0x141416, roughness: 0.9 });
    const logo = new T.MeshStandardMaterial({ map: this.logoTex(), roughness: 0.4 });
    const hazard = new T.MeshStandardMaterial({ map: this.hazardTex(), roughness: 0.45 });

    this.forklift = new T.Group();

    // Bayangan palsu (jauh lebih murah dari shadow map).
    const shadow = new T.Mesh(
      new T.PlaneGeometry(5.6, 2.4),
      new T.MeshBasicMaterial({ map: this.shadowTex(), transparent: true, depthWrite: false }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(0.3, 0.01, 0);
    this.forklift.add(shadow);

    // Sasis, counterweight, bumper
    box(2.1, 0.72, 1.3, yellow, -0.2, 0.68, 0);
    box(0.65, 0.95, 1.34, yellow, -1.35, 0.82, 0);
    box(0.12, 0.24, 1.36, hazard, -1.68, 0.48, 0);

    // Logo FORKY kiri, kanan, belakang
    const decal = new T.PlaneGeometry(1.45, 0.45);
    const right = new T.Mesh(decal, logo);
    right.position.set(-0.45, 0.72, 0.661);
    this.forklift.add(right);
    const left = new T.Mesh(decal, logo);
    left.position.set(-0.45, 0.72, -0.661);
    left.rotation.y = Math.PI;
    this.forklift.add(left);
    const back = new T.Mesh(new T.PlaneGeometry(1.1, 0.36), logo);
    back.position.set(-1.69, 0.96, 0);
    back.rotation.y = -Math.PI / 2;
    this.forklift.add(back);

    // Kabin
    for (const [x, z] of [
      [0.45, 0.56],
      [0.45, -0.56],
      [-0.85, 0.56],
      [-0.85, -0.56],
    ])
      box(0.08, 1.25, 0.08, dark, x, 1.65, z);
    box(1.42, 0.08, 1.24, dark, -0.2, 2.28, 0);
    box(0.45, 0.14, 0.48, dark, -0.4, 1.15, 0);
    box(0.12, 0.52, 0.46, dark, -0.62, 1.4, 0).rotation.z = 0.12;
    const col = new T.Mesh(new T.CylinderGeometry(0.04, 0.05, 0.65, 10), dark);
    col.position.set(0.28, 1.28, 0);
    col.rotation.z = 0.35;
    this.forklift.add(col);
    const wheel = new T.Mesh(new T.TorusGeometry(0.18, 0.03, 8, 20), dark);
    wheel.position.set(0.16, 1.56, 0);
    wheel.rotation.set(0.35, Math.PI / 2, 0);
    this.forklift.add(wheel);

    // Lampu strobo + lampu depan
    const base = new T.Mesh(new T.CylinderGeometry(0.1, 0.12, 0.08, 16), dark);
    base.position.set(-0.65, 2.36, 0);
    this.forklift.add(base);
    this.beaconMat = new T.MeshStandardMaterial({ color: 0xff6a00, emissive: 0xff5500, emissiveIntensity: 2, roughness: 0.2 });
    const dome = new T.Mesh(new T.CylinderGeometry(0.08, 0.09, 0.18, 16), this.beaconMat);
    dome.position.set(-0.65, 2.48, 0);
    this.forklift.add(dome);
    const head = new T.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff3c4, emissiveIntensity: 1.8 });
    box(0.08, 0.14, 0.18, head, 0.5, 2.15, 0.45);
    box(0.08, 0.14, 0.18, head, 0.5, 2.15, -0.45);

    // Roda
    const addWheel = (x: number, z: number, r: number, w: number) => {
      const g = new T.Group();
      const tire = new T.Mesh(new T.CylinderGeometry(r, r, w, 24), rubber);
      tire.rotation.x = Math.PI / 2;
      g.add(tire);
      const rim = new T.Mesh(new T.CylinderGeometry(r * 0.56, r * 0.56, w + 0.02, 16), yellow);
      rim.rotation.x = Math.PI / 2;
      g.add(rim);
      g.add(new T.Mesh(new T.BoxGeometry(r * 0.8, 0.07, w + 0.04), dark));
      g.position.set(x, r, z);
      this.forklift.add(g);
      this.wheels.push({ mesh: g, radius: r });
    };
    addWheel(0.68, 0.72, 0.42, 0.28);
    addWheel(0.68, -0.72, 0.42, 0.28);
    addWheel(-1.05, 0.68, 0.34, 0.24);
    addWheel(-1.05, -0.68, 0.34, 0.24);

    // Mast
    box(0.14, 2.55, 0.12, dark, 1.06, 1.48, 0.42);
    box(0.14, 2.55, 0.12, dark, 1.06, 1.48, -0.42);
    box(0.1, 0.14, 0.94, dark, 1.06, 2.65, 0);
    const piston = new T.Mesh(new T.CylinderGeometry(0.06, 0.06, 2.1, 12), steel);
    piston.position.set(1.02, 1.35, 0);
    this.forklift.add(piston);

    // Garpu + muatan
    this.carriage = new T.Group();
    this.forklift.add(this.carriage);
    box(0.1, 0.55, 1.05, dark, 1.18, 0.45, 0, this.carriage);
    for (const z of [-0.32, 0.32]) {
      box(0.07, 0.52, 0.14, steel, 1.24, 0.42, z, this.carriage);
      box(1.35, 0.06, 0.14, steel, 1.9, 0.18, z, this.carriage);
    }
    this.cargo = new T.Group();
    this.carriage.add(this.cargo);
    box(1.25, 0.12, 1.25, new T.MeshStandardMaterial({ color: 0x9c6f44, roughness: 0.85 }), 1.92, 0.28, 0, this.cargo);
    this.crateMat = new T.MeshStandardMaterial({ map: this.crateTex("FORKY"), roughness: 0.75 });
    box(1.12, 1.12, 1.12, this.crateMat, 1.92, 0.9, 0, this.cargo);

    this.forklift.rotation.y = -0.18; // sedikit serong agar sisi & logo terlihat
    this.scene.add(this.forklift);
  }

  // ------------------------------------------------------------------ helpers

  private resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    // Layar sempit (HP): mundurkan kamera agar forklift tidak terlalu besar.
    this.camera.position.z = w < 640 ? 19 : 14;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  private edgeX() {
    const vFov = (this.camera.fov * Math.PI) / 180;
    const visibleH = 2 * Math.tan(vFov / 2) * this.camera.position.z;
    return (visibleH * this.camera.aspect) / 2 + 3.6;
  }

  /** Posisi X dunia → persen lebar layar. */
  private screenPct(worldX: number) {
    const v = new this.T.Vector3(worldX, 0.9, 0).project(this.camera);
    return clamp(((v.x + 1) / 2) * 100, 0, 100);
  }

  private setLabel(label: string) {
    const old = this.crateMat.map;
    this.crateMat.map = this.crateTex(label);
    this.crateMat.needsUpdate = true;
    if (old) {
      old.dispose();
      this.textures = this.textures.filter((t) => t !== old);
    }
  }

  private pass(mode: "cover" | "reveal", curtain: HTMLElement, ms: number): Promise<void> {
    const edge = this.edgeX();
    this.cargo.visible = mode === "cover";
    this.carriage.position.y = mode === "cover" ? 0.25 : 0;
    curtain.style.clipPath = mode === "cover" ? "inset(0 100% 0 0)" : "inset(0 0 0 0)";
    let prev = -edge;
    const start = performance.now();
    return new Promise((resolve) => {
      const frame = (now: number) => {
        const t = Math.min((now - start) / ms, 1);
        const x = -edge + 2 * edge * easeInOut(t);
        const dx = x - prev;
        prev = x;
        const elapsed = now - start;
        this.forklift.position.set(x, Math.abs(Math.sin(elapsed * 0.03)) * 0.025, 0);
        this.forklift.rotation.z = -dx * 0.06; // sedikit "nungging" saat akselerasi
        for (const w of this.wheels) w.mesh.rotation.z -= Math.abs(dx) / w.radius;
        this.beaconMat.emissiveIntensity = 1.4 + Math.sin(elapsed * 0.025) * 1.2;
        if (mode === "reveal") this.carriage.position.y = 0.6 * Math.sin(t * Math.PI); // garpu naik-turun "salam"

        // Tepi tirai menempel di belakang bodi forklift.
        const pct = this.screenPct(x - 1.9);
        curtain.style.clipPath = mode === "cover" ? `inset(0 ${100 - pct}% 0 0)` : `inset(0 0 0 ${pct}%)`;

        this.renderer.render(this.scene, this.camera);
        if (t < 1) requestAnimationFrame(frame);
        else resolve();
      };
      requestAnimationFrame(frame);
    });
  }

  /** Jalankan transisi lengkap. Tidak melakukan apa-apa bila transisi lain masih berjalan. */
  async run({ label, curtain, onCovered, passMs = 1600 }: ForkyRunOptions): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    try {
      this.setLabel(label);
      this.canvas.classList.add("is-active");
      curtain.classList.add("is-active");
      await this.pass("cover", curtain, passMs);
      curtain.style.clipPath = "none";
      this.renderer.clear();
      await onCovered();
      await this.pass("reveal", curtain, passMs);
    } finally {
      this.renderer.clear();
      this.canvas.classList.remove("is-active");
      curtain.classList.remove("is-active");
      curtain.style.clipPath = "";
      this.busy = false;
    }
  }

  /** Kompilasi shader di awal supaya frame pertama transisi tidak tersendat. */
  warmUp() {
    this.forklift.position.set(1000, 0, 0);
    this.renderer.compile(this.scene, this.camera);
    this.renderer.render(this.scene, this.camera);
    this.renderer.clear();
  }

  dispose() {
    window.removeEventListener("resize", this.onResize);
    this.scene.traverse((o: any) => {
      o.geometry?.dispose?.();
      const m = o.material;
      if (Array.isArray(m)) m.forEach((x) => x.dispose());
      else m?.dispose?.();
    });
    this.textures.forEach((t) => t.dispose());
    this.renderer.dispose();
  }
}
