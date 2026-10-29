import { Link } from 'react-router-dom'
import { useLifeData } from '../hooks/use-life-data'
import { useResource } from '../hooks/use-resource'
import { profilesRepository } from '../repositories/profiles.repository'
import { valuesRepository } from '../repositories/values.repository'
import { skillsRepository } from '../repositories/skills.repository'
import { goalStatistics, skillLevels } from '../lib/growth'
import { label } from '../lib/lifepath'
import { PageHeading } from '../components/shared/PageHeading'
import { ResourceState } from '../components/shared/ResourceState'
import { Button } from '../components/ui/button'

const loadCharacter = async () => {
  const [profile, values, skills] = await Promise.all([profilesRepository.get(), valuesRepository.listAll(), skillsRepository.listAll()])
  return { profile, values, skills }
}
export function CharacterPage() {
  const { goals, chapters } = useLifeData()
  const resource = useResource(loadCharacter)
  const stats = goalStatistics(goals)
  const currentChapters = chapters.filter((chapter) => chapter.status === 'active')
  const direction = goals.filter((goal) => goal.status === 'active' && ['vision', 'goal'].includes(goal.type))
  const achievements = goals.filter((goal) => goal.status === 'completed').sort((a, b) => (b.completed_at ?? '').localeCompare(a.completed_at ?? ''))
  const data = resource.data
  return <>
    <PageHeading title="Character profile" description="Your direction, principles, and the growth you can point to."><Button variant="outline" render={<Link to="/app/account" />}>Edit profile</Button></PageHeading>
    <ResourceState loading={resource.loading} error={resource.error} retry={resource.reload} />
    {data && <>
      <section className="flex flex-wrap items-center gap-5 rounded-lg border bg-card p-6 text-card-foreground" aria-label="Profile identity">
        {data.profile.avatar_url && /^https?:\/\//i.test(data.profile.avatar_url) && <img src={data.profile.avatar_url} alt="Profile avatar" referrerPolicy="no-referrer" className="size-20 rounded-full object-cover" onError={(event) => { event.currentTarget.hidden = true }} />}
        <div className="min-w-0 space-y-2"><h2 className="wrap-break-word text-2xl font-semibold">{data.profile.display_name || 'Your personal profile'}</h2><p className="text-sm text-muted-foreground">Current life chapter{currentChapters.length > 1 ? 's' : ''}</p>{currentChapters.length ? <ul className="space-y-1">{currentChapters.map((chapter) => <li key={chapter.id}><Link className="wrap-break-word underline" to={`/app/chapters/${chapter.id}`}>{chapter.title}</Link></li>)}</ul> : <p>No active chapter. <Link className="underline" to="/app/chapters">Explore your chapters</Link></p>}</div>
      </section>
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[['Completed goals & steps', stats.completed], ['Active goals & steps', stats.active], ['Skills practiced', data.skills.length], ['Completed chapters', chapters.filter((chapter) => chapter.status === 'completed').length]].map(([title, count]) => <div key={title} className="rounded-lg border bg-card p-4 text-card-foreground"><dt className="text-sm text-muted-foreground">{title}</dt><dd className="mt-2 text-3xl font-semibold">{count}</dd></div>)}</dl>
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <section className="space-y-4 rounded-lg border bg-card p-5 text-card-foreground"><h2 className="text-xl font-semibold">Values & principles</h2>{data.values.length ? <ul className="max-h-96 space-y-4 overflow-y-auto">{data.values.map((value) => <li key={value.id} className="space-y-1"><h3 className="wrap-break-word font-medium">{value.name}</h3>{value.description && <p className="whitespace-pre-wrap wrap-break-word text-sm text-muted-foreground">{value.description}</p>}{value.guiding_principle && <p className="whitespace-pre-wrap wrap-break-word text-sm">{value.guiding_principle}</p>}</li>)}</ul> : <p className="text-sm text-muted-foreground">Your values and guiding principles will appear here.</p>}<Link className="text-sm underline" to="/app/values">View values</Link></section>
        <section className="space-y-4 rounded-lg border bg-card p-5 text-card-foreground"><h2 className="text-xl font-semibold">Active visions & major goals</h2>{direction.length ? <ul className="max-h-96 space-y-3 overflow-y-auto">{direction.map((goal) => <li key={goal.id}><Link className="wrap-break-word underline" to={`/app/goals/${goal.id}`}>{goal.title}</Link><p className="text-xs text-muted-foreground">{label(goal.type)}{goal.category && ` · ${goal.category}`}</p></li>)}</ul> : <p className="text-sm text-muted-foreground">Start a vision or goal to show your current direction.</p>}<Link className="text-sm underline" to="/app/goals">View goals</Link></section>
        <section className="space-y-4 rounded-lg border bg-card p-5 text-card-foreground"><h2 className="text-xl font-semibold">Skills</h2><p className="text-sm text-muted-foreground">Proficiency reflects your own assessment.</p>{data.skills.length ? <div className="max-h-96 space-y-4 overflow-y-auto">{skillLevels.map((level) => {
          const skills = data.skills.filter((skill) => skill.level === level)
          return skills.length > 0 && <div key={level}><h3 className="font-medium">{label(level)} · {skills.length}</h3><ul className="mt-2 space-y-2">{skills.map((skill) => <li key={skill.id}><Link className="wrap-break-word text-sm underline" to={`/app/skills?skill=${skill.id}`}>{skill.name}</Link></li>)}</ul></div>
        })}</div> : <p className="text-sm text-muted-foreground">Add a skill to start recording what you learn.</p>}<Link className="text-sm underline" to="/app/skills">View skill trees</Link></section>
        <section className="space-y-4 rounded-lg border bg-card p-5 text-card-foreground"><h2 className="text-xl font-semibold">Achievements & milestones</h2><p className="text-sm text-muted-foreground">Goals, milestones, and steps currently marked complete. Reopened goals remain in your journey history.</p>{achievements.length ? <ul className="max-h-96 space-y-3 overflow-y-auto">{achievements.map((goal) => <li key={goal.id}><Link className="wrap-break-word underline" to={`/app/goals/${goal.id}`}>{goal.title}</Link><p className="text-xs text-muted-foreground">{label(goal.type)}{goal.completed_at && ` · ${new Date(goal.completed_at).toLocaleDateString()}`}</p></li>)}</ul> : <p className="text-sm text-muted-foreground">Completed goals and milestones will appear here.</p>}<Link className="text-sm underline" to="/app/insights">Explore insights</Link></section>
      </div>
    </>}
  </>
}
