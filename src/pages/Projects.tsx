import { Link } from 'react-router-dom'
import PageHero from '../components/PageHero'
import PageMeta from '../components/PageMeta'

const projects = [
  {
    name: 'AntiGravity',
    description: 'A medical clinic platform.',
    technologyNote: 'TODO: Add the verified technology stack.',
    linkNote: 'TODO: Add the public project link.',
  },
  {
    name: 'AI Deepfake and Media Detection',
    description: 'A web application for AI deepfake and manipulated media detection.',
    technologyNote: 'TODO: Add the verified technology stack.',
    linkNote: 'TODO: Add the public project link.',
  },
  {
    name: 'Cricket Bowler Six-Ball Runs Prediction',
    description: 'A research paper exploring prediction of runs conceded by a cricket bowler over a six-ball over.',
    technologyNote: 'TODO: Add the verified methods and technology stack.',
    linkNote: 'TODO: Add the paper or publication link.',
  },
]

export default function Projects() {
  return (
    <div className="px-5 pb-20 sm:px-8 lg:px-12">
      <PageMeta
        title="Projects"
        description="Selected medical platform, AI media detection, and cricket prediction work by Muhammad Waseem Qasim."
        path="/projects"
      />
      <div className="mx-auto max-w-6xl">
        <PageHero
          title="PROJECTS"
          eyebrow="SELECTED WORK BY MUHAMMAD WASEEM QASIM"
          accent="Full-Stack & Machine Learning"
          subline="A selection of platforms, AI applications, and applied research."
        />
        <section aria-label="Selected projects" className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {projects.map(project => (
            <article key={project.name} className="rounded-3xl border border-neutral-200 bg-surface/70 p-6 dark:border-border/10 dark:bg-surface-inverse/[0.035]">
              <h2 className="text-xl font-bold text-foreground">{project.name}</h2>
              <p className="mt-3 text-sm leading-6 text-muted">{project.description}</p>
              <p className="mt-5 text-xs leading-5 text-muted">{project.technologyNote}</p>
              <p className="mt-2 text-xs leading-5 text-muted">{project.linkNote}</p>
            </article>
          ))}
        </section>
        <nav aria-label="Portfolio pages" className="mt-10 flex flex-wrap gap-5 text-sm font-semibold">
          <Link to="/" className="text-accent-foreground hover:underline">Home</Link>
          <Link to="/about" className="text-accent-foreground hover:underline">About Muhammad Waseem Qasim</Link>
          <Link to="/work" className="text-accent-foreground hover:underline">Full portfolio</Link>
        </nav>
      </div>
    </div>
  )
}
