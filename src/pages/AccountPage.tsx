import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/use-auth'
import { useResource } from '../hooks/use-resource'
import { useMutation } from '../hooks/use-mutation'
import { useFeedback } from '../state/feedback-context'
import { authService } from '../services/auth.service'
import { profilesRepository } from '../repositories/profiles.repository'
import { memoriesService } from '../services/memories.service'
import type { Profile } from '../types/database'
import { ResourceState } from '../components/shared/ResourceState'
import { PageHeading } from '../components/shared/PageHeading'
import { ConfirmDialog } from '../components/shared/ConfirmDialog'
import { DataTransfer } from '../components/settings/DataTransfer'
import { AccountDeletion } from '../components/settings/AccountDeletion'
import { Field, Input } from '../components/ui/form-controls'
import { Button } from '../components/ui/button'

function ProfileForm({ profile }: { profile: Profile }) {
  const [name, setName] = useState(profile.display_name ?? '')
  const mutation = useMutation()
  async function save(event: FormEvent) {
    event.preventDefault()
    await mutation.run(() => profilesRepository.update(profile.id, { display_name: name.trim() || null }), 'Profile saved.')
  }
  return <form onSubmit={save} className="space-y-3 rounded-lg border p-4"><h2 className="text-xl font-semibold">Profile</h2><Field id="display-name" label="Display name"><Input id="display-name" maxLength={100} autoComplete="nickname" value={name} onChange={(e) => setName(e.target.value)} /></Field>{mutation.error && <p role="alert" className="text-destructive">{mutation.error}</p>}<Button type="submit" disabled={mutation.busy}>{mutation.busy ? 'Saving…' : 'Save profile'}</Button></form>
}
export function AccountPage() {
  const { session } = useAuth()
  const profile = useResource(profilesRepository.get)
  const mutation = useMutation()
  const notify = useFeedback()
  const [cleanup, setCleanup] = useState(false)
  async function cleanupPhotos() {
    if (!session) return
    if (await mutation.run(async () => { const count = await memoriesService.cleanupPhotos(session.user.id); notify(`${count} unused photo files cleaned up.`) }, false)) setCleanup(false)
  }
  return <><PageHeading title="Settings" description={`Signed in as ${session?.user.email ?? ''}`} /><div className="max-w-3xl space-y-6">
    <ResourceState loading={profile.loading} error={profile.error} retry={profile.reload} />{profile.data && <ProfileForm profile={profile.data} />}
    <DataTransfer />
    <section className="space-y-3 rounded-lg border p-4"><h2 className="text-xl font-semibold">Photo storage</h2><p className="text-sm text-muted-foreground">Remove unattached files left by interrupted uploads or failed cleanup. Keep a separate backup before deleting files.</p><Button variant="outline" onClick={() => setCleanup(true)}>Clean up unused photos</Button></section>
    <ConfirmDialog open={cleanup} onOpenChange={setCleanup} title="Remove unused photos?" description="This permanently removes photo files that are not attached to a memory. Do not run cleanup during an upload in another tab." confirmLabel="Remove unused photos" busy={mutation.busy} onConfirm={() => void cleanupPhotos()}>{mutation.error && <p role="alert" className="text-destructive">{mutation.error}</p>}</ConfirmDialog>
    <AccountDeletion />
    {mutation.error && <p role="alert" className="text-destructive">{mutation.error}</p>}<Button disabled={mutation.busy} onClick={() => void mutation.run(authService.signOut, 'Signed out.')}>Sign out</Button><p><Link to="/" className="underline">Back home</Link></p>
  </div></>
}
