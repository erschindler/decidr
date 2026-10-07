import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchTrending, DebateSummary } from "../lib/api";
import { getCategoryInfo, formatVotes } from "../lib/categories";

const STEPS = [
  { emoji: "🗳️", title: "You vote first", copy: "Read both sides, pick the one that's right. Your vote is final — no peeking." },
  { emoji: "🤖", title: "The AI Judge rules", copy: "The moment you vote, the AI verdict unseals with its full reasoning." },
  { emoji: "📊", title: "See where you stand", copy: "Compare your call with the crowd, the AI, and your friends." },
];

function TrendingDebates() {
  const [debates, setDebates] = useState<DebateSummary[] | null>(null);

  useEffect(() => {
    let alive = true;
    fetchTrending(6)
      .then((rows) => {
        if (alive) setDebates(rows);
      })
      .catch((err: unknown) => {
        console.log("[Landing] trending unavailable:", err);
        if (alive) setDebates([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (!debates || debates.length === 0) return null;

  return (
    <section className="trending-section" aria-label="Trending debates">
      <h2 className="section-title">🔥 Hot in the courtroom</h2>
      <div className="trending-grid">
        {debates.map((d, i) => {
          const cat = getCategoryInfo(d.category);
          const total = Math.max(d.total_votes, d.votes_a + d.votes_b);
          const pctA = total > 0 ? Math.round((d.votes_a / total) * 100) : 50;
          return (
            <Link to={`/debate/${d.id}`} className="trend-card" key={d.id} style={{ animationDelay: `${i * 60}ms` }}>
              <span className="chip chip-category">
                {cat.emoji} {cat.label}
              </span>
              <h3 className="trend-title">{d.title}</h3>
              <div className="mini-bar" aria-hidden="true">
                <div className="split-a" style={{ width: `${pctA}%` }} />
                <div className="split-b" style={{ width: `${100 - pctA}%` }} />
              </div>
              <span className="trend-votes">{formatVotes(total)} votes</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export default function Landing() {
  useEffect(() => {
    document.title = "Decidr — Settle the Debate";
  }, []);

  return (
    <main className="container">
      <section className="hero">
        <div className="gavel-orb" aria-hidden="true">
          ⚖️
        </div>
        <h1 className="hero-title">
          Settle the debate.
          <br />
          <span className="hero-gradient">For good.</span>
        </h1>
        <p className="hero-copy">
          Post both sides of any argument. The crowd votes. The AI Judge delivers the verdict —
          but it stays <strong>sealed until you cast yours</strong>.
        </p>
        <a className="cta-button" href="#how">
          See how it works
        </a>
      </section>

      <section id="how" className="steps-section" aria-label="How Decidr works">
        <h2 className="section-title">How the verdict works</h2>
        <div className="steps-grid">
          {STEPS.map((s, i) => (
            <div className="step-card" key={s.title} style={{ animationDelay: `${i * 70}ms` }}>
              <span className="step-emoji" aria-hidden="true">
                {s.emoji}
              </span>
              <h3 className="step-title">{s.title}</h3>
              <p className="step-copy">{s.copy}</p>
            </div>
          ))}
        </div>
      </section>

      <TrendingDebates />

      <footer className="footer">
        <span>⚖️ Decidr</span>
        <span className="muted">Get the app on the App Store &amp; Google Play</span>
      </footer>
    </main>
  );
}
