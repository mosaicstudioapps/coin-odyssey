'use client';

// Every badge by group, earned or with progress toward it. Same rows as the
// mobile Achievements screen.
import Link from 'next/link';
import { useMemo } from 'react';
import { ChevronLeft } from 'lucide-react';
import {
  ACHIEVEMENT_GROUPS,
  ACHIEVEMENT_GROUP_TITLES,
  ACHIEVEMENT_TIER_LABELS,
  type AchievementStatus,
} from '@coin-collecting/shared';
import { AchievementBadge, Card, Eyebrow, ProgressBar } from '@/components/co';
import { useAchievements } from '@/lib/achievements';
import { cn } from '@/lib/utils';

function formatUnlocked(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function AchievementRow({ achievement, first }: { achievement: AchievementStatus; first: boolean }) {
  const { earned, current, required, unlockedAt } = achievement;
  // A plain yes/no badge has nothing worth drawing a bar for.
  const showBar = !earned && required > 1;
  const status = earned
    ? unlockedAt
      ? `Earned ${formatUnlocked(unlockedAt)}`
      : 'Earned'
    : showBar
      ? `${Math.min(current, required)} / ${required}`
      : 'Not yet';

  return (
    <li className={cn('flex items-start gap-4 px-5 py-4', !first && 'border-t border-co-line2')}>
      <AchievementBadge achievement={achievement} earned={earned} size={48} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <p className={cn('truncate text-[15px]', earned ? 'text-co-fg' : 'text-co-fg2')}>{achievement.title}</p>
          <span className="shrink-0 font-mono text-[9.5px] tracking-[0.12em] text-co-fg3">
            {ACHIEVEMENT_TIER_LABELS[achievement.tier].toUpperCase()}
          </span>
        </div>
        <p className="mt-0.5 text-[13px] text-co-fg3">{achievement.description}</p>
        {showBar && (
          <div className="mt-2 max-w-xs">
            <ProgressBar value={current / required} height={3} label={`Progress toward ${achievement.title}`} />
          </div>
        )}
        <p className={cn('mt-1.5 font-mono text-[10px] tracking-[0.06em]', earned ? 'text-co-gold-text' : 'text-co-fg4')}>{status}</p>
      </div>
    </li>
  );
}

export default function AchievementsPage() {
  const { snapshot } = useAchievements();
  const groups = useMemo(() => {
    const all = snapshot?.achievements ?? [];
    return ACHIEVEMENT_GROUPS.map(group => ({ group, items: all.filter(a => a.group === group) })).filter(s => s.items.length > 0);
  }, [snapshot]);
  const total = snapshot?.achievements.length ?? 0;
  const earned = snapshot?.earnedCount ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <Link href="/dashboard" className="inline-flex w-fit items-center gap-1 font-mono text-[10px] uppercase tracking-[0.12em] text-co-fg2 hover:text-co-fg">
        <ChevronLeft className="h-4 w-4" aria-hidden /> Dashboard
      </Link>
      <header className="flex flex-col gap-2">
        <Eyebrow>Your badges</Eyebrow>
        <h1 className="font-display text-[30px] leading-tight tracking-[-0.02em]">Achievements</h1>
        {snapshot && (
          <>
            <p className="font-mono text-[11px] tracking-[0.08em] text-co-fg2">
              {earned} / {total} earned
            </p>
            <div className="max-w-md">
              <ProgressBar value={total ? earned / total : 0} label="Badges earned" />
            </div>
          </>
        )}
      </header>

      {!snapshot ? (
        <p className="text-co-fg3">Loading…</p>
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          {groups.map(({ group, items }) => (
            <section key={group} className="flex flex-col gap-2" aria-labelledby={`group-${group}`}>
              <h2 id={`group-${group}`} className="co-eyebrow">
                {ACHIEVEMENT_GROUP_TITLES[group]}
              </h2>
              <Card className="overflow-hidden">
                <ul>
                  {items.map((a, i) => (
                    <AchievementRow key={a.id} achievement={a} first={i === 0} />
                  ))}
                </ul>
              </Card>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
