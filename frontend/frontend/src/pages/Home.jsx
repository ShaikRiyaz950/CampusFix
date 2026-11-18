import Button from '../components/Button'
import ScrollReveal from '../components/ScrollReveal'
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion'
import {
  FilePlus2,
  Activity,
  Zap,
  Headset,
  Building2,
  ShieldCheck,
  MessageCircle,
  Eye,
} from 'lucide-react'
import GradientIcon from '../components/icons/GradientIcon'

const features = [
  {
    icon: FilePlus2,
    title: 'Easy complaint submission',
    description: 'Report campus issues in a few steps with details, category and location.',
  },
  {
    icon: Activity,
    title: 'Real-time status tracking',
    description: 'Follow your complaint from Pending to In Progress and Resolved.',
  },
  {
    icon: Zap,
    title: 'Faster communication',
    description: 'Create a clear connection between students and campus administration.',
  },
  {
    icon: Headset,
    title: 'Student support',
    description: 'Get help quickly whenever you need assistance with campus issues.',
  },
  {
    icon: Building2,
    title: 'Campus management',
    description: 'Keep facilities, classrooms and shared spaces organized and visible.',
  },
  {
    icon: ShieldCheck,
    title: 'Secure access',
    description: 'Use protected student accounts and clear, controlled interactions.',
  },
  {
    icon: MessageCircle,
    title: 'Clear communication',
    description: 'Share useful details and receive understandable status updates.',
  },
  {
    icon: Eye,
    title: 'Transparent tracking',
    description: 'Monitor complaint progress from submission to resolution.',
  },
]

function Home() {
  const reduceMotion = useReducedMotion()
  const { scrollYProgress } = useScroll()
  const heroShapeY = useTransform(scrollYProgress, [0, 0.35], [0, reduceMotion ? 0 : -34])
  const heroVisualY = useTransform(scrollYProgress, [0, 0.28], [0, reduceMotion ? 0 : 18])

  return (
    <>
      <section className="home-hero" id="home" aria-labelledby="home-title">
        <motion.div className="hero-floating-shape shape-one" style={{ y: heroShapeY }} aria-hidden="true" />
        <motion.div className="hero-floating-shape shape-two" style={{ y: heroVisualY }} aria-hidden="true" />
        <div className="hero-copy">
          <span className="eyebrow">Campus complaint management</span>
          <h1 id="home-title">Report campus issues. Help create real change.</h1>
          <p>
            CampusFix makes it easy for students to report problems, stay informed
            and track them until they are resolved.
          </p>
          <div className="preview-actions">
            <Button to="/register">Create account</Button>
            <Button to="/login" variant="secondary">Student login</Button>
          </div>
          <div className="hero-trust">
            <span><strong>24/7</strong> Online access</span>
            <span><strong>3-step</strong> Complaint tracking</span>
          </div>
        </div>

        <motion.div className="hero-visual" style={{ y: heroVisualY }} aria-label="CampusFix complaint dashboard preview">
          <div className="visual-topbar">
            <div>
              <span className="visual-dot blue" />
              <span className="visual-dot yellow" />
              <span className="visual-dot gray" />
            </div>
            <span>Complaint dashboard</span>
          </div>
          <div className="visual-content">
            <div className="visual-summary">
              <div><span>12</span><small>Total complaints</small></div>
              <div><span>4</span><small>Resolved</small></div>
              <div><span>3</span><small>In progress</small></div>
            </div>
            <div className="complaint-card">
              <div className="complaint-card-head">
                <div>
                  <span className="category-icon" aria-hidden="true">!</span>
                  <div>
                    <strong>Drinking water issue</strong>
                    <small>Science block, Floor 2</small>
                  </div>
                </div>
                <span className="status-pill">In progress</span>
              </div>
              <div className="progress-track">
                <span className="progress-fill" />
              </div>
              <div className="progress-labels">
                <span>Submitted</span>
                <strong>Under review</strong>
                <span>Resolved</span>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      <ScrollReveal className="about-section" direction="left">
      <section id="about" aria-labelledby="about-title">
        <div className="section-heading">
          <span className="section-kicker">About CampusFix</span>
          <h2 id="about-title">A simpler way to improve campus facilities</h2>
        </div>
        <div className="about-grid">
          <p>
            CampusFix is a digital complaint management platform designed for
            students and college administration. It replaces slow, informal
            reporting with a clear, trackable process.
          </p>
          <p>
            Students can describe problems, attach useful details and monitor
            progress. Administration receives organized complaints and can respond
            more efficiently.
          </p>
        </div>
      </section>
      </ScrollReveal>

      <ScrollReveal className="features-section" direction="up">
      <section id="features" aria-labelledby="features-title">
        <div className="section-heading centered">
          <span className="section-kicker">Why CampusFix</span>
          <h2 id="features-title">Everything you need to report and resolve</h2>
          <p>Built around a clear and accessible complaint process.</p>
        </div>
        <div className="feature-grid">
          {features.map((feature, index) => (
            <ScrollReveal key={feature.title} delay={index * 0.09}>
            <article className="feature-card">
              <GradientIcon icon={feature.icon} size={22} className="feature-number" tone="peach" />
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </article>
            </ScrollReveal>
          ))}
        </div>
      </section>
      </ScrollReveal>

      <ScrollReveal className="how-section" direction="right">
        <section id="how-it-works" aria-labelledby="how-title">
          <div className="section-heading centered">
            <span className="section-kicker">How it works</span>
            <h2 id="how-title">From issue to resolution in three steps</h2>
          </div>
          <div className="how-grid">
            {[
              ['1', 'Submit', 'Choose a category and describe the campus issue.'],
              ['2', 'Track', 'Follow every status update in your dashboard.'],
              ['3', 'Resolve', 'The administration updates the complaint until resolved.'],
            ].map(([number, title, text], index) => (
              <ScrollReveal key={title} delay={index * 0.12} className="how-step">
                <span>{number}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </ScrollReveal>
            ))}
          </div>
        </section>
      </ScrollReveal>

      <ScrollReveal className="home-stats" direction="up">
        <div className="home-stat"><strong>1.2k+</strong><span>Complaints supported</span></div>
        <div className="home-stat"><strong>92%</strong><span>Resolution rate</span></div>
        <div className="home-stat"><strong>24/7</strong><span>Online access</span></div>
        <div className="home-stat"><strong>3</strong><span>Clear progress stages</span></div>
      </ScrollReveal>

      <ScrollReveal direction="up">
      <section className="contact-section" id="contact" aria-labelledby="contact-title">
        <div>
          <span className="section-kicker light">Need assistance?</span>
          <h2 id="contact-title">Our campus support team is here to help.</h2>
        </div>
        <div className="contact-actions">
          <a className="contact-email" href="mailto:support@campusfix.edu">
            support@campusfix.edu
          </a>
          <Button to="/complaints" variant="secondary">Submit complaint</Button>
        </div>
      </section>
      </ScrollReveal>
    </>
  )
}

export default Home
