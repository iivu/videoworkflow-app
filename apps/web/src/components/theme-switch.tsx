import { Button, cn, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@r/ui';
import { Check, Moon, Sun } from 'lucide-react';
import { useEffect } from 'react';
import { useTheme } from '#/providers/theme-provider';

const themeOptions = [
  { value: 'light', label: '明亮模式' },
  { value: 'dark', label: '暗黑模式' },
  { value: 'system', label: '跟随系统' },
] as const;

export function ThemeSwitch() {
  const { resolvedTheme, theme, setTheme } = useTheme();

  useEffect(() => {
    const themeColor = resolvedTheme === 'dark' ? '#020817' : '#fff';
    const metaThemeColor = document.querySelector("meta[name='theme-color']");
    if (metaThemeColor) metaThemeColor.setAttribute('content', themeColor);
  }, [resolvedTheme]);

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger>
        <Button variant="ghost" size="icon" className="scale-95 rounded-full relative">
          <Sun className="size-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
          <Moon className="absolute size-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {themeOptions.map((option) => (
          <DropdownMenuItem key={option.value} onClick={() => setTheme(option.value)}>
            {option.label}
            <Check size={14} className={cn('ms-auto', theme !== option.value && 'hidden')} />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
