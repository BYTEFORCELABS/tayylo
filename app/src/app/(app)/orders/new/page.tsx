"use client";

import React, { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Plus, X, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { customerRepo, measurementRepo, orderRepo } from "@/lib/mock/store";
import type { Customer, MeasurementSet } from "@/types";
import { toast } from "sonner";

const garmentTypes = [
  "Shirt", "Trousers", "Suit", "Jacket", "Dress", "Skirt",
  "Agbada", "Kaftan", "Boubou", "Kurta", "Saree blouse", "Abaya",
];

function NewOrderPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedClientId = searchParams.get("clientId");

  const [step, setStep] = React.useState<"client" | "details">(preselectedClientId ? "details" : "client");
  const [clients, setClients] = React.useState<Customer[]>([]);
  const [clientSearch, setClientSearch] = React.useState("");
  const [selectedClient, setSelectedClient] = React.useState<Customer | null>(null);
  const [selectedGarment, setSelectedGarment] = React.useState("");
  const [styleNotes, setStyleNotes] = React.useState("");
  const [price, setPrice] = React.useState("");
  const [deposit, setDeposit] = React.useState("");
  const [dueDate, setDueDate] = React.useState("");
  const [orderNote, setOrderNote] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    customerRepo.list().then(setClients);
    if (preselectedClientId) {
      customerRepo.getById(preselectedClientId).then(c => {
        if (c) setSelectedClient(c);
      });
    }
  }, [preselectedClientId]);

  const filteredClients = clientSearch.trim()
    ? clients.filter(c => c.fullName.toLowerCase().includes(clientSearch.toLowerCase()))
    : clients;

  const handleSelectClient = (client: Customer) => {
    setSelectedClient(client);
    setStep("details");
  };

  const handleCreateOrder = async () => {
    if (!selectedClient || !selectedGarment) return;
    setSaving(true);

    const priceMm = Math.round(parseFloat(price || "0") * 100);
    const depositMm = Math.round(parseFloat(deposit || "0") * 100);

    // Get latest measurement set for this client
    const latestMs = await measurementRepo.getLatest(selectedClient.id);

    const order = await orderRepo.create({
      customerId: selectedClient.id,
      customerName: selectedClient.fullName,
      number: String(1010 + Math.floor(Math.random() * 90)),
      statusName: "pending",
      dueAt: dueDate ? new Date(dueDate).toISOString() : new Date(Date.now() + 14 * 86400000).toISOString(),
      items: [{
        id: `oi-${Date.now()}`,
        orderId: "",
        garmentType: selectedGarment,
        measurementSetId: latestMs?.id || "",
        styleNotes: styleNotes || undefined,
        photos: [],
      }],
      priceMinor: priceMm,
      currency: "NGN",
      note: orderNote || undefined,
      payments: depositMm > 0 ? [{
        id: `pay-${Date.now()}`,
        orderId: "",
        amountMinor: depositMm,
        paidAt: new Date().toISOString(),
        method: "Cash",
      }] : [],
      fittings: [],
    });

    toast("Order created");
    setSaving(false);
    router.push(`/orders/${order.id}`);
  };

  if (step === "client") {
    return (
      <div className="min-h-[100dvh] bg-cream">
        <div className="px-4 pt-safe max-w-lg mx-auto">
          <div className="flex items-center gap-3 pt-4 mb-4">
            <button
              onClick={() => router.back()}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-beige-light transition-colors"
            >
              <ArrowLeft size={20} strokeWidth={1.5} />
            </button>
            <h1 className="font-serif text-xl text-text-primary">Select client</h1>
          </div>

          <div className="relative mb-4">
            <input
              type="text"
              value={clientSearch}
              onChange={e => setClientSearch(e.target.value)}
              placeholder="Search clients..."
              className="w-full h-11 pl-4 pr-4 rounded-[var(--radius-input)] border border-border bg-white-warm text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-olive"
              autoFocus
            />
          </div>

          <div className="space-y-0">
            {filteredClients.map(c => (
              <button
                key={c.id}
                onClick={() => handleSelectClient(c)}
                className="flex items-center gap-3 w-full px-3 py-3 rounded-[var(--radius-button)] hover:bg-beige-light transition-colors text-left"
              >
                <Avatar name={c.fullName} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{c.fullName}</p>
                  <p className="text-xs text-text-secondary">{c.phones[0]}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-cream">
      <div className="px-4 pt-safe max-w-lg mx-auto pb-8">
        <div className="flex items-center gap-3 pt-4 mb-6">
          <button
            onClick={() => preselectedClientId ? router.back() : setStep("client")}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-beige-light transition-colors"
          >
            <ArrowLeft size={20} strokeWidth={1.5} />
          </button>
          <h1 className="font-serif text-xl text-text-primary">New order</h1>
        </div>

        {/* Client */}
        {selectedClient && (
          <div className="flex items-center gap-3 p-3 mb-6 rounded-[var(--radius-card)] bg-white-warm border border-border">
            <Avatar name={selectedClient.fullName} size="md" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">{selectedClient.fullName}</p>
              <p className="text-xs text-text-secondary">{selectedClient.phones[0]}</p>
            </div>
            {!preselectedClientId && (
              <button
                onClick={() => setStep("client")}
                className="text-xs text-olive hover:underline"
              >
                Change
              </button>
            )}
          </div>
        )}

        {/* Garment type */}
        <div className="mb-6">
          <label className="text-sm font-medium text-text-primary block mb-2">
            Garment type
          </label>
          <div className="flex flex-wrap gap-2">
            {garmentTypes.map(g => (
              <button
                key={g}
                onClick={() => setSelectedGarment(g)}
                className={`h-9 px-4 rounded-full text-sm font-medium transition-all active:scale-[0.96] ${
                  selectedGarment === g
                    ? "bg-olive text-white-warm"
                    : "bg-white-warm border border-border text-text-primary hover:bg-beige-light"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Style notes */}
        <div className="mb-6">
          <Input
            label="Style notes"
            placeholder="e.g. Navy blue, notch lapel, two-button"
            value={styleNotes}
            onChange={e => setStyleNotes(e.target.value)}
          />
        </div>

        {/* Price */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Input
            label="Price (₦)"
            placeholder="0"
            type="number"
            inputMode="numeric"
            value={price}
            onChange={e => setPrice(e.target.value)}
          />
          <Input
            label="Deposit (₦)"
            placeholder="0"
            type="number"
            inputMode="numeric"
            value={deposit}
            onChange={e => setDeposit(e.target.value)}
          />
        </div>

        {/* Due date */}
        <div className="mb-6">
          <Input
            label="Due date"
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            helperText="Leave blank for 2 weeks from today"
          />
        </div>

        {/* Note */}
        <div className="mb-8">
          <label className="text-sm font-medium text-text-primary block mb-1.5">Note (optional)</label>
          <textarea
            value={orderNote}
            onChange={e => setOrderNote(e.target.value)}
            placeholder="Any special instructions..."
            className="w-full h-20 px-4 py-3 rounded-[var(--radius-input)] border border-border bg-white-warm text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-olive resize-none"
          />
        </div>

        {/* Submit */}
        <Button
          variant="primary"
          className="w-full h-12"
          disabled={!selectedClient || !selectedGarment || saving}
          onClick={handleCreateOrder}
        >
          {saving ? "Creating..." : "Create order"}
        </Button>
      </div>
    </div>
  );
}

export default function NewOrderPage() {
  return (
    <Suspense>
      <NewOrderPageInner />
    </Suspense>
  );
}
