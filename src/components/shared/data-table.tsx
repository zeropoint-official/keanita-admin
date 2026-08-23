'use client';
import { useState } from 'react';
import {
  type ColumnDef, flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel,
  type SortingState, useReactTable,
} from '@tanstack/react-table';
import { ArrowUpDown, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Props<T> {
  columns: ColumnDef<T, unknown>[];
  data: T[];
  searchPlaceholder?: string;
  pageSize?: number;
  emptyText?: string;
  toolbar?: React.ReactNode;
  onRowClick?: (row: T) => void;
}

export function DataTable<T>({ columns, data, searchPlaceholder = 'Αναζήτηση…', pageSize = 25, emptyText = 'Δεν βρέθηκαν εγγραφές.', toolbar, onRowClick }: Props<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const table = useReactTable({
    data, columns, state: { sorting, globalFilter },
    onSortingChange: setSorting, onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(), getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
  });
  const { pageIndex } = table.getState().pagination;
  const total = table.getFilteredRowModel().rows.length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)} placeholder={searchPlaceholder} className="pl-8 w-64" />
        </div>
        {toolbar}
        <span className="ml-auto text-xs text-muted-foreground">{total} εγγραφές</span>
      </div>
      <div className="rounded-lg border bg-white overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((h) => (
                  <TableHead key={h.id} className="whitespace-nowrap">
                    {h.isPlaceholder ? null : h.column.getCanSort() ? (
                      <button className="inline-flex items-center gap-1 hover:text-foreground" onClick={h.column.getToggleSortingHandler()}>
                        {flexRender(h.column.columnDef.header, h.getContext())}<ArrowUpDown className="h-3 w-3 opacity-50" />
                      </button>
                    ) : flexRender(h.column.columnDef.header, h.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} onClick={onRowClick ? () => onRowClick(row.original) : undefined} className={onRowClick ? 'cursor-pointer' : undefined}>
                {row.getVisibleCells().map((cell) => <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>)}
              </TableRow>
            )) : (
              <TableRow><TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">{emptyText}</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-end gap-2 text-sm">
          <span className="text-muted-foreground">Σελίδα {pageIndex + 1} / {table.getPageCount()}</span>
          <Button variant="outline" size="icon" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" size="icon" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      )}
    </div>
  );
}
