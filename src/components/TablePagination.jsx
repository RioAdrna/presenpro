import { useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function TablePagination({ page, total, pageSize = 10, onPageChange, itemLabel = 'data' }) {
  const totalPages = Math.max(1, Math.ceil(Number(total || 0) / pageSize))
  const requestedPage = Number.isFinite(Number(page)) ? Number(page) : 1
  const currentPage = Math.min(Math.max(Math.trunc(requestedPage), 1), totalPages)
  const start = total === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const end = Math.min(total, currentPage * pageSize)
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1)
  const visiblePages = pages.filter((pageNumber) => {
    if (totalPages <= 5) return true
    if (pageNumber === 1 || pageNumber === totalPages) return true
    return Math.abs(pageNumber - currentPage) <= 1
  })

  function goToPage(nextPage) {
    const validPage = Math.min(Math.max(Math.trunc(Number(nextPage) || 1), 1), totalPages)
    if (validPage !== currentPage) onPageChange(validPage)
  }

  useEffect(() => {
    if (requestedPage !== currentPage) onPageChange(currentPage)
  }, [currentPage, onPageChange, requestedPage])

  return (
    <div className="flex flex-col gap-3 border-t border-[#eee7dd] px-5 py-4 text-[11px] font-semibold text-zinc-500 sm:flex-row sm:items-center sm:justify-between sm:px-7">
      <p>Menampilkan {start}-{end} dari {total} {itemLabel}</p>
      <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
        <button
          type="button"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#e8dfd2] bg-white text-zinc-600 disabled:cursor-not-allowed disabled:opacity-40"
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Halaman sebelumnya"
        >
          <ChevronLeft size={14} />
        </button>
        {visiblePages.map((pageNumber, index) => {
          const previous = visiblePages[index - 1]
          const showGap = previous && pageNumber - previous > 1
          return (
            <span key={pageNumber} className="flex items-center gap-1">
              {showGap && <span className="px-1 text-zinc-400">...</span>}
              <button
                type="button"
                className={`h-8 min-w-8 shrink-0 rounded-full px-3 text-[11px] font-black ${pageNumber === currentPage ? 'bg-zinc-950 text-[#ffc400]' : 'border border-[#e8dfd2] bg-white text-zinc-600 hover:bg-[#fff4cf]'}`}
                onClick={() => goToPage(pageNumber)}
                aria-current={pageNumber === currentPage ? 'page' : undefined}
              >
                {pageNumber}
              </button>
            </span>
          )
        })}
        <button
          type="button"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#e8dfd2] bg-white text-zinc-600 disabled:cursor-not-allowed disabled:opacity-40"
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label="Halaman berikutnya"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}
