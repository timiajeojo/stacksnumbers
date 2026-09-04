"use client";

import { useEffect } from "react";
import { MessageSquareCode } from "lucide-react";
import Ticker from "./components/Ticker";

export default function Home() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(".reveal");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <header>
        <div className="navbar">
          <div className="logo">
            <span className="logo-mark">
            <MessageSquareCode size={15} strokeWidth={2.5} />
            </span>stacksnumbers
          </div>
          <nav className="links">
            <a href="#coverage">Coverage</a>
            <a href="#how">How it works</a>
            <a href="#">Docs</a>
          </nav>
          <div className="nav-actions">
            <a href="/auth?mode=signin" className="btn btn-ghost">
              Sign in
            </a>
            <a href="/auth?mode=signup" className="btn btn-primary">
              Get started
            </a>
          </div>
        </div>
      </header>

      <div className="wrap">
        <section className="hero" style={{ paddingTop: "88px" }}>
          <div className="reveal reveal-left">
            <div className="eyebrow">
              <span className="dot"></span>142,880 codes delivered this week
            </div>
            <h1 className="hero-title">
              A fresh number,
              <br />
              every time you need
              <br className="hide-mobile" />
              <span className="accent">one to verify.</span>
            </h1>
            <p className="hero-sub">
              Buy a real, working phone line for the minute it takes to
              receive an SMS code. No contract, no SIM card, no number tied to
              your name.
            </p>
            <div className="hero-cta">
              <a href="/auth?mode=signup" className="btn btn-primary btn-lg">
                Get a number →
              </a>
            </div>
            <div className="trust-row">
              <div className="trust-item">
                <div className="num mono">61</div>
                <div className="label">countries live</div>
              </div>
              <div className="trust-item">
                <div className="num mono">9s</div>
                <div className="label">avg. delivery</div>
              </div>
              <div className="trust-item">
                <div className="num mono">99.2%</div>
                <div className="label">codes received</div>
              </div>
              <div className="trust-item">
                <div className="num mono">220+</div>
                <div className="label">services supported</div>
              </div>
            </div>
          </div>

          <div className="reveal reveal-up" style={{ transitionDelay: "0.15s" }}>
            <Ticker />
          </div>
        </section>
      </div>

      <div className="marquee-section reveal reveal-up">
        <div className="wrap">
          <div className="marquee-label">
            WORKS WITH THE SERVICES YOU ALREADY VERIFY ON
          </div>
          <div className="marquee-row">
            <span>WhatsApp</span>
            <span>Telegram</span>
            <span>Google</span>
            <span>Instagram</span>
            <span>Discord</span>
            <span>TikTok</span>
            <span>Amazon</span>
            <span>Uber</span>
          </div>
        </div>
      </div>

      <div className="wrap">
        <section id="how">
          <div className="section-head reveal reveal-up">
            <div className="section-tag">001 · THE PROCESS</div>
            <h2 className="section-title">Three steps, one code.</h2>
            <p className="section-desc">
              Every line goes through the same lifecycle — from checkout to
              retirement — so you always know exactly where your number
              stands.
            </p>
          </div>
          <div className="flow">
            <div className="flow-step reveal reveal-up">
              <div className="flow-index">01 / PICK A LINE</div>
              <h3>Choose service &amp; country</h3>
              <p>
                Search for WhatsApp, Google, or any of 220+ services, pick a
                country, and see the live price before you commit.
              </p>
              <div className="flow-arrow">→</div>
            </div>
            <div
              className="flow-step reveal reveal-up"
              style={{ transitionDelay: "0.1s" }}
            >
              <div className="flow-index">02 / RECEIVE THE CODE</div>
              <h3>Watch it land in real time</h3>
              <p>
                Your number activates instantly. The moment the SMS arrives,
                the code appears in your dashboard — usually within 9
                seconds.
              </p>
              <div className="flow-arrow">→</div>
            </div>
            <div
              className="flow-step reveal reveal-up"
              style={{ transitionDelay: "0.2s" }}
            >
              <div className="flow-index">03 / LINE RETIRES</div>
              <h3>Number recycles safely</h3>
              <p>
                Once you confirm the code, the line closes out. It&apos;s
                never reused for the same service, so your verification stays
                clean.
              </p>
            </div>
          </div>
        </section>

        <section id="coverage">
          <div className="section-head reveal reveal-up">
            <div className="section-tag">002 · REACH</div>
            <h2 className="section-title">
              Carrier-grade coverage, not a spreadsheet of dead numbers.
            </h2>
            <p className="section-desc">
              We route through direct carrier partnerships, so lines stay
              live and codes actually arrive.
            </p>
          </div>
          <div className="stat-grid">
            <div className="stat-card reveal reveal-up">
              <div className="num">
                61<span className="unit">countries</span>
              </div>
              <div className="label">Live routing today</div>
            </div>
            <div
              className="stat-card reveal reveal-up"
              style={{ transitionDelay: "0.08s" }}
            >
              <div className="num">
                340<span className="unit">carriers</span>
              </div>
              <div className="label">Direct partnerships</div>
            </div>
            <div
              className="stat-card reveal reveal-up"
              style={{ transitionDelay: "0.16s" }}
            >
              <div className="num">
                99.2<span className="unit">%</span>
              </div>
              <div className="label">Delivery success rate</div>
            </div>
            <div
              className="stat-card reveal reveal-up"
              style={{ transitionDelay: "0.24s" }}
            >
              <div className="num">
                9<span className="unit">sec</span>
              </div>
              <div className="label">Median time to code</div>
            </div>
          </div>
        </section>

        <section>
          <div className="section-head reveal reveal-up">
            <div className="section-tag">003 · FROM THE PEOPLE USING IT</div>
            <h2 className="section-title">
              Verified on the road, not just at a desk.
            </h2>
          </div>
          <div className="quote-grid">
            <div className="quote-card reveal reveal-up">
              <p>
                &quot;stacksnumbers&apos;s eSIM activation saved me during my
                international travels. I could verify accounts without
                worrying about SIM cards!&quot;
              </p>
              <div className="quote-who">
                <div className="quote-avatar"></div>
                <div>
                  <div className="quote-name">Dara Fashina</div>
                  <div className="quote-role">Frequent traveler</div>
                </div>
              </div>
            </div>
            <div
              className="quote-card reveal reveal-up"
              style={{ transitionDelay: "0.1s" }}
            >
              <p>
                &quot;I landed in three countries in one week and never once
                hunted for a local SIM. A number was always a tap away when I
                needed a code.&quot;
              </p>
              <div className="quote-who">
                <div className="quote-avatar"></div>
                <div>
                  <div className="quote-name">Tobi Adegoke</div>
                  <div className="quote-role">Remote consultant</div>
                </div>
              </div>
            </div>
            <div
              className="quote-card reveal reveal-up"
              style={{ transitionDelay: "0.2s" }}
            >
              <p>
                &quot;My carrier charged a fortune for roaming just to
                receive one text. Now I just grab a number on stacksnumbers
                and verify in seconds.&quot;
              </p>
              <div className="quote-who">
                <div className="quote-avatar"></div>
                <div>
                  <div className="quote-name">Priya Nair</div>
                  <div className="quote-role">Digital nomad</div>
                </div>
              </div>
            </div>
          </div>
        </section>

      </div>

      <footer className="reveal reveal-up">
        <div className="wrap">
          <div className="footer-grid">
            <div className="footer-col">
              <div className="logo" style={{ marginBottom: "14px" }}>
                <span className="logo-mark">
                <MessageSquareCode size={15} strokeWidth={2.5} />
                </span>stacksnumber
              </div>
              <p style={{ fontSize: "13.5px", color: "var(--paper-dim)", maxWidth: "220px" }}>
                Real numbers, one verification at a time.
              </p>
            </div>
            <div className="footer-col">
              <h4>PRODUCT</h4>
              <a href="#">Coverage</a>
              <a href="#">Pricing</a>
              <a href="#">API docs</a>
              <a href="#">Status</a>
            </div>
            <div className="footer-col">
              <h4>COMPANY</h4>
              <a href="#">About</a>
              <a href="#">Blog</a>
              <a href="#">Careers</a>
            </div>
            <div className="footer-col">
              <h4>SUPPORT</h4>
              <a href="#">Help center</a>
              <a href="#">Contact</a>
              <a href="#">System status</a>
            </div>
            <div className="footer-col">
              <h4>LEGAL</h4>
              <a href="#">Terms</a>
              <a href="#">Privacy</a>
              <a href="#">Acceptable use</a>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© 2026 stacksnumbers. All lines routed responsibly.</span>
            <span className="mono">status: all systems live</span>
          </div>
        </div>
      </footer>
    </>
  );
}