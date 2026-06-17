'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/hooks/use-auth'
import { useSidebarStore } from '@/lib/stores/sidebar-store'
import { useCreateDialogs } from '@/lib/hooks/use-create-dialogs'
import { useNotebooks } from '@/lib/hooks/use-notebooks'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ThemeToggle } from '@/components/common/ThemeToggle'
import { LanguageToggle } from '@/components/common/LanguageToggle'
import type { TFunction } from 'i18next'
import { useTranslation } from '@/lib/hooks/use-translation'
import { Separator } from '@/components/ui/separator'
import {
  Book,
  Search,
  Mic,
  Bot,
  Shuffle,
  Settings,
  LogOut,
  ChevronLeft,
  Menu,
  FileText,
  Plus,
  Wrench,
  Command,
  Pin,
} from 'lucide-react'

const getNavigation = (t: TFunction) => [
  {
    title: t('navigation.collect'),
    items: [
      { name: t('navigation.sources'), href: '/sources', icon: FileText },
    ],
  },
  {
    title: t('navigation.process'),
    items: [
      { name: t('navigation.notebooks'), href: '/notebooks', icon: Book },
      { name: t('navigation.askAndSearch'), href: '/search', icon: Search },
    ],
  },
  {
    title: t('navigation.create'),
    items: [
      { name: t('navigation.podcasts'), href: '/podcasts', icon: Mic },
    ],
  },
  {
    title: t('navigation.manage'),
    items: [
      { name: t('navigation.models'), href: '/settings/api-keys', icon: Bot },
      { name: t('navigation.transformations'), href: '/transformations', icon: Shuffle },
      { name: t('navigation.settings'), href: '/settings', icon: Settings },
      { name: t('navigation.advanced'), href: '/advanced', icon: Wrench },
    ],
  },
] as const

type CreateTarget = 'source' | 'notebook' | 'podcast'

