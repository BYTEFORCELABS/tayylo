"use client";

import React from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Chip } from "@/components/ui/choice";
import { orderRepo } from "@/lib/data/store";
import { currencySymbol, formatMoney } from "@/lib/format";
import { balanceMinor, PAYMENT_METHODS } from "@/lib/orders";
import type { Order } from "@/types";

interface RecordPaymentDialogProps {
  order: Order | null;
  onOpenChange: (open: boolean) => void;
  /** Called after the payment is saved, so the caller can refetch. */
  onRecorded: () => void | Promise<void>;
}

/** The single payment-recording flow used from Today and Order detail. */
export function RecordPaymentDialog({ order, onOpenChange, onRecorded }: RecordPaymentDialogProps) {
  return (
    <Dialog open={!!order} onOpenChange={onOpenChange}>
      <DialogContent>
        {/* Mounted only while open, so every opening starts with a fresh form. */}
        {order && <PaymentForm key={order.id} order={order} onOpenChange={onOpenChange} onRecorded={onRecorded} />}
      </DialogContent>
    </Dialog>
  );
}

function PaymentForm({ order, onOpenChange, onRecorded }: RecordPaymentDialogProps & { order: Order }) {
  const balance = balanceMinor(order);
  const currency = order.currency || "NGN";
  const [amount, setAmount] = React.useState(balance > 0 ? String(balance / 100) : "");
  const [method, setMethod] = React.useState<string>(PAYMENT_METHODS[0]);
  const [reference, setReference] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>();

  const handleSave = async () => {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) {
      setError("Enter an amount greater than zero");
      return;
    }
    setSaving(true);
    try {
      const amountMinor = Math.round(num * 100);
      await orderRepo.addPayment(order.id, {
        amountMinor,
        method,
        reference: reference.trim() || undefined,
      });
      await onRecorded();
      toast.success(`${formatMoney(amountMinor, currency)} recorded for ${order.customerName}`);
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save this payment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
        <DialogHeader>
          <DialogTitle>Record payment</DialogTitle>
          <DialogDescription>
            {order.customerName} · Order #{order.number}
            {balance > 0 && (
              <>
                {" · "}
                <span className="tabular font-semibold text-ink">{formatMoney(balance, currency)}</span> outstanding
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <Input
            label="Amount"
            type="number"
            inputMode="decimal"
            min={0}
            prefix={currencySymbol(currency)}
            value={amount}
            onChange={e => {
              setAmount(e.target.value);
              setError(undefined);
            }}
            error={error}
            className="tabular text-[17px] font-semibold"
          />
          {balance > 0 && (
            <div className="-mt-2 flex flex-wrap gap-2">
              <Chip size="sm" selected={amount === String(balance / 100)} onClick={() => setAmount(String(balance / 100))}>
                Full balance
              </Chip>
              <Chip
                size="sm"
                selected={amount === String(Math.round(balance / 200))}
                onClick={() => setAmount(String(Math.round(balance / 200)))}
              >
                Half · {formatMoney(Math.round(balance / 2), currency)}
              </Chip>
            </div>
          )}

          <fieldset>
            <legend className="mb-2 text-label font-semibold text-ink">Method</legend>
            <div className="flex flex-wrap gap-2">
              {PAYMENT_METHODS.map(m => (
                <Chip key={m} selected={method === m} onClick={() => setMethod(m)}>
                  {m}
                </Chip>
              ))}
            </div>
          </fieldset>

          <Input
            label="Reference"
            hint="Optional"
            value={reference}
            onChange={e => setReference(e.target.value)}
            placeholder="Transfer ref or receipt number"
          />
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} loading={saving}>
            Save payment
          </Button>
        </DialogFooter>
    </>
  );
}
