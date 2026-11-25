"use client";

// Deleting a client: the dialog first checks whether they can be deleted.
// While they have orders in production or money owed, it explains why not
// (the API enforces the same rule). Otherwise it lists exactly what will be
// removed before asking for confirmation.

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleAlert, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ApiRequestError, customerRepo } from "@/lib/data/store";
import { formatMoney } from "@/lib/format";
import { clientDeletionBlockers } from "@/lib/orders";
import { useMeasurements, useOrdersByCustomer } from "@/lib/queries";
import { useBusiness } from "@/lib/use-business";

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function DeleteClientDialog({
  clientId,
  clientName,
  open,
  onOpenChange,
}: {
  clientId: string;
  clientName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const { currency } = useBusiness();
  // Only fetch once the dialog opens; both are usually cached from the profile already.
  const ordersQ = useOrdersByCustomer(open ? clientId : null);
  const measurementsQ = useMeasurements(open ? clientId : null);
  const [deleting, setDeleting] = React.useState(false);

  const orders = ordersQ.data;
  const sets = measurementsQ.data;
  const loading = orders === undefined || sets === undefined;
  // Still no data and a request failed: offer a retry instead of an endless "checking".
  const failed = loading && (ordersQ.status === "error" || measurementsQ.status === "error");
  const { activeOrders, outstandingMinor, canDelete } = clientDeletionBlockers(orders ?? []);

  const close = (o: boolean) => !deleting && onOpenChange(o);

  const remove = async () => {
    setDeleting(true);
    try {
      await customerRepo.delete(clientId);
      toast.success(`${clientName} deleted`);
      router.replace("/clients");
    } catch (error) {
      // The server re-checks the rule; if something changed meanwhile, say why.
      toast.error(error instanceof ApiRequestError && error.status === 409 ? error.message : "Couldn't delete this client");
      ordersQ.refetch();
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        {failed ? (
          <>
            <DialogHeader>
              <DialogTitle>Couldn&apos;t check this client</DialogTitle>
              <DialogDescription>Check your connection and try again.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="secondary" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button
                onClick={() => {
                  ordersQ.refetch();
                  measurementsQ.refetch();
                }}
              >
                Try again
              </Button>
            </DialogFooter>
          </>
        ) : loading ? (
          <DialogHeader>
            <DialogTitle>Delete {clientName}?</DialogTitle>
            <DialogDescription>Checking this client&apos;s orders and balances…</DialogDescription>
          </DialogHeader>
        ) : !canDelete ? (
          <>
            <DialogHeader>
              <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-warning-bg text-warning">
                <CircleAlert size={22} strokeWidth={1.75} />
              </div>
              <DialogTitle>{clientName} can&apos;t be deleted yet</DialogTitle>
              <DialogDescription>Finish or settle these first, so no work or payment is lost:</DialogDescription>
            </DialogHeader>
            <ul className="space-y-2 text-body text-ink">
              {activeOrders > 0 && (
                <li className="flex items-start gap-2.5">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-warning" />
                  {plural(activeOrders, "order")} still in progress. Mark {activeOrders === 1 ? "it" : "them"} delivered or cancelled.
                </li>
              )}
              {outstandingMinor > 0 && (
                <li className="flex items-start gap-2.5">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-warning" />
                  <span>
                    <span className="tabular font-semibold">{formatMoney(outstandingMinor, currency)}</span> still owed. Record the payment first.
                  </span>
                </li>
              )}
            </ul>
            <DialogFooter>
              <Button variant="secondary" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button asChild>
                <Link href={`/clients/${clientId}`}>View client</Link>
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-danger-bg text-danger">
                <Trash2 size={22} strokeWidth={1.75} />
              </div>
              <DialogTitle>Delete {clientName}?</DialogTitle>
              <DialogDescription>
                {clientName}&apos;s profile
                {sets!.length > 0 && `, ${plural(sets!.length, "measurement set")}`}
                {orders!.length > 0 && `, ${plural(orders!.length, "past order")} with their payments and fittings`}, notes and photos will be
                permanently deleted. This can&apos;t be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={deleting}>
                Keep client
              </Button>
              <Button variant="destructive-filled" loading={deleting} onClick={remove}>
                <Trash2 />
                Delete client
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
