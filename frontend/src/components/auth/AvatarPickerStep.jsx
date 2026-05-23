import { useState } from 'react';
import { Shuffle } from 'lucide-react';
import { toast } from 'sonner';
import Button from '@/components/ui/Button';
import { useSetGeneratedAvatarMutation } from '@/queries/avatar.queries';

const STYLES = [
  { id: 'avataaars', label: 'Cartoon' },
  { id: 'lorelei', label: 'Illustrated' },
  { id: 'notionists', label: 'Doodle' },
  { id: 'micah', label: 'Sketch' },
  { id: 'personas', label: 'Persona' },
  { id: 'fun-emoji', label: 'Emoji' },
];

const DICEBEAR_VERSION = '9.x';
function previewUrl(style, seed) {
  return `https://api.dicebear.com/${DICEBEAR_VERSION}/${style}/png?seed=${encodeURIComponent(seed)}`;
}

function randomSeed() {
  return Math.random().toString(36).slice(2, 14);
}

export default function AvatarPickerStep({ initialSeed, onComplete }) {
  const [style, setStyle] = useState(STYLES[0].id);
  const [seed, setSeed] = useState(initialSeed || randomSeed());
  const setGenerated = useSetGeneratedAvatarMutation();

  const handleSave = async () => {
    try {
      await setGenerated.mutateAsync({ style, seed });
      toast.success('Avatar saved');
      onComplete?.();
    } catch (err) {
      const message =
        err?.response?.data?.message ?? 'Could not save your avatar.';
      toast.error(message);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col items-center gap-4">
        <img
          key={`${style}-${seed}`}
          src={previewUrl(style, seed)}
          alt="Avatar preview"
          className="h-40 w-40 rounded-full border border-slate-200 bg-white object-cover shadow-sm dark:border-slate-700 dark:bg-slate-800"
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setSeed(randomSeed())}
        >
          <Shuffle className="h-4 w-4" /> Re-roll
        </Button>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Style
        </p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {STYLES.map((s) => {
            const active = s.id === style;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setStyle(s.id)}
                className={
                  'flex flex-col items-center gap-1 rounded-lg border p-2 transition ' +
                  (active
                    ? 'border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-900/30'
                    : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600')
                }
              >
                <img
                  src={previewUrl(s.id, seed)}
                  alt={s.label}
                  className="h-12 w-12 rounded-full"
                />
                <span className="text-xs text-slate-700 dark:text-slate-200">
                  {s.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="button" onClick={handleSave} disabled={setGenerated.isPending}>
          {setGenerated.isPending ? 'Saving…' : 'Use this avatar'}
        </Button>
      </div>
    </div>
  );
}
