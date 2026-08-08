import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@r/ui';
import { ChevronsLeft, ChevronsRight } from 'lucide-react';

type Props = {
  size: number;
  currentPage: number;
  total: number;
  onPageChange?: (page: number) => void;
  className?: string;
  hideOnSinglePage?: boolean;
};

function Pagination_({ size, currentPage, total, onPageChange, hideOnSinglePage = true, ...rest }: Props) {
  const totalPages = Math.ceil(total / size);

  if (totalPages <= 1 && hideOnSinglePage) {
    return null;
  }

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) {
      return;
    }
    onPageChange?.(page);
  };

  const getPageNumbers = (): (number | 'ellipsis')[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, 'ellipsis', totalPages];
    }

    if (currentPage >= totalPages - 3) {
      return [1, 'ellipsis', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }

    return [1, 'ellipsis', currentPage - 2, currentPage - 1, currentPage, currentPage + 1, currentPage + 2, 'ellipsis', totalPages];
  };

  const pageNumbers = getPageNumbers();

  return (
    <Pagination {...rest}>
      <PaginationContent>
        <PaginationItem>
          <PaginationLink
            aria-label="Go to first page"
            href="#"
            size="icon"
            onClick={(e) => {
              e.preventDefault();
              handlePageChange(1);
            }}
            className={currentPage === 1 ? 'pointer-events-none opacity-50' : undefined}
          >
            <ChevronsLeft className="h-4 w-4" />
          </PaginationLink>
        </PaginationItem>

        <PaginationItem>
          <PaginationPrevious
            href="#"
            onClick={(e) => {
              e.preventDefault();
              handlePageChange(currentPage - 1);
            }}
            className={currentPage === 1 ? 'pointer-events-none opacity-50' : undefined}
          />
        </PaginationItem>

        {pageNumbers.map((page, index) => (
          <PaginationItem key={index}>
            {page === 'ellipsis' ? (
              <PaginationEllipsis />
            ) : (
              <PaginationLink
                href="#"
                isActive={page === currentPage}
                onClick={(e) => {
                  e.preventDefault();
                  handlePageChange(page);
                }}
              >
                {page}
              </PaginationLink>
            )}
          </PaginationItem>
        ))}

        <PaginationItem>
          <PaginationNext
            href="#"
            onClick={(e) => {
              e.preventDefault();
              handlePageChange(currentPage + 1);
            }}
            className={currentPage === totalPages ? 'pointer-events-none opacity-50' : undefined}
          />
        </PaginationItem>

        <PaginationItem>
          <PaginationLink
            aria-label="Go to last page"
            href="#"
            size="icon"
            onClick={(e) => {
              e.preventDefault();
              handlePageChange(totalPages);
            }}
            className={currentPage === totalPages ? 'pointer-events-none opacity-50' : undefined}
          >
            <ChevronsRight className="h-4 w-4" />
          </PaginationLink>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

export { Pagination_ as Pagination };
