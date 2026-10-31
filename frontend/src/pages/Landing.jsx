
import { Link } from 'react-router-dom'
import '../App.css'

function Landing() {
  return (
    <div className="landing">
      <nav className="navbar">
        <a className="brand" href="#">
          <span className="brand-icon">S</span>
          StockPilot<span className="brand-ai">AI</span>
        </a>

        <div className="nav-links">
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
        </div>

        <Link to="/login" className="nav-button">
          Sign in ↗
        </Link>
      </nav>

      <main>
        <section className="hero">
          <div className="hero-glow"></div>

          <div className="hero-content">
            <div className="eyebrow">
              <span className="live-dot"></span>
              SMARTER INVENTORY MANAGEMENT
            </div>

            <h1>
              Your inventory.
              <br />
              <span>Always one step ahead.</span>
            </h1>

            <p className="hero-description">
              Stop guessing. Start knowing. Manage your stock,
              capture purchase invoices and predict what to
              restock with StockPilot AI.
            </p>

            <div className="hero-actions">
              <Link to="/login" className="primary-button">
                Explore StockPilot <span>→</span>
              </Link>

              <a href="#features" className="secondary-button">
                Discover how it works
              </a>
            </div>

            <div className="hero-note">
              <span className="check-icon">✓</span>
              Built for smarter small businesses
            </div>
          </div>

          <div className="visual-area">
            <div className="orbit orbit-one"></div>
            <div className="orbit orbit-two"></div>

            <div className="floating-card alert-card">
              <span className="mini-icon warning">!</span>
              <div>
                <strong>Low stock detected</strong>
                <small>Inventory alert preview</small>
              </div>
              <span className="alert-pulse"></span>
            </div>

            <div className="dashboard-card">
              <div className="dash-header">
                <div>
                  <small>PRODUCT PREVIEW</small>
                  <h3>Inventory intelligence</h3>
                </div>
                <span className="dash-menu">•••</span>
              </div>

              <div className="stats-grid">
                <div className="stat-box">
                  <small>Stock visibility</small>
                  <strong>24/7</strong>
                  <span>Know what you have</span>
                </div>
                <div className="stat-box">
                  <small>Smart alerts</small>
                  <strong className="orange">AI</strong>
                  <span>Act before stockouts</span>
                </div>
              </div>

              <div className="chart-box">
                <div className="chart-heading">
                  <strong>Inventory movement</strong>
                  <small>Illustrative preview</small>
                </div>

                <div className="chart-bars">
                  {[42, 65, 48, 82, 58, 95, 72].map((height, i) => (
                    <div className="bar-column" key={i}>
                      <div
                        className="chart-bar"
                        style={{
                          height: `${height}%`,
                          animationDelay: `${i * 0.12}s`
                        }}
                      />
                    </div>
                  ))}
                </div>

                <div className="chart-days">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                    <span key={day}>{day}</span>
                  ))}
                </div>
              </div>

              <div className="recommendation">
                <div className="recommendation-icon">✦</div>
                <div>
                  <strong>Predictive restocking</strong>
                  <p>Make informed purchasing decisions</p>
                </div>
                <span className="recommendation-arrow">↗</span>
              </div>
            </div>

            <div className="floating-card invoice-card">
              <span className="invoice-icon">↗</span>
              <div>
                <strong>Invoice intelligence</strong>
                <small>Extract and review purchase data</small>
              </div>
            </div>
          </div>
        </section>

        <section className="features" id="features">
          <div className="section-heading">
            <span>ONE WORKSPACE. COMPLETE CONTROL.</span>
            <h2>Everything your inventory needs.</h2>
          </div>

          <div className="feature-grid">
            <article className="feature-card">
              <div className="feature-icon">▦</div>
              <h3>Inventory tracking</h3>
              <p>
                Manage products, quantities, prices and stock movements
                in one organized workspace.
              </p>
            </article>

            <article className="feature-card">
              <div className="feature-icon">✧</div>
              <h3>Invoice intelligence</h3>
              <p>
                Extract purchase details from invoices and review
                them before updating stock.
              </p>
            </article>

            <article className="feature-card">
              <div className="feature-icon">⌁</div>
              <h3>Predictive restocking</h3>
              <p>
                Understand stock velocity, potential stockouts and
                recommended reorder quantities.
              </p>
            </article>
          </div>
        </section>

        <section className="how-section" id="how-it-works">
          <span>LESS MANUAL WORK. MORE CONTROL.</span>
          <h2>Know your stock. Plan your next move.</h2>
          <p>
            From purchase invoices to sales and restock recommendations,
            StockPilot brings your inventory workflow together.
          </p>

          <Link to="/login" className="primary-button">
            Get started →
          </Link>
        </section>
      </main>

      <footer className="footer">
        <a className="brand" href="#">
          <span className="brand-icon">S</span>
          StockPilot<span className="brand-ai">AI</span>
        </a>
        <span>Smart inventory. Smarter decisions.</span>
        <span>Built for small businesses.</span>
      </footer>
    </div>
  )
}

export default Landing
