import { Button } from '@r/ui';
import { useNavigate } from '@tanstack/react-router';
import { Search, X } from 'lucide-react';
import { useAppForm } from '#/components/form';
import { Route } from '#/routes/_auth/videos/index';

export function SearchForm() {
  const navigate = useNavigate();
  const { page, size, ...defaultValues } = Route.useSearch();
  const form = useAppForm({
    defaultValues,
    onSubmit: ({ value }) => {
      navigate({ to: '.', search: { ...value, page: 1 } });
    },
  });
  const hasActiveFilters = Boolean(defaultValues.title || defaultValues.author);

  const onSubmit: React.SubmitEventHandler = (e) => {
    e.preventDefault();
    form.handleSubmit();
  };

  const reset = () => {
    navigate({ to: '.', search: { page: 1 } });
  };

  return (
    <form className="flex shrink-0 items-center gap-2" onSubmit={onSubmit}>
      <form.AppField name="title">
        {(field) => (
          <field.FieldInput
            className="w-24 sm:w-32"
            placeholder="视频标题"
            id={field.name}
            name={field.name}
            value={field.state.value}
            onChange={(e) => field.handleChange(e.target.value)}
          />
        )}
      </form.AppField>
      <form.AppField name="author">
        {(field) => (
          <field.FieldInput
            className="w-24 sm:w-32"
            placeholder="视频作者"
            id={field.name}
            name={field.name}
            value={field.state.value}
            onChange={(e) => field.handleChange(e.target.value)}
          />
        )}
      </form.AppField>
      <Button type="submit" aria-label="搜索视频">
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">搜索</span>
      </Button>
      {hasActiveFilters && (
        <Button type="button" variant="outline" aria-label="重置搜索" onClick={reset}>
          <X className="h-4 w-4" />
          <span className="hidden sm:inline">重置</span>
        </Button>
      )}
    </form>
  );
}
