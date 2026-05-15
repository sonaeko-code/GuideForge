'use client'

import { useEffect, useState } from 'react'
import { Loader2, Save } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { updateNetworkGovernance } from '@/lib/guideforge/supabase-networks'
import type { Network, NetworkGovernanceSettings } from '@/lib/guideforge/types'
import { getDefaultNetworkGovernanceSettings } from '@/lib/guideforge/types'

interface GovernanceSettingsEditorProps {
  network: Network
  networkId: string
}

/**
 * Governance Settings Editor (Lane 2A)
 * 
 * Allows network owners to edit:
 * - Verification level (open | moderated | verified-only)
 * - Content standard (lenient | standard | strict)
 * - AI policy (allowed | disclosed | disallowed)
 * - Trust badge display options
 * - Contributor mode (owner-only | invite | open)
 */
export function GovernanceSettingsEditor({ network, networkId }: GovernanceSettingsEditorProps) {
  const [settings, setSettings] = useState<NetworkGovernanceSettings | null>(null)
  const [originalSettings, setOriginalSettings] = useState<NetworkGovernanceSettings | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // Load governance settings on mount
  useEffect(() => {
    const governance = network?.governanceSettings || getDefaultNetworkGovernanceSettings()
    setSettings(governance)
    setOriginalSettings(governance)
  }, [network])

  // Track if settings have changed
  useEffect(() => {
    if (settings && originalSettings) {
      const changed = JSON.stringify(settings) !== JSON.stringify(originalSettings)
      setHasChanges(changed)
    }
  }, [settings, originalSettings])

  if (!settings) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">Loading governance settings...</p>
        </div>
      </Card>
    )
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!settings || !hasChanges) return

    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      console.log('[v0] GovernanceSettingsEditor: Saving governance settings:', {
        verification: settings.verificationLevel,
        contentStandard: settings.contentStandard,
        aiPolicy: settings.aiPolicy,
        contributorMode: settings.contributorMode,
      })

      const { network: updated, error: updateError } = await updateNetworkGovernance(
        networkId,
        settings
      )

      if (updateError || !updated) {
        console.error('[v0] GovernanceSettingsEditor: Save failed:', updateError)
        setError(updateError || 'Failed to save governance settings')
        setSaving(false)
        return
      }

      console.log('[v0] GovernanceSettingsEditor: Governance settings saved successfully')
      setOriginalSettings(settings)
      setSuccess(true)
      setSaving(false)

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(false)
      }, 3000)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      console.error('[v0] GovernanceSettingsEditor: Exception:', message)
      setError(message)
      setSaving(false)
    }
  }

  function handleCancel() {
    setSettings(originalSettings)
    setHasChanges(false)
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Governance Settings</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Configure how guides are reviewed, published, and verified in this network.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
          <p className="text-sm text-emerald-700 dark:text-emerald-300">
            Governance settings saved successfully.
          </p>
        </div>
      )}

      <Card className="border-border/50 p-5 space-y-6">
        {/* Verification Level */}
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-foreground">Verification Level</legend>
          <p className="text-xs text-muted-foreground">
            Controls how strictly new guides must be reviewed before verified status.
          </p>
          <RadioGroup
            value={settings.verificationLevel}
            onValueChange={(value) =>
              setSettings({
                ...settings,
                verificationLevel: value as 'open' | 'moderated' | 'verified-only',
              })
            }
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="open" id="verification-open" />
              <Label htmlFor="verification-open" className="font-normal cursor-pointer">
                <span className="font-medium">Open</span>
                <span className="text-xs text-muted-foreground ml-1">— Anyone can publish</span>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="moderated" id="verification-moderated" />
              <Label htmlFor="verification-moderated" className="font-normal cursor-pointer">
                <span className="font-medium">Moderated</span>
                <span className="text-xs text-muted-foreground ml-1">— Manual review required</span>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="verified-only" id="verification-verified-only" />
              <Label htmlFor="verification-verified-only" className="font-normal cursor-pointer">
                <span className="font-medium">Verified Only</span>
                <span className="text-xs text-muted-foreground ml-1">— Must pass all review criteria</span>
              </Label>
            </div>
          </RadioGroup>
        </fieldset>

        {/* Content Standard */}
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-foreground">Content Standard</legend>
          <p className="text-xs text-muted-foreground">
            Sets quality expectations for guides in this network.
          </p>
          <RadioGroup
            value={settings.contentStandard}
            onValueChange={(value) =>
              setSettings({
                ...settings,
                contentStandard: value as 'lenient' | 'standard' | 'strict',
              })
            }
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="lenient" id="content-lenient" />
              <Label htmlFor="content-lenient" className="font-normal cursor-pointer">
                <span className="font-medium">Lenient</span>
                <span className="text-xs text-muted-foreground ml-1">— Minimal requirements</span>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="standard" id="content-standard" />
              <Label htmlFor="content-standard" className="font-normal cursor-pointer">
                <span className="font-medium">Standard</span>
                <span className="text-xs text-muted-foreground ml-1">— Balanced quality checks</span>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="strict" id="content-strict" />
              <Label htmlFor="content-strict" className="font-normal cursor-pointer">
                <span className="font-medium">Strict</span>
                <span className="text-xs text-muted-foreground ml-1">— High quality threshold</span>
              </Label>
            </div>
          </RadioGroup>
        </fieldset>

        {/* AI Policy */}
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-foreground">AI Content Policy</legend>
          <p className="text-xs text-muted-foreground">
            How AI-generated content is handled in this network.
          </p>
          <RadioGroup
            value={settings.aiPolicy}
            onValueChange={(value) =>
              setSettings({
                ...settings,
                aiPolicy: value as 'allowed' | 'disclosed' | 'disallowed',
              })
            }
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="allowed" id="ai-allowed" />
              <Label htmlFor="ai-allowed" className="font-normal cursor-pointer">
                <span className="font-medium">Allowed</span>
                <span className="text-xs text-muted-foreground ml-1">— No restrictions</span>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="disclosed" id="ai-disclosed" />
              <Label htmlFor="ai-disclosed" className="font-normal cursor-pointer">
                <span className="font-medium">Disclosed</span>
                <span className="text-xs text-muted-foreground ml-1">— Must be labeled</span>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="disallowed" id="ai-disallowed" />
              <Label htmlFor="ai-disallowed" className="font-normal cursor-pointer">
                <span className="font-medium">Disallowed</span>
                <span className="text-xs text-muted-foreground ml-1">— Not permitted</span>
              </Label>
            </div>
          </RadioGroup>
        </fieldset>

        {/* Contributor Mode */}
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-foreground">Contributor Mode</legend>
          <p className="text-xs text-muted-foreground">
            Who is allowed to submit guides to this network.
          </p>
          <RadioGroup
            value={settings.contributorMode}
            onValueChange={(value) =>
              setSettings({
                ...settings,
                contributorMode: value as 'owner-only' | 'invite' | 'open',
              })
            }
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="owner-only" id="contributor-owner" />
              <Label htmlFor="contributor-owner" className="font-normal cursor-pointer">
                <span className="font-medium">Owner Only</span>
                <span className="text-xs text-muted-foreground ml-1">— Only network owner</span>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="invite" id="contributor-invite" />
              <Label htmlFor="contributor-invite" className="font-normal cursor-pointer">
                <span className="font-medium">Invite Only</span>
                <span className="text-xs text-muted-foreground ml-1">— Owner invites contributors</span>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="open" id="contributor-open" />
              <Label htmlFor="contributor-open" className="font-normal cursor-pointer">
                <span className="font-medium">Open</span>
                <span className="text-xs text-muted-foreground ml-1">— Anyone can submit (future)</span>
              </Label>
            </div>
          </RadioGroup>
        </fieldset>

        {/* Trust Badges */}
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-foreground">Trust Badges</legend>
          <p className="text-xs text-muted-foreground">
            Which badges are displayed on published guides.
          </p>
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="badge-verified"
                checked={settings.trustBadges.showVerified}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    trustBadges: {
                      ...settings.trustBadges,
                      showVerified: checked === true,
                    },
                  })
                }
              />
              <Label htmlFor="badge-verified" className="font-normal cursor-pointer">
                Show verified status badge
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="badge-updated"
                checked={settings.trustBadges.showLastUpdated}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    trustBadges: {
                      ...settings.trustBadges,
                      showLastUpdated: checked === true,
                    },
                  })
                }
              />
              <Label htmlFor="badge-updated" className="font-normal cursor-pointer">
                Show last updated date
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="badge-author"
                checked={settings.trustBadges.showAuthor}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    trustBadges: {
                      ...settings.trustBadges,
                      showAuthor: checked === true,
                    },
                  })
                }
              />
              <Label htmlFor="badge-author" className="font-normal cursor-pointer">
                Show author information
              </Label>
            </div>
          </div>
        </fieldset>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={handleCancel}
          disabled={!hasChanges || saving}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!hasChanges || saving}
        >
          {saving && <Loader2 className="size-4 mr-2 animate-spin" aria-hidden="true" />}
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  )
}
