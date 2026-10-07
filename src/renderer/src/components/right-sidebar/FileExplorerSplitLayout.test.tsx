// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { FileExplorerSplitLayout } from './FileExplorerSplitLayout'

vi.mock('./FileExplorerBrowseMode', () => ({
  FileExplorerBrowseMode: ({ browsePath }: { browsePath: string }) => (
    <div data-testid="browse" data-path={browsePath} />
  )
}))

function renderLayout(props: { orientation: 'columns' | 'rows'; ratio: number }) {
  return render(
    <TooltipProvider>
      <FileExplorerSplitLayout
        primaryBrowsePath="/a"
        secondaryBrowsePath="/b"
        orientation={props.orientation}
        ratio={props.ratio}
        onPrimaryExit={() => {}}
        onSecondaryExit={() => {}}
        onOrientationChange={() => {}}
        onRatioChange={() => {}}
      />
    </TooltipProvider>
  )
}

describe('FileExplorerSplitLayout ratio', () => {
  it('sizes the primary pane along the main axis from the ratio', () => {
    const { container } = renderLayout({ orientation: 'columns', ratio: 0.7 })
    const panes = container.querySelectorAll('[data-testid="browse"]')
    expect(panes).toHaveLength(2)
    const primary = panes[0]?.parentElement
    expect(primary?.style.width).toBe('70%')
    // Secondary fills the rest via flex.
    expect(panes[1]?.parentElement?.className).toMatch(/flex-1/)
  })

  it('stacks panes by height in rows orientation', () => {
    const { container } = renderLayout({ orientation: 'rows', ratio: 0.25 })
    const primary = container.querySelector('[data-testid="browse"]')?.parentElement
    expect(primary?.style.height).toBe('25%')
  })
})
