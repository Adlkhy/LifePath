import { Link } from 'react-router-dom'
import { useLifeData } from '../hooks/use-life-data'
import { focusItems } from '../lib/lifepath'
import { PageHeading } from '../components/shared/PageHeading'
import { GoalList } from '../components/goals/GoalList'
import { Button } from '../components/ui/button'
import { DailyTopThree } from '../components/goals/DailyTopThree'

export function FocusPage() {
  const { goals, connections } = useLifeData()
  const focus = focusItems(goals, connections)
  return <>
    <PageHeading title="Focus" description="Choose a next step that is ready for you."><Button render={<Link to="/app/goals/new?type=quest" />}>New quest</Button></PageHeading>
    <DailyTopThree />
    <section aria-labelledby="available-heading" className="space-y-4"><h2 id="available-heading" className="text-xl font-semibold">Available quests</h2><p className="text-sm text-muted-foreground">Planned and active quests with completed prerequisites, ordered by priority and deadline.</p><GoalList goals={focus.available} empty="No quests are ready right now. Create a quest or complete a prerequisite." /></section>
    <section aria-labelledby="active-heading" className="space-y-4"><h2 id="active-heading" className="text-xl font-semibold">Active goals</h2><GoalList goals={focus.active} empty="Start a goal to bring it into focus." /></section>
    <section aria-labelledby="deadlines-heading" className="space-y-4"><h2 id="deadlines-heading" className="text-xl font-semibold">Deadlines</h2><p className="text-sm text-muted-foreground">Overdue and due in the next 30 days, including paused goals.</p><GoalList goals={focus.deadlines} empty="No upcoming deadlines. Goals do not need a deadline." /></section>
    {focus.blocked.length > 0 && <section aria-labelledby="blocked-heading" className="space-y-4"><h2 id="blocked-heading" className="text-xl font-semibold">Waiting on prerequisites</h2><GoalList goals={focus.blocked} /></section>}
  </>
}
