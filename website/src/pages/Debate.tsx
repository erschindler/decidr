import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchDebate, type Debate, type Side, sideTitle, sideArgument } from "../lib/api";
import { getCategoryInfo, formatVotes, timeAgo } from "../lib/categories";

type LoadState =
  | { kind: "loading" }
  | { kind: "ready"; debate: Debate }
  | { kind: "missing" }
  | { kind: "unconfigured" }
  | { kind: "error" };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function SidePanel({ side, votes, tone }: { side: Side | null; votes: number; tone: "a" | "b" }) {
  const title = sideTitle(side);
  const argument = sideArgument(side);
  return (
    <div className={`side-panel side-${tone}`}>
      <span className="side-letter">{tone === "a" ? "A" : "B"}</span>
      {title ? (
        <>
          <h3 className="side-title">{title}</h3>
          {argument && <p className="side-argument">{argument}</p>}
        </>
      ) : (
        <p className="side-forming">This side is still being written.</p>
      )}
      <span className="side-votes">{formatVotes(votes)} votes</span>
    </div>
  );
}

export default function Debate() {
  const { id } = useParams<{ id: string }>();
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [showHint, setShowHint] = useState(false);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    let alive = true;
    setState({ kind: "loading" });
    setShowHint(false);
    if (!id || !UUID_RE.test(id)) {
      setState({ kind: "missing" });
      return;
    }
    fetchDebate(id)
      .then((debate) => {
        if (!alive) return;
        setState(debate ? { kind: "ready", debate } : { kind: "missing" });
        if (debate) document.title = `${debate.title} — Decidr`;
      })
      .catch((err: unknown) => {
        if (!alive) return;
        console.log("[Debate] load failed:", err);
        setState(err instanceof Error && err.message === "unconfigured" ? { kind: "unconfigured" } : { kind: "error" });
      });
    return () => {
      alive = false;
      document.title = "Decidr — Settle the Debate";
    };
  }, [id]);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setAnimate(true));
    return () => cancelAnimationFrame(raf);
  }, [state.kind === "ready"]);

  const topbar = (
    <header className="topbar">
      <Link to="/" className="wordmark">
        ⚖️ Decidr
      </Link>
      <a
        className="open-app-pill"
        href={id && UUID_RE.test(id) ? `rork-app://debate/${id}` : "rork-app://"}
      >
        Open App
      </a>
    </header>
  );

  if (state.kind === "loading") {
    return (
      <>
        {topbar}
        <main className="container center-block">
          <div className="gavel-spin">⚖️</div>
          <p className="muted">Reading the courtroom docket…</p>
        </main>
      </>
    );
  }

  if (state.kind === "unconfigured") {
    return (
      <>
        {topbar}
        <main className="container center-block">
        <div className="gavel-spin">⚖️</div>
        <h2 className="block-title">The courtroom is being set up</h2>
        <p className="muted">This debate page will be available shortly. Check back soon.</p>
        <Link className="cta-button" to="/">
          What is Decidr?
        </Link>
        </main>
      </>
    );
  }

  if (state.kind === "missing" || state.kind === "error") {
    return (
      <>
        {topbar}
        <main className="container center-block">
        <div className="gavel-spin">🔨</div>
        <h2 className="block-title">{state.kind === "missing" ? "Debate not found" : "Court is in recess"}</h2>
        <p className="muted">
          {state.kind === "missing"
            ? "This debate may have been removed, or the link is incorrect."
            : "We couldn't load this debate right now. Try again in a moment."}
        </p>
        <Link className="cta-button" to="/">
          Back to Decidr
        </Link>
        </main>
      </>
    );
  }

  const { debate } = state;
  const total = Math.max(debate.total_votes, debate.votes_a + debate.votes_b);
  const pctA = total > 0 ? Math.round((debate.votes_a / total) * 100) : 50;
  const pctB = 100 - pctA;
  const cat = getCategoryInfo(debate.category);

  const openInApp = () => {
    window.location.href = `rork-app://debate/${debate.id}`;
    window.setTimeout(() => setShowHint(true), 1600);
  };

  return (
    <>
      {topbar}
      <main className="container">
      <header className={`debate-header rise`} style={{ animationDelay: "0ms" }}>
        <div className="meta-row">
          <span className="chip chip-category">
            {cat.emoji} {cat.label}
          </span>
          <span className="chip chip-muted">{timeAgo(debate.created_at)}</span>
        </div>
        <h1 className="debate-title">{debate.title}</h1>
        {debate.profiles?.display_name && (
          <p className="byline">
            opened by <strong>{debate.profiles.display_name}</strong>
          </p>
        )}
      </header>

      <section className="vs-card rise" style={{ animationDelay: "70ms" }} aria-label="The two sides">
        <SidePanel side={debate.side_a} votes={debate.votes_a} tone="a" />
        <div className="vs-badge" aria-hidden="true">
          VS
        </div>
        <SidePanel side={debate.side_b} votes={debate.votes_b} tone="b" />
      </section>

      <section className="crowd-card rise" style={{ animationDelay: "140ms" }} aria-label="Crowd vote split">
        <div className="crowd-head">
          <span className="crowd-label">THE CROWD SAYS</span>
          <span className="crowd-total">{formatVotes(total)} votes</span>
        </div>
        <div className="split-bar" role="img" aria-label={`Side A ${pctA} percent, Side B ${pctB} percent`}>
          <div className="split-a" style={{ width: animate ? `${pctA}%` : "50%" }} />
          <div className="split-b" style={{ width: animate ? `${pctB}%` : "50%" }} />
        </div>
        <div className="split-legend">
          <span className="legend-a">
            A · {pctA}%
          </span>
          <span className="legend-b">B · {pctB}%</span>
        </div>
      </section>

      <section className="sealed-card rise" style={{ animationDelay: "210ms" }}>
        <div className="sealed-icon" aria-hidden="true">
          🔒
        </div>
        <div>
          <h3 className="sealed-title">AI VERDICT SEALED</h3>
          <p className="sealed-copy">
            The AI Judge has the final ruling — but it stays locked until you vote. That's the rule:
            pick a side first, then see exactly how the AI ruled and why.
          </p>
        </div>
      </section>

      <button type="button" className="cta-button rise" style={{ animationDelay: "280ms" }} onClick={openInApp}>
        Vote &amp; Reveal the Verdict
      </button>
      {showHint && (
        <p className="hint rise">
          Didn't open? Open Decidr on your phone and search{" "}
          <strong>{debate.title.slice(0, 40)}{debate.title.length > 40 ? "…" : ""}</strong> to cast your vote.
        </p>
      )}

      <footer className="footer">
        <span>⚖️ Decidr</span>
        <span className="muted">Post both sides. Crowd votes. AI Judge rules — after you do.</span>
      </footer>
      </main>
    </>
  );
}