export function AppSidebar() {
  const { t } = useTranslation()
  const navigation = getNavigation(t)
  const pathname = usePathname()
  const { logout } = useAuth()
  const { isCollapsed, toggleCollapse } = useSidebarStore()
  const { openSourceDialog, openNotebookDialog, openPodcastDialog } = useCreateDialogs()

  const { data: notebooks } = useNotebooks(false)
  const pinnedNotebooks = notebooks?.filter((nb) => nb.pinned) ?? []

  const [createMenuOpen, setCreateMenuOpen] = useState(false)
  const [isMac, setIsMac] = useState(true) // Default to Mac for SSR

  // Detect platform for keyboard shortcut display
  useEffect(() => {
    setIsMac(navigator.platform.toLowerCase().includes('mac'))
  }, [])

  const handleCreateSelection = (target: CreateTarget) => {
    setCreateMenuOpen(false)

    if (target === 'source') {
      openSourceDialog()
    } else if (target === 'notebook') {
      openNotebookDialog()
    } else if (target === 'podcast') {
      openPodcastDialog()
    }
  }

  return (
    <TooltipProvider delayDuration={0}>
      <div
        className={cn(
          'app-sidebar flex h-full flex-col bg-sidebar border-sidebar-border border-r transition-all duration-300',
          isCollapsed ? 'w-16' : 'w-64'
        )}
      >
        <div
          className={cn(
            'flex h-16 items-center group',
            isCollapsed ? 'justify-center px-2' : 'justify-between px-4'
          )}
        >
          {isCollapsed ? (
            <div className="relative flex items-center justify-center w-full">
              <Image
                src="/logo.svg"
                alt="Open Notebook"
                width={32}
                height={32}
                className="transition-opacity group-hover:opacity-0"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleCollapse}
                className="absolute text-sidebar-foreground hover:bg-sidebar-accent opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Menu className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <Image src="/logo.svg" alt={t('common.appName')} width={32} height={32} />
                <span className="text-base font-medium text-sidebar-foreground">
                  {t('common.appName')}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleCollapse}
                className="text-sidebar-foreground hover:bg-sidebar-accent"
                data-testid="sidebar-toggle"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>

        <nav
          className={cn(
            'flex-1 space-y-1 py-4',
            isCollapsed ? 'px-2' : 'px-3'
          )}
        >
          <div
            className={cn(
              'mb-4',
              isCollapsed ? 'px-0' : 'px-3'
            )}
          >
            <DropdownMenu open={createMenuOpen} onOpenChange={setCreateMenuOpen}>
              {isCollapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button
                        onClick={() => setCreateMenuOpen(true)}
                        variant="default"
                        size="sm"
                        className="w-full justify-center px-2 bg-primary hover:bg-primary/90 text-primary-foreground border-0"
                        aria-label={t('common.create')}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                   <TooltipContent side="right">{t('common.create')}</TooltipContent>
                </Tooltip>
              ) : (
                <DropdownMenuTrigger asChild>
                  <Button
                    onClick={() => setCreateMenuOpen(true)}
                    variant="default"
                    size="sm"
                    className="w-full justify-start bg-primary hover:bg-primary/90 text-primary-foreground border-0"
                   >
                    <Plus className="h-4 w-4 mr-2" />
                    {t('common.create')}
                  </Button>
                </DropdownMenuTrigger>
              )}

              <DropdownMenuContent
                align={isCollapsed ? 'end' : 'start'}
                side={isCollapsed ? 'right' : 'bottom'}
                className="w-48"
              >
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault()
                    handleCreateSelection('source')
                  }}
                  className="gap-2"
                >
                   <FileText className="h-4 w-4" />
                  {t('common.source')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault()
                    handleCreateSelection('notebook')
                  }}
                  className="gap-2"
                >
                   <Book className="h-4 w-4" />
                  {t('common.notebook')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault()
                    handleCreateSelection('podcast')
                  }}
                  className="gap-2"
                >
                   <Mic className="h-4 w-4" />
                  {t('common.podcast')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Pinned Notebooks Section (Expanded) */}
          {!isCollapsed && pinnedNotebooks.length > 0 && (
            <div className="mb-4">
              <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/60 flex items-center gap-1.5">
                <Pin className="h-3.5 w-3.5 text-amber-500 fill-current rotate-45" />
                <span className="truncate">{t('notebooks.pinnedNotebooks')}</span>
              </h3>
              <div className="space-y-1">
                {pinnedNotebooks.map((notebook) => {
                  const isActive = pathname === `/notebooks/${encodeURIComponent(notebook.id)}`
                  return (
                    <Link key={notebook.id} href={`/notebooks/${encodeURIComponent(notebook.id)}`}>
                      <Button
                        variant={isActive ? 'secondary' : 'ghost'}
                        className={cn(
                          'w-full gap-3 text-sidebar-foreground sidebar-menu-item justify-start px-3 h-9',
                          isActive && 'bg-sidebar-accent text-sidebar-accent-foreground'
                        )}
                      >
                        <Book className="h-4 w-4 shrink-0 text-amber-500/70" />
                        <span className="truncate">{notebook.name}</span>
                      </Button>
                    </Link>
                  )
                })}
              </div>
              <Separator className="mt-4" />
            </div>
          )}

          {/* Pinned Notebooks Section (Collapsed) */}
          {isCollapsed && pinnedNotebooks.length > 0 && (
            <div className="mb-4 flex flex-col items-center gap-1.5 border-b border-sidebar-border pb-3">
              {pinnedNotebooks.map((notebook) => {
                const isActive = pathname === `/notebooks/${encodeURIComponent(notebook.id)}`
                const firstLetter = notebook.name.trim().charAt(0).toUpperCase() || 'N'
                return (
                  <Tooltip key={notebook.id}>
                    <TooltipTrigger asChild>
                      <Link href={`/notebooks/${encodeURIComponent(notebook.id)}`}>
                        <Button
                          variant={isActive ? 'secondary' : 'ghost'}
                          className={cn(
                            'h-8 w-8 rounded-full p-0 flex items-center justify-center font-bold text-xs border border-dashed transition-all duration-200',
                            isActive 
                              ? 'bg-amber-500/20 text-amber-600 border-amber-500/50 hover:bg-amber-500/30' 
                              : 'text-sidebar-foreground border-sidebar-border hover:bg-sidebar-accent hover:border-amber-500/30'
                          )}
                        >
                          {firstLetter}
                        </Button>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right">{notebook.name}</TooltipContent>
                  </Tooltip>
                )
              })}
            </div>
          )}

          {navigation.map((section, index) => (
            <div key={section.title}>
              {index > 0 && (
                <Separator className="my-3" />
              )}
              <div className="space-y-1">
                {!isCollapsed && (
                  <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/60">
                    {section.title}
                  </h3>
                )}

                {section.items.map((item) => {
                  const isActive = pathname?.startsWith(item.href) || false
                  const button = (
                    <Button
                      variant={isActive ? 'secondary' : 'ghost'}
                      className={cn(
                        'w-full gap-3 text-sidebar-foreground sidebar-menu-item',
                        isActive && 'bg-sidebar-accent text-sidebar-accent-foreground',
                        isCollapsed ? 'justify-center px-2' : 'justify-start'
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && <span>{item.name}</span>}
                    </Button>
                  )

                  if (isCollapsed) {
                    return (
                      <Tooltip key={item.name}>
                        <TooltipTrigger asChild>
                          <Link href={item.href}>
                            {button}
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent side="right">{item.name}</TooltipContent>
                      </Tooltip>
                    )
                  }

                  return (
                    <Link key={item.name} href={item.href}>
                      {button}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div
          className={cn(
            'border-t border-sidebar-border p-3 space-y-2',
            isCollapsed && 'px-2'
          )}
        >
          {/* Command Palette hint */}
          {!isCollapsed && (
            <div className="px-3 py-1.5 text-xs text-sidebar-foreground/60">
              <div className="flex items-center justify-between">
                 <span className="flex items-center gap-1.5">
                  <Command className="h-3 w-3" />
                  {t('common.quickActions')}
                </span>
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                  {isMac ? <span className="text-xs">⌘</span> : <span>Ctrl+</span>}K
                </kbd>
              </div>
               <p className="mt-1 text-[10px] text-sidebar-foreground/40">
                {t('common.quickActionsDesc')}
              </p>
            </div>
          )}

           <div
            className={cn(
              'flex flex-col gap-2',
              isCollapsed ? 'items-center' : 'items-stretch'
            )}
          >
            {isCollapsed ? (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <ThemeToggle iconOnly />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">{t('common.theme')}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <LanguageToggle iconOnly />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">{t('common.language')}</TooltipContent>
                </Tooltip>
              </>
            ) : (
              <>
                <ThemeToggle />
                <LanguageToggle />
              </>
            )}
          </div>

          {isCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-center sidebar-menu-item"
                  onClick={logout}
                  aria-label={t('common.signOut')}
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
               <TooltipContent side="right">{t('common.signOut')}</TooltipContent>
            </Tooltip>
          ) : (
            <Button
              variant="outline"
              className="w-full justify-start gap-3 sidebar-menu-item"
              onClick={logout}
              aria-label={t('common.signOut')}
             >
              <LogOut className="h-4 w-4" />
              {t('common.signOut')}
            </Button>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}
