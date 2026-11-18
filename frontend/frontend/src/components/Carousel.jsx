import { useEffect, useState } from 'react'

const slides = [
  {
    image: 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1200&q=85',
    title: 'Modern classrooms',
    text: 'Creating a better learning environment across every department.',
  },
  {
    image: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=1200&q=85',
    title: 'Advanced laboratories',
    text: 'Report equipment and lab facility concerns quickly.',
  },
  {
    image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=85',
    title: 'Clean campus spaces',
    text: 'Help maintain clean and welcoming campus facilities.',
  },
  {
    image: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=85',
    title: 'Reliable campus utilities',
    text: 'Track water, electricity and general utility complaints.',
  },
  {
    image: 'https://images.unsplash.com/photo-1564981797816-1043664bf78d?auto=format&fit=crop&w=1200&q=85',
    title: 'Student facilities',
    text: 'Better communication leads to faster campus improvements.',
  },
]

function Carousel() {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused) return undefined
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % slides.length)
    }, 4200)
    return () => window.clearInterval(timer)
  }, [paused])

  const previous = () => setIndex((index - 1 + slides.length) % slides.length)
  const next = () => setIndex((index + 1) % slides.length)

  return (
    <section
      className="advanced-carousel"
      aria-label="Campus Updates and Highlights"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="advanced-section-heading">
        <div>
          <span>Discover your campus</span>
          <h2>Campus Updates &amp; Highlights</h2>
        </div>
      </div>

      <div className="carousel-window">
        <div className="carousel-track" style={{ transform: `translateX(-${index * 100}%)` }}>
          {slides.map((slide) => (
            <article className="carousel-slide" key={slide.title}>
              <img src={slide.image} alt={slide.title} />
              <div className="carousel-overlay">
                <span>Campus highlight</span>
                <h3>{slide.title}</h3>
                <p>{slide.text}</p>
              </div>
            </article>
          ))}
        </div>
        <button type="button" className="carousel-arrow carousel-prev" onClick={previous} aria-label="Previous slide">‹</button>
        <button type="button" className="carousel-arrow carousel-next" onClick={next} aria-label="Next slide">›</button>
        <div className="carousel-dots">
          {slides.map((slide, dotIndex) => (
            <button
              type="button"
              key={slide.title}
              className={dotIndex === index ? 'active' : ''}
              aria-label={`Go to slide ${dotIndex + 1}`}
              onClick={() => setIndex(dotIndex)}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

export default Carousel
