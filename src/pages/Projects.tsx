import { Link } from 'react-router-dom'
import PageHero from '../components/PageHero'
import PageMeta from '../components/PageMeta'

type Project = {
  name: string
  description: string
  technologies?: string[]
  liveUrl?: string
  githubUrl?: string
  paperUrl?: string
}

const projects: Project[] = [
  {
    name: 'AntiGravity',
    description: 'A medical clinic platform.',
  },
  {
    name: 'AI Deepfake and Media Detection',
    description: 'A web application for AI deepfake and manipulated media detection.',
  },
  {
    name: 'Cricket Bowler Six-Ball Runs Prediction',
    description: 'A research paper on predicting runs conceded by a bowler over a six-ball over.',
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
              {project.technologies && project.technologies.length > 0 && (
                <ul aria-label={`${project.name} technology stack`} className="mt-5 flex flex-wrap gap-2">
                  {project.technologies.map(technology => (
                    <li key={technology} className="rounded-full border border-neutral-200 px-3 py-1 text-xs font-medium text-muted dark:border-border/15 dark:text-muted">{technology}</li>
                  ))}
                </ul>
              )}
              {(project.liveUrl || project.githubUrl || project.paperUrl) && (
                <div className="mt-5 flex flex-wrap gap-2">
                  {project.liveUrl && <a href={project.liveUrl} target="_blank" rel="noopener noreferrer" className="rounded-full border border-neutral-300 px-4 py-2 text-xs font-semibold text-foreground hover:border-brand dark:border-border/15">View Project</a>}
                  {project.githubUrl && <a href={project.githubUrl} target="_blank" rel="noopener noreferrer" className="rounded-full border border-neutral-300 px-4 py-2 text-xs font-semibold text-foreground hover:border-brand dark:border-border/15">GitHub</a>}
                  {project.paperUrl && <a href={project.paperUrl} target="_blank" rel="noopener noreferrer" className="rounded-full border border-neutral-300 px-4 py-2 text-xs font-semibold text-foreground hover:border-brand dark:border-border/15">Read Paper</a>}
                </div>
              )}
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
