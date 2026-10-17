// The official store badges (Apple's and Google's artwork, unaltered), linking
// to the app's listings. Copies live in public/badges so visitors' browsers
// don't contact Apple or Google just by viewing a page.
import { APP_STORE_URL, PLAY_STORE_URL } from '@/lib/checklists';
import { cn } from '@/lib/utils';

export function StoreBadges({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-3', className)}>
      <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" className="inline-block">
        <img
          src="/badges/app-store.svg"
          alt="Download on the App Store"
          width={120}
          height={40}
          className="h-10 w-auto"
        />
      </a>
      <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" className="inline-block">
        {/* Google's badge carries its own padding, so it's drawn taller to match. */}
        <img
          src="/badges/google-play.png"
          alt="Get it on Google Play"
          width={155}
          height={60}
          className="-my-[10px] h-[60px] w-auto"
        />
      </a>
    </div>
  );
}
