'use client';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button, type buttonVariants } from '@/components/ui/button';
import type { VariantProps } from 'class-variance-authority';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import type { ActionResult } from '@/lib/actions';

interface Props extends VariantProps<typeof buttonVariants> {
  title: string;
  description?: string;
  confirmLabel?: string;
  onConfirm: () => Promise<ActionResult<unknown>>;
  successMessage?: string;
  children: React.ReactNode;
  className?: string;
}

export function ConfirmButton({ title, description, confirmLabel = 'Επιβεβαίωση', onConfirm, successMessage, children, ...btn }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button {...btn} />}>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Άκυρο</AlertDialogCancel>
          <AlertDialogAction disabled={pending} onClick={(e) => { e.preventDefault(); start(async () => {
            const r = await onConfirm();
            if (r.ok) { toast.success(successMessage ?? 'Ολοκληρώθηκε'); setOpen(false); } else toast.error(r.error);
          }); }}>
            {pending ? '…' : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
