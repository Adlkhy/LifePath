import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLifeData } from '../hooks/use-life-data'
import { goalStatuses, goalTypes, label, matchesDifficulty, questDifficulties, type DifficultyFilter } from '../lib/lifepath'
import { GoalList } from '../components/goals/GoalList'
import { PageHeading } from '../components/shared/PageHeading'
import { Button } from '../components/ui/button'
import { Field, Input, Select } from '../components/ui/form-controls'

export function GoalsPage() {
  const { goals, chapters } = useLifeData()
  const [search, setSearch] = useState('')
  const [type, setType] = useState('')
  const [status, setStatus] = useState('')
  const [chapter, setChapter] = useState('')
  const [difficulty, setDifficulty] = useState<DifficultyFilter>('')
  const visible = goals.filter((goal) => matchesDifficulty(goal, difficulty) && goal.title.toLocaleLowerCase().includes(search.toLocaleLowerCase()) && (!type || goal.type === type) && (!status || goal.status === status) && (!chapter || (chapter === 'none' ? !goal.chapter_id : goal.chapter_id === chapter)))
  return <>
    <PageHeading title="Goals & steps" description="Visions, milestones, and everyday quests."><Button render={<Link to="/app/goals/new" />}>New goal</Button></PageHeading>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <Field id="goal-search" label="Search"><Input id="goal-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} /></Field>
      <Field id="filter-type" label="Type"><Select id="filter-type" value={type} onChange={(event) => setType(event.target.value)}><option value="">All types</option>{goalTypes.map((item) => <option key={item} value={item}>{label(item)}</option>)}</Select></Field>
      <Field id="filter-status" label="Status"><Select id="filter-status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option>{goalStatuses.map((item) => <option key={item} value={item}>{label(item)}</option>)}</Select></Field>
      <Field id="filter-chapter" label="Chapter"><Select id="filter-chapter" value={chapter} onChange={(event) => setChapter(event.target.value)}><option value="">All chapters</option><option value="none">No chapter</option>{chapters.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</Select></Field>
      <Field id="filter-difficulty" label="Quest difficulty"><Select id="filter-difficulty" value={difficulty} onChange={(event) => setDifficulty(event.target.value as DifficultyFilter)}><option value="">All difficulties</option><option value="unset">Not set</option>{questDifficulties.map((item) => <option key={item} value={item}>{label(item)}</option>)}</Select></Field>
    </div>
    <p role="status" className="text-sm text-muted-foreground">{visible.length} of {goals.length} goals</p>
    <GoalList goals={visible} empty={goals.length ? 'No goals match these filters.' : 'Create a vision, goal, milestone, or quest to begin.'} />
  </>
}
