import { useEffect } from "react";
import p5 from "p5";
import "./App.css";

function App() {
  useEffect(() => {
    const holder = document.getElementById("chart");
    if (!holder) return undefined;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    // ---- palette ----
    const BLUE_R = 55;
    const BLUE_G = 99;
    const BLUE_B = 200;
    const INK_V = 10;

    // ---- choreography (ms from load) ----
    const FIELD_IN = 1000;
    const ASSEMBLE_FROM = 500;
    const ASSEMBLE_SPREAD = 3200;
    const ASSEMBLE_DUR = 1300;
    const ROT_SPEED = 0.00034;

    const sketch = function (p) {
      let W = 0;
      let H = 0;
      let bodyPts = [];
      let field = [];
      let startMs = -1;
      let nextRip = 4200;

      function norm(v) {
        const l = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]) || 1;
        return [v[0] / l, v[1] / l, v[2] / l];
      }
      function cross(a, b) {
        return [
          a[1] * b[2] - a[2] * b[1],
          a[2] * b[0] - a[0] * b[2],
          a[0] * b[1] - a[1] * b[0],
        ];
      }
      function easeOutCubic(x) {
        return 1 - Math.pow(1 - x, 3);
      }
      function clamp01(x) {
        return x < 0 ? 0 : x > 1 ? 1 : x;
      }

      function bodyParts() {
        function mirror(part) {
          return {
            a: [-part.a[0], part.a[1], part.a[2]],
            b: [-part.b[0], part.b[1], part.b[2]],
            r0: part.r0,
            r1: part.r1,
            zone: part.zone,
          };
        }

        const armU = {
          a: [0.105, -0.295, 0],
          b: [0.15, -0.115, 0.012],
          r0: 0.031,
          r1: 0.026,
          zone: "arm",
        };
        const armL = {
          a: [0.15, -0.115, 0.012],
          b: [0.168, 0.05, 0.028],
          r0: 0.026,
          r1: 0.019,
          zone: "arm",
        };
        const hand = {
          a: [0.168, 0.05, 0.028],
          b: [0.172, 0.105, 0.04],
          r0: 0.019,
          r1: 0.013,
          zone: "arm",
        };
        const thigh = {
          a: [0.056, -0.005, 0],
          b: [0.063, 0.245, 0.006],
          r0: 0.055,
          r1: 0.038,
          zone: "leg",
        };
        const shin = {
          a: [0.063, 0.245, 0.006],
          b: [0.067, 0.462, -0.008],
          r0: 0.038,
          r1: 0.026,
          zone: "leg",
        };
        const foot = {
          a: [0.067, 0.47, -0.005],
          b: [0.07, 0.487, 0.075],
          r0: 0.024,
          r1: 0.016,
          zone: "leg",
        };

        return [
          {
            a: [0, -0.315, 0],
            b: [0, -0.135, 0],
            r0: 0.096,
            r1: 0.072,
            zone: "chest",
          },
          {
            a: [0, -0.135, 0],
            b: [0, -0.015, 0],
            r0: 0.072,
            r1: 0.084,
            zone: "torso",
          },
          {
            a: [0, -0.36, 0],
            b: [0, -0.31, 0],
            r0: 0.03,
            r1: 0.038,
            zone: "torso",
          },
          armU,
          armL,
          hand,
          mirror(armU),
          mirror(armL),
          mirror(hand),
          thigh,
          shin,
          foot,
          mirror(thigh),
          mirror(shin),
          mirror(foot),
        ];
      }

      function buildBody(U, count) {
        const parts = bodyParts();
        const pts = [];

        const weights = [];
        let total = 0;
        parts.forEach((pt2) => {
          const dx = pt2.b[0] - pt2.a[0];
          const dy = pt2.b[1] - pt2.a[1];
          const dz = pt2.b[2] - pt2.a[2];
          const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
          const w = len * (pt2.r0 + pt2.r1) * 0.5 + 0.0008;
          weights.push(w);
          total += w;
        });

        const headW = 0.06 * 0.06 * 3.4;
        total += headW;

        function capsulePoint(part) {
          const t = Math.random();
          const axis = norm([
            part.b[0] - part.a[0],
            part.b[1] - part.a[1],
            part.b[2] - part.a[2],
          ]);
          const helper = Math.abs(axis[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
          const n1 = norm(cross(axis, helper));
          const n2 = norm(cross(axis, n1));
          const phi = Math.random() * Math.PI * 2;
          const r =
            (part.r0 + (part.r1 - part.r0) * t) * (0.86 + Math.random() * 0.2);
          const nx = n1[0] * Math.cos(phi) + n2[0] * Math.sin(phi);
          const ny = n1[1] * Math.cos(phi) + n2[1] * Math.sin(phi);
          const nz = n1[2] * Math.cos(phi) + n2[2] * Math.sin(phi);

          return {
            pos: [
              (part.a[0] + (part.b[0] - part.a[0]) * t + nx * r) * U,
              (part.a[1] + (part.b[1] - part.a[1]) * t + ny * r) * U,
              (part.a[2] + (part.b[2] - part.a[2]) * t + nz * r) * U,
            ],
            n: [nx, ny, nz],
            zone: part.zone,
          };
        }

        function headPoint() {
          const u = Math.random() * 2 - 1;
          const phi = Math.random() * Math.PI * 2;
          const s = Math.sqrt(1 - u * u);
          const n = [s * Math.cos(phi), u, s * Math.sin(phi)];
          const r = 0.062 * (0.88 + Math.random() * 0.18);
          return {
            pos: [n[0] * r * U, -0.435 * U + n[1] * r * 0.94 * U, n[2] * r * U],
            n,
            zone: "head",
          };
        }

        for (let i = 0; i < count; i++) {
          let pick = Math.random() * total;
          let acc = 0;
          let made = null;
          for (let pi2 = 0; pi2 < parts.length; pi2++) {
            acc += weights[pi2];
            if (pick <= acc) {
              made = capsulePoint(parts[pi2]);
              break;
            }
          }
          if (!made) made = headPoint();

          made.jAmp = 0.6 + Math.random() * 1.6;
          made.jFreq = 0.0008 + Math.random() * 0.0012;
          made.jPhase = Math.random() * Math.PI * 2;
          made.startAt = ASSEMBLE_FROM + Math.random() * ASSEMBLE_SPREAD;
          made.mode = "body";
          made.blend = 0;
          made.aScale = 0.55 + Math.random() * 0.85;
          made.aYaw = Math.random() * Math.PI * 2;
          made.aCYoff = (Math.random() - 0.5) * 0.22;
          made.bbAmp = 0.03 + Math.random() * 0.15;
          made.bbFreq = 0.00025 + Math.random() * 0.0005;
          made.bbPhase = Math.random() * Math.PI * 2;
          made.lz = [
            (Math.random() - 0.5) * 30,
            (Math.random() - 0.5) * 30,
            10 + Math.random() * 28,
          ];

          const sa = Math.random() * Math.PI * 2;
          const su = Math.random() * 2 - 1;
          const sr = U * (0.7 + Math.random() * 0.9);
          const ss = Math.sqrt(1 - su * su);
          made.from = [
            Math.cos(sa) * ss * sr,
            su * sr * 0.7,
            Math.sin(sa) * ss * sr,
          ];
          pts.push(made);
        }
        return pts;
      }

      function build() {
        const U = H * 0.92;
        const n = Math.max(900, Math.min(3000, Math.floor((W * H) / 240)));
        bodyPts = buildBody(U, n);
        field = [];
        const fn = Math.floor((W * H) / 5200);
        for (let i = 0; i < fn; i++) {
          field.push({
            x: (Math.random() - 0.5) * W * 1.15,
            y: (Math.random() - 0.5) * H * 1.1,
            z: (Math.random() - 0.5) * 620,
            vx: -(0.15 + Math.random() * 0.35),
            seed: Math.random() * 1000,
            a: 38 + Math.random() * 55,
            r: 1 + Math.random() * 1.5,
          });
        }
      }

      p.setup = function () {
        W = holder.clientWidth;
        H = holder.clientHeight;
        const c = p.createCanvas(W, H);
        c.parent(holder);
        p.pixelDensity(Math.min(2, window.devicePixelRatio || 1));
        build();
        if (reduceMotion) p.noLoop();
      };

      p.windowResized = function () {
        W = holder.clientWidth;
        H = holder.clientHeight;
        p.resizeCanvas(W, H);
        build();
        if (reduceMotion) p.redraw();
      };

      p.draw = function () {
        const ms = p.millis();
        if (startMs < 0) startMs = ms;
        const since = reduceMotion ? 1e9 : ms - startMs;

        p.clear();

        const cx = W > 760 ? W * 0.66 : W * 0.5;
        const cy = H * 0.54;
        const f = H * 2.6;
        const theta = reduceMotion ? 0.7 : ms * ROT_SPEED;
        const ct = Math.cos(theta);
        const st = Math.sin(theta);
        const fieldIn = easeOutCubic(clamp01(since / FIELD_IN));
        const breathe = Math.sin(ms * 0.0011);
        const sway = reduceMotion ? 0 : Math.sin(ms * 0.00045) * 0.035;

        p.noStroke();

        for (let fi = 0; fi < field.length; fi++) {
          const fp = field[fi];
          if (!reduceMotion) {
            fp.x += fp.vx;
            fp.y += 0.12 * Math.sin(ms * 0.0005 + fp.seed);
            if (fp.x < -W * 0.6) {
              fp.x = W * 0.6;
              fp.y = (Math.random() - 0.5) * H * 1.1;
            }
          }
          const fz = Math.max(fp.z, -f * 0.5);
          const fk = f / (f + fz);
          p.fill(
            INK_V,
            INK_V,
            INK_V,
            fp.a * fieldIn * (0.45 + 0.55 * clamp01(fk)),
          );
          p.circle(cx + fp.x * fk, cy + fp.y * fk, fp.r * 2 * fk);
        }

        const U = H * 0.92;
        const LS = U / 50;
        const aCY = -0.05 * U;
        const dtBase = 0.0038 * Math.min(2.2, (p.deltaTime || 16.7) / 16.7);

        if (!reduceMotion && since > nextRip) {
          const major = Math.random() < 0.15;
          const seedPt =
            bodyPts[Math.floor(Math.random() * bodyPts.length)].pos;
          const rr = major
            ? U * (0.42 + Math.random() * 0.24)
            : U * (0.09 + Math.random() * 0.13);

          for (let ri2 = 0; ri2 < bodyPts.length; ri2++) {
            const rb = bodyPts[ri2];
            if (rb.mode !== "body") continue;
            const rdx = rb.pos[0] - seedPt[0];
            const rdy = rb.pos[1] - seedPt[1];
            const rdz = rb.pos[2] - seedPt[2];
            const rd = Math.sqrt(rdx * rdx + rdy * rdy + rdz * rdz);
            if (rd < rr) {
              rb.mode = "tear";
              rb.flyAt = since + (rd / rr) * 280;
              rb.flyUntil =
                rb.flyAt + 1500 + Math.random() * 1700 + (major ? 900 : 0);
            }
          }

          nextRip = since + (major ? 4200 : 1500) + Math.random() * 1300;
        }

        for (let bi = 0; bi < bodyPts.length; bi++) {
          const b = bodyPts[bi];
          const a = reduceMotion
            ? 1
            : easeOutCubic(clamp01((since - b.startAt) / ASSEMBLE_DUR));
          if (a <= 0) continue;

          if (b.mode === "tear" && since >= b.flyAt) {
            b.mode = "fly";
            b.ripTarget = 0.55 + Math.random() * 0.45;
            const ps = LS * b.aScale;
            b.lz = [
              b.pos[0] / ps + (Math.random() - 0.5) * 1.4,
              b.pos[2] / ps + (Math.random() - 0.5) * 1.4,
              25 - (b.pos[1] - aCY) / ps + (Math.random() - 0.5) * 1.4,
            ];
          } else if (b.mode === "fly" && since > b.flyUntil) {
            b.mode = "recall";
          }

          b.blend +=
            ((b.mode === "fly" ? b.ripTarget : 0) - b.blend) *
            (b.mode === "fly" ? 0.14 : 0.085);
          if (b.mode === "recall" && b.blend < 0.02) {
            b.mode = "body";
            b.blend = 0;
          }

          if (!reduceMotion) {
            for (let ss2 = 0; ss2 < 2; ss2++) {
              const LX = b.lz[0];
              const LY = b.lz[1];
              const LZ = b.lz[2];
              b.lz[0] += 10 * (LY - LX) * dtBase;
              b.lz[1] += (LX * (28 - LZ) - LY) * dtBase;
              b.lz[2] += (LX * LY - (8 / 3) * LZ) * dtBase;
            }
          }

          const smear =
            b.bbAmp * (0.5 + 0.5 * Math.sin(ms * b.bbFreq + b.bbPhase));
          const eBlend = reduceMotion ? 0 : clamp01(b.blend + smear);
          let wob = Math.sin(ms * b.jFreq + b.jPhase) * b.jAmp;
          if (b.zone === "chest") wob += breathe * 2.2;

          let x = b.from[0] + (b.pos[0] - b.from[0]) * a + b.n[0] * wob;
          let y = b.from[1] + (b.pos[1] - b.from[1]) * a + b.n[1] * wob;
          let z = b.from[2] + (b.pos[2] - b.from[2]) * a + b.n[2] * wob;

          if (eBlend > 0.001) {
            const ps2 = LS * b.aScale;
            const ax0 = b.lz[0] * ps2;
            const az0 = b.lz[1] * ps2;
            const cy2 = Math.cos(b.aYaw);
            const sy2r = Math.sin(b.aYaw);
            const axp = ax0 * cy2 + az0 * sy2r;
            const azp = -ax0 * sy2r + az0 * cy2;
            const ayp = aCY + b.aCYoff * U - (b.lz[2] - 25) * ps2;
            x += (axp - x) * eBlend;
            y += (ayp - y) * eBlend;
            z += (azp - z) * eBlend;
          }

          x += sway * (H * 0.4 - y) * 0.15;

          const rx = x * ct + z * st;
          const rz = -x * st + z * ct;
          const k = f / (f + rz);
          const sx2 = cx + rx * k;
          const sy2 = cy + y * k;

          const depth = clamp01((k - 0.82) / 0.36);
          const alpha = (45 + 185 * depth) * a;
          const size = (1.1 + 1.9 * depth) * (0.6 + 0.4 * a);

          const cr = BLUE_R + (INK_V - BLUE_R) * 0.35 * eBlend;
          const cg = BLUE_G + (INK_V - BLUE_G) * 0.35 * eBlend;
          const cb = BLUE_B + (INK_V - BLUE_B) * 0.35 * eBlend;

          if (eBlend > 0.32 && b.prevX !== undefined) {
            p.stroke(cr, cg, cb, alpha * 0.75);
            p.strokeWeight(Math.max(0.7, size * 0.55));
            p.line(b.prevX, b.prevY, sx2, sy2);
            p.noStroke();
          } else {
            p.fill(cr, cg, cb, alpha);
            p.circle(sx2, sy2, size);
          }
          b.prevX = sx2;
          b.prevY = sy2;
        }
      };
    };

    const p5Instance = new p5(sketch, holder);

    function mulberry(seed) {
      return function () {
        seed |= 0;
        seed = (seed + 0x6d2b79f5) | 0;
        let z = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        z = (z + Math.imul(z ^ (z >>> 7), 61 | z)) ^ z;
        return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
      };
    }

    function makeTrace(kind, seed) {
      const rnd = mulberry(seed);
      const pts = [];
      const n = 130;
      const g = function () {
        return (rnd() + rnd() + rnd() - 1.5) * 2;
      };
      let y = 45;
      let nz = 0;
      for (let i2 = 0; i2 < n; i2++) {
        const x = (i2 / (n - 1)) * 260;
        if (kind === "aggregate") {
          y =
            45 +
            16 * Math.sin(i2 * 0.035 + 1) +
            6 * Math.sin(i2 * 0.012) +
            g() * 0.7;
        } else if (kind === "routine") {
          const phase2 = (i2 % 44) / 44;
          const lvl =
            phase2 < 0.35 ? 68 : phase2 < 0.5 ? 30 : phase2 < 0.85 ? 42 : 68;
          y += (lvl - y) * 0.35 + g() * 1.2;
        } else {
          nz += -0.3 * nz + g() * 6;
          y = 45 + nz;
        }
        if (y < 8) y = 8;
        if (y > 82) y = 82;
        pts.push(x.toFixed(1) + "," + y.toFixed(1));
      }
      return "M" + pts.join(" L");
    }

    const seeds = { aggregate: 11, routine: 47, chaos: 83 };
    const traces = document.querySelectorAll(".regime-trace");
    traces.forEach((trace) => {
      const kind = trace.getAttribute("data-trace");
      const path = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path",
      );
      path.setAttribute("d", makeTrace(kind, seeds[kind] || 7));
      path.setAttribute("pathLength", "1");
      trace.appendChild(path);
    });

    const reduceMotion2 = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if ("IntersectionObserver" in window && !reduceMotion2) {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("drawn");
              io.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.4 },
      );
      document
        .querySelectorAll(".regime")
        .forEach((regime) => io.observe(regime));
    } else {
      document
        .querySelectorAll(".regime")
        .forEach((regime) => regime.classList.add("drawn"));
    }

    return () => {
      p5Instance.remove();
      document
        .querySelectorAll(".regime")
        .forEach((regime) => regime.classList.remove("drawn"));
    };
  }, []);

  return (
    <>
      <main id="top">
        <section className="hero">
          <div className="hero-bg" aria-hidden="true">
            <div id="chart" />
          </div>
          <div className="hero-inner">
            <div className="brand">
              <div className="brand-text">
                <span className="brand-name">Mantis</span>
                <span className="brand-line">
                  Behavioral forecasting infrastructure
                </span>
              </div>
            </div>
            <h1>The last system without a digital twin is the human being.</h1>
            <p className="lede">
              Mantis builds living, predictive models of individual people —
              their physiology and behavior, forecast to the horizon where a
              decision still has to be made. Starting with medicine.
            </p>
            <p className="hero-caption">
              The twin: a living model assembled point by point from a person's
              record. Raw behavior tears away onto a strange attractor —
              chaotic, unforecastable — and the model pulls it back into form.
            </p>
          </div>
        </section>

        <section className="section" id="record">
          <p className="eyebrow">The record</p>
          <h2>A person is now measured continuously.</h2>
          <p className="prose">
            The average American spends roughly 40% of their waking life using a
            computer — nearly two decades of recorded interaction over a
            lifetime. Every one of those interactions is a measurement of a
            person's state. Fed into the right models, measurements of the state
            become forecasts of the trajectory.
          </p>
          <div className="stats" role="list">
            <div className="stat" role="listitem">
              <span className="stat-value">≈ 5,000</span>
              <span className="stat-label">
                digital interactions per person, per day
              </span>
            </div>
            <div className="stat" role="listitem">
              <span className="stat-value">≈ 250,000</span>
              <span className="stat-label">
                physiological measurements per day, from one smartwatch
              </span>
            </div>
            <div className="stat" role="listitem">
              <span className="stat-value">93%</span>
              <span className="stat-label">
                measured upper bound on the predictability of human movement
              </span>
            </div>
          </div>
        </section>

        <section className="section" id="theory">
          <p className="eyebrow">The theory</p>
          <h2>Chaos at the bottom. Stability at the top.</h2>
          <p className="prose">
            Human behavior is a chaotic system — small uncertainties compound
            until any forecast decays into noise. The atmosphere's forecast
            horizon is about two weeks, which is why weather prediction dies
            there. Our thesis:{" "}
            <strong>
              raw behavior is chaotic, but the correct coarse-grainings of it
              are not.
            </strong>{" "}
            The same averaging that lets climate be forecast for decades
            separates behavior into three regimes:
          </p>
          <div className="regimes">
            <article className="regime">
              <svg
                className="regime-trace"
                viewBox="0 0 260 90"
                preserveAspectRatio="none"
                aria-hidden="true"
                data-trace="aggregate"
              >
                <path
                  d="M0.0,58.7 L2.0,59.5 L4.0,58.8 L6.0,59.9 L8.1,60.2 L10.1,58.9 L12.1,60.2 L14.1,60.4 L16.1,61.7 L18.1,61.4 L20.2,60.7 L22.2,61.4 L24.2,61.9 L26.2,61.9 L28.2,62.7 L30.2,61.3 L32.2,61.9 L34.3,62.0 L36.3,61.7 L38.3,63.1 L40.3,61.4 L42.3,62.9 L44.3,61.8 L46.4,61.7 L48.4,62.0 L50.4,62.3 L52.4,62.5 L54.4,62.4 L56.4,60.7 L58.4,61.6 L60.5,60.5 L62.5,60.6 L64.5,61.7 L66.5,61.6 L68.5,59.9 L70.5,61.3 L72.6,59.1 L74.6,60.2 L76.6,60.0 L78.6,58.2 L80.6,59.0 L82.6,57.9 L84.7,57.2 L86.7,58.1 L88.7,56.6 L90.7,57.5 L92.7,55.7 L94.7,55.8 L96.7,54.9 L98.8,55.9 L100.8,55.1 L102.8,53.6 L104.8,52.9 L106.8,52.1 L108.8,52.7 L110.9,51.8 L112.9,51.9 L114.9,50.8 L116.9,50.2 L118.9,49.6 L120.9,49.1 L122.9,50.1 L125.0,47.9 L127.0,47.5 L129.0,47.3 L131.0,47.7 L133.0,47.1 L135.0,45.7 L137.1,44.6 L139.1,46.4 L141.1,44.5 L143.1,44.2 L145.1,44.3 L147.1,44.4 L149.1,42.4 L151.2,40.7 L153.2,41.9 L155.2,41.7 L157.2,40.5 L159.2,39.7 L161.2,38.9 L163.3,40.3 L165.3,39.9 L167.3,38.7 L169.3,38.9 L171.3,37.2 L173.3,36.9 L175.3,37.1 L177.4,37.8 L179.4,37.3 L181.4,37.5 L183.4,35.7 L185.4,36.0 L187.4,36.7 L189.5,36.5 L191.5,36.8 L193.5,34.7 L195.5,35.3 L197.5,34.8 L199.5,35.9 L201.6,34.2 L203.6,34.3 L205.6,34.4 L207.6,35.2 L209.6,35.6 L211.6,35.1 L213.6,34.4 L215.7,35.0 L217.7,34.7 L219.7,33.7 L221.7,34.8 L223.7,34.7 L225.7,33.8 L227.8,36.4 L229.8,35.2 L231.8,34.9 L233.8,36.7 L235.8,36.4 L237.8,34.8 L239.8,36.0 L241.9,37.0 L243.9,35.6 L245.9,37.4 L247.9,35.7 L249.9,37.2 L251.9,39.1 L254.0,37.5 L256.0,38.7 L258.0,40.2 L260.0,39.7"
                  pathLength={1}
                />
              </svg>
              <div className="regime-body">
                <h3>
                  Stable aggregates{" "}
                  <span className="verdict verdict-target">the target</span>
                </h3>
                <p>
                  Resting-heart-rate trends, sleep architecture, adherence
                  rates, the slow drift of a cognitive baseline. Averages over
                  the chaos beneath them — highly forecastable. This is where
                  diagnostics live.
                </p>
              </div>
            </article>

            <article className="regime">
              <svg
                className="regime-trace"
                viewBox="0 0 260 90"
                preserveAspectRatio="none"
                aria-hidden="true"
                data-trace="routine"
              >
                <path
                  d="M0.0,52.3 L2.0,58.3 L4.0,61.2 L6.0,61.8 L8.1,63.1 L10.1,64.9 L12.1,67.5 L14.1,67.8 L16.1,69.3 L18.1,69.6 L20.2,66.9 L22.2,64.8 L24.2,65.0 L26.2,66.7 L28.2,64.9 L30.2,67.2 L32.2,54.1 L34.3,44.8 L36.3,40.1 L38.3,38.2 L40.3,32.7 L42.3,31.3 L44.3,34.8 L46.4,37.4 L48.4,39.4 L50.4,39.6 L52.4,40.7 L54.4,41.1 L56.4,40.5 L58.4,39.6 L60.5,41.0 L62.5,42.1 L64.5,42.0 L66.5,40.0 L68.5,40.2 L70.5,40.2 L72.6,39.7 L74.6,41.2 L76.6,48.1 L78.6,56.0 L80.6,59.4 L82.6,63.2 L84.7,64.9 L86.7,66.0 L88.7,65.6 L90.7,67.0 L92.7,68.0 L94.7,66.5 L96.7,69.2 L98.8,69.4 L100.8,69.4 L102.8,70.3 L104.8,69.4 L106.8,68.8 L108.8,66.2 L110.9,66.3 L112.9,67.0 L114.9,67.6 L116.9,67.6 L118.9,67.6 L120.9,56.3 L122.9,46.8 L125.0,40.5 L127.0,36.9 L129.0,35.9 L131.0,34.6 L133.0,36.4 L135.0,38.7 L137.1,41.8 L139.1,40.8 L141.1,39.8 L143.1,39.5 L145.1,40.9 L147.1,40.0 L149.1,42.0 L151.2,42.3 L153.2,40.9 L155.2,39.9 L157.2,43.4 L159.2,43.1 L161.2,42.8 L163.3,42.0 L165.3,52.0 L167.3,56.9 L169.3,61.4 L171.3,64.8 L173.3,65.0 L175.3,66.9 L177.4,69.1 L179.4,69.1 L181.4,66.2 L183.4,65.2 L185.4,65.1 L187.4,66.7 L189.5,68.7 L191.5,69.6 L193.5,67.9 L195.5,68.8 L197.5,67.5 L199.5,66.9 L201.6,65.9 L203.6,66.4 L205.6,66.3 L207.6,64.8 L209.6,51.8 L211.6,43.1 L213.6,40.2 L215.7,37.3 L217.7,35.7 L219.7,31.2 L221.7,34.8 L223.7,35.2 L225.7,37.2 L227.8,39.0 L229.8,39.1 L231.8,39.7 L233.8,40.5 L235.8,41.6 L237.8,41.8 L239.8,41.3 L241.9,41.4 L243.9,40.8 L245.9,41.7 L247.9,43.4 L249.9,42.2 L251.9,42.6 L254.0,52.5 L256.0,55.9 L258.0,57.9 L260.0,59.3"
                  pathLength={1}
                />
              </svg>
              <div className="regime-body">
                <h3>
                  Stable routines{" "}
                  <span className="verdict verdict-target">reachable</span>
                </h3>
                <p>
                  Habit- and constraint-anchored patterns: where you sleep, your
                  commute, your spending categories. Measured at up to 93%
                  predictability in the <em>Science</em> mobility work.
                </p>
              </div>
            </article>

            <article className="regime">
              <svg
                className="regime-trace"
                viewBox="0 0 260 90"
                preserveAspectRatio="none"
                aria-hidden="true"
                data-trace="chaos"
              >
                <path
                  d="M0.0,45.4 L2.0,46.9 L4.0,36.7 L6.0,48.3 L8.1,42.1 L10.1,49.9 L12.1,43.5 L14.1,42.9 L16.1,36.9 L18.1,49.1 L20.2,54.4 L22.2,49.2 L24.2,46.1 L26.2,45.7 L28.2,41.1 L30.2,46.9 L32.2,50.2 L34.3,47.7 L36.3,42.3 L38.3,42.8 L40.3,39.1 L42.3,37.3 L44.3,53.9 L46.4,59.9 L48.4,56.0 L50.4,62.7 L52.4,44.8 L54.4,44.9 L56.4,53.7 L58.4,47.5 L60.5,41.9 L62.5,46.2 L64.5,55.2 L66.5,50.6 L68.5,42.9 L70.5,50.6 L72.6,41.6 L74.6,43.7 L76.6,44.9 L78.6,43.1 L80.6,52.2 L82.6,51.4 L84.7,49.7 L86.7,57.3 L88.7,42.7 L90.7,47.3 L92.7,41.1 L94.7,46.5 L96.7,47.4 L98.8,40.7 L100.8,51.9 L102.8,51.4 L104.8,50.0 L106.8,47.5 L108.8,49.0 L110.9,47.3 L112.9,46.9 L114.9,41.9 L116.9,39.9 L118.9,40.4 L120.9,40.8 L122.9,39.1 L125.0,31.0 L127.0,40.4 L129.0,46.5 L131.0,43.6 L133.0,46.5 L135.0,45.1 L137.1,41.6 L139.1,45.4 L141.1,47.3 L143.1,48.2 L145.1,38.7 L147.1,46.8 L149.1,39.8 L151.2,50.8 L153.2,40.2 L155.2,43.1 L157.2,51.8 L159.2,54.2 L161.2,49.4 L163.3,49.5 L165.3,45.5 L167.3,47.8 L169.3,54.9 L171.3,52.5 L173.3,46.9 L175.3,43.2 L177.4,47.1 L179.4,38.7 L181.4,31.8 L183.4,31.3 L185.4,36.6 L187.4,36.0 L189.5,46.5 L191.5,43.0 L193.5,34.9 L195.5,32.1 L197.5,28.5 L199.5,42.7 L201.6,49.3 L203.6,42.1 L205.6,43.3 L207.6,45.9 L209.6,48.5 L211.6,35.5 L213.6,39.1 L215.7,47.1 L217.7,46.3 L219.7,40.9 L221.7,44.4 L223.7,42.4 L225.7,46.5 L227.8,49.9 L229.8,39.4 L231.8,42.5 L233.8,48.5 L235.8,55.4 L237.8,57.7 L239.8,45.6 L241.9,50.8 L243.9,51.3 L245.9,46.9 L247.9,61.5 L249.9,57.0 L251.9,57.2 L254.0,59.3 L256.0,64.4 L258.0,64.3 L260.0,56.3"
                  pathLength={1}
                />
              </svg>
              <div className="regime-body">
                <h3>
                  Micro-chaos{" "}
                  <span className="verdict verdict-future">the long game</span>
                </h3>
                <p>
                  The next word you'll type, one impulse purchase, a momentary
                  mood spike. Beyond today's models — and exactly where we're
                  headed. The long-term goal is perfect prediction.
                </p>
              </div>
            </article>
          </div>
          <p className="prose coda">
            The questions worth answering today live almost entirely in the
            first two regimes — and that's where we start. Every model we ship
            pushes the horizon deeper into the third.
          </p>
        </section>

        <section className="section" id="company">
          <p className="eyebrow">The company</p>
          <h2>A neutral layer, like OAuth for behavior.</h2>
          <div className="prose">
            <p>
              Google, Apple, and Meta each hold a deep slice of the human record
              — but each sees only its own products, and each monetizes the data
              through one narrow business. A holistic model of the individual
              sits permanently outside every incumbent's mandate. The
              opportunity isn't too big for them. It's structurally incompatible
              with them.
            </p>
            <p>
              Mantis plays the role OAuth plays for identity, Plaid for banking,
              and Stripe for payments: a broker that succeeds precisely because
              it doesn't compete with either side. Our pipelines ingest any
              stream a person grants us — device telemetry, wearable physiology,
              digital activity, clinical records — and our models turn that
              unified record into a living, predictive twin. Companies then
              request <strong>scoped, revocable access</strong> to predictions
              from that twin, the way an app requests access through OAuth.
            </p>
          </div>
          <div
            className="flow"
            aria-label="How it works: the person grants data streams to Mantis, which builds a predictive twin and serves scoped, revocable predictions."
          >
            <div className="flow-node">
              <span className="flow-title">The person</span>
              <span className="flow-sub">
                grants data streams, holds the keys
              </span>
            </div>
            <span className="flow-arrow" aria-hidden="true">
              →
            </span>
            <div className="flow-node flow-node-solid">
              <span className="flow-title">Mantis</span>
              <span className="flow-sub">unified record → predictive twin</span>
            </div>
            <span className="flow-arrow flow-arrow-blue" aria-hidden="true">
              ⇢
            </span>
            <div className="flow-node">
              <span className="flow-title">Builders</span>
              <span className="flow-sub">scoped, revocable predictions</span>
            </div>
          </div>
          <p className="flow-note">
            We don't sell data. We sell the connection — with the person's
            consent on one side and the person's interest on both.
          </p>
        </section>

        <section className="section-dark" id="applications">
          <div className="dark-inner">
            <p className="eyebrow eyebrow-dark">Applications</p>
            <h2>
              One layer. Every product that needs a forecast of one person.
            </h2>
            <p className="prose prose-dark">
              Everything below is the same primitive — a scoped, consented
              prediction served from the twin — pointed at a different decision.
            </p>
            <div className="apps">
              <article className="app">
                <span className="app-id">TWIN-01</span>
                <h3>Pre-symptomatic detection</h3>
                <p>
                  Flag infection from wearable physiology at or before symptom
                  onset — up to nine days before the person feels it.
                </p>
              </article>
              <article className="app">
                <span className="app-id">TWIN-02</span>
                <h3>Cognitive baseline monitoring</h3>
                <p>
                  Track the slow drift of an individual's cognitive baseline and
                  surface decline months before it would show in a clinic visit.
                </p>
              </article>
              <article className="app">
                <span className="app-id">TWIN-03</span>
                <h3>Decompensation forecasting</h3>
                <p>
                  Forecast heart-failure decompensation and readmission risk
                  inside the two-week window where intervention still changes
                  the outcome.
                </p>
              </article>
              <article className="app">
                <span className="app-id">TWIN-04</span>
                <h3>Adherence prediction</h3>
                <p>
                  Predict which patients will miss medications, and when —
                  before the gap shows up in outcomes instead of after.
                </p>
              </article>
              <article className="app">
                <span className="app-id">TWIN-05</span>
                <h3>Recovery trajectories</h3>
                <p>
                  Model expected post-operative recovery and alert the care team
                  the moment a patient deviates from their twin's predicted
                  curve.
                </p>
              </article>
              <article className="app">
                <span className="app-id">TWIN-06</span>
                <h3>Relapse early warning</h3>
                <p>
                  Detect the physiological and behavioral signature that
                  precedes psychiatric relapse, while there is still time to
                  reach the person.
                </p>
              </article>
              <article className="app">
                <span className="app-id">TWIN-07</span>
                <h3>Trials on twins</h3>
                <p>
                  Match patients to trials by predicted trajectory, and run
                  counterfactual arms against digital twins instead of placebo
                  groups.
                </p>
              </article>
              <article className="app">
                <span className="app-id">TWIN-08</span>
                <h3>What we haven't thought of</h3>
                <p>
                  Any domain where a consented forecast of one person beats a
                  population average. The layer is the product — builders decide
                  the rest.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="section" id="evidence">
          <p className="eyebrow">Evidence</p>
          <h2>The ceiling has been measured.</h2>
          <ol className="references">
            <li>
              <p>
                A <strong>93% upper bound</strong> on the predictability of an
                individual's location, nearly invariant across millions of
                people.
              </p>
              <span className="ref-cite">Song et al., Science (2010)</span>
            </li>
            <li>
              <p>
                With <strong>~300 Facebook Likes</strong>, a model judged
                personality as accurately as a person's own spouse.
              </p>
              <span className="ref-cite">
                Kosinski et al., PNAS (2013, 2015)
              </span>
            </li>
            <li>
              <p>
                <strong>81% of COVID-19 cases</strong> showed physiological
                warning signs at or before symptom onset — some{" "}
                <strong>nine days early</strong> — from a smartwatch alone.
              </p>
              <span className="ref-cite">
                Mishra et al., Nature Biomedical Engineering (2020)
              </span>
            </li>
          </ol>
          <p className="prose coda">
            The signal that you are getting sick exists in your data before it
            exists in your awareness. What's missing is the layer that puts that
            reading to work for the person being read.
          </p>
        </section>

        <section className="section section-contact" id="contact">
          <p className="eyebrow">Where we begin</p>
          <h2>Medicine first.</h2>
          <p className="prose">
            We start in healthcare because it's where individual-level
            prediction is worth the most, where permission to hold sensitive
            data is most clearly defined, and where the bar for privacy,
            validation, and accountability is highest. If it works here, it
            works.
          </p>
          <div className="contact-row">
            <a className="btn" href="#">
              Write to us
            </a>
            <a className="btn btn-ghost" href="#">
              We're hiring
            </a>
            <a className="btn btn-ghost" href="#">
              Read the manifesto
            </a>
            <span className="contact-addr">georgia@mantisbiotech.com</span>
          </div>
        </section>
      </main>
      <footer className="site-footer">
        <div className="footer-brand">
          <span>Mantis Biotech</span>
        </div>
        <span>
          <a href="#">Careers</a> · <a href="#">Manifesto (PDF)</a> · © 2026 ·
          We don't sell data.
        </span>
      </footer>
    </>
  );
}

export default App;
