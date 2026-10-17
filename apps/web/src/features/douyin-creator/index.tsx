import { Alert, AlertDescription, Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Skeleton } from '@r/ui';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, Users } from 'lucide-react';
import { useState } from 'react';
import { Pagination } from '#/components/pagination';
import { Route } from '#/routes/_auth/douyin-creators/index';
import { normalizeApiFailedMessage, query } from '#/services/api';
import { AddCreatorDialog } from './add-creator-dialog';
import { CreatorCard } from './creator-card';

const sortOptions = [
  { value: 'totalFavorited', label: '按获赞数' },
  { value: 'followerCount', label: '按粉丝数' },
  { value: 'awemeCount', label: '按作品数' },
] as const;

export function DouyinCreatorsPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [adding, setAdding] = useState(false);
  const list = useQuery({
    ...query.douyinCreators.list.queryOptions({ query: search }),
    refetchInterval: (current) => (current.state.data?.data.hasProcessing ? 2000 : false),
    refetchIntervalInBackground: true,
    refetchOnMount: 'always',
  });
  const creators = list.data?.data.list ?? [];
  const total = list.data?.data.meta.total ?? 0;
  const firstPage = () => {
    if (search.page !== 1) void navigate({ search: { ...search, page: 1 } });
  };

  return (
    <main className="space-y-5 p-4 md:p-6">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-4">
        <SearchForm key={search.keyword} />
        <div className="ml-auto flex items-center gap-2">
          <Select
            value={search.sortBy}
            onValueChange={(value) => {
              const selected = sortOptions.find((option) => option.value === value);
              if (selected) void navigate({ search: { ...search, sortBy: selected.value, page: 1 } });
            }}
          >
            <SelectTrigger aria-label="博主排序">
              <SelectValue>{sortOptions.find((option) => option.value === search.sortBy)?.label}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => setAdding(true)}>
            <Plus />
            抖音账号新增
          </Button>
        </div>
      </div>
      {list.error ? (
        <Alert variant="destructive">
          <AlertDescription className="flex items-center gap-3">
            {normalizeApiFailedMessage(list.error) || '博主列表加载失败'}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void list.refetch();
              }}
            >
              重试
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}
      {list.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" role="status" aria-label="博主列表加载中">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-72 rounded-lg" />
          ))}
        </div>
      ) : creators.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {creators.map((creator) => (
            <CreatorCard
              key={creator.id}
              creator={creator}
              onRemoved={() => {
                if (creators.length === 1 && search.page > 1) void navigate({ search: { ...search, page: search.page - 1 } });
              }}
            />
          ))}
        </div>
      ) : !list.error ? (
        <div className="flex min-h-72 flex-col items-center justify-center gap-3 rounded-lg border border-dashed text-muted-foreground">
          <Users className="size-10" />
          <p>{search.keyword ? '没有找到匹配的博主' : '还没有添加抖音博主'}</p>
          <Button variant="outline" onClick={() => setAdding(true)}>
            <Plus />
            添加博主
          </Button>
        </div>
      ) : null}
      <Pagination
        size={search.size}
        currentPage={search.page}
        total={total}
        onPageChange={(page) => {
          void navigate({ search: { ...search, page } });
        }}
      />
      <AddCreatorDialog open={adding} onOpenChange={setAdding} onSubmitted={firstPage} />
    </main>
  );
}

function SearchForm() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [keyword, setKeyword] = useState(search.keyword);
  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        void navigate({ search: { ...search, keyword: keyword.trim(), page: 1 } });
      }}
    >
      <Label htmlFor="creator-keyword" className="sr-only">
        博主昵称或抖音号
      </Label>
      <Input
        id="creator-keyword"
        className="w-64 max-w-full"
        value={keyword}
        onChange={(event) => setKeyword(event.target.value)}
        placeholder="搜索博主昵称或抖音号"
        maxLength={128}
      />
      <Button type="submit">
        <Search />
        查询
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          setKeyword('');
          void navigate({ search: { page: 1, size: 12, keyword: '', sortBy: 'totalFavorited', sortOrder: 'desc' } });
        }}
      >
        重置
      </Button>
    </form>
  );
}
