"use client";

import React from "react";
import { UserPlus, Users } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { SearchField } from "@/components/ui/choice";
import { List, ListItem } from "@/components/ui/list";
import { EmptyState, ListSkeleton } from "@/components/ui/states";
import { Button } from "@/components/ui/button";
import type { Customer } from "@/types";

interface ClientPickerProps {
  clients: Customer[];
  loading: boolean;
  onSelect: (client: Customer) => void;
  onAddNew: () => void;
}

/** Search-first client chooser used by the measure and new-order flows. */
export function ClientPicker({ clients, loading, onSelect, onAddNew }: ClientPickerProps) {
  const [query, setQuery] = React.useState("");
  const q = query.trim().toLowerCase();
  const filtered = q
    ? clients.filter(
        c =>
          c.fullName.toLowerCase().includes(q) ||
          c.phones.some(p => p.replace(/\s/g, "").includes(q.replace(/\s/g, "")))
      )
    : clients;

  return (
    <div>
      <SearchField
        value={query}
        onValueChange={setQuery}
        placeholder="Search by name or phone"
        size="lg"
        autoFocus
      />

      <div className="mt-4">
        {loading ? (
          <ListSkeleton count={6} />
        ) : clients.length === 0 ? (
          <EmptyState
            variant="inset"
            icon={<Users />}
            title="No clients yet"
            description="Add the client first, then come back to continue."
            action={
              <Button onClick={onAddNew}>
                <UserPlus />
                Add client
              </Button>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            variant="inset"
            title={`No match for “${query}”`}
            description="Check the spelling, or add them as a new client."
            action={
              <Button variant="secondary" onClick={onAddNew}>
                <UserPlus />
                Add new client
              </Button>
            }
          />
        ) : (
          <List>
            {filtered.slice(0, 50).map(c => (
              <ListItem
                key={c.id}
                onClick={() => onSelect(c)}
                leading={<Avatar name={c.fullName} src={c.photoUrl} />}
                title={c.fullName}
                subtitle={c.phones[0] || "No phone"}
                chevron
              />
            ))}
          </List>
        )}
      </div>

      {clients.length > 0 && (
        <Button variant="ghost" block className="mt-3" onClick={onAddNew}>
          <UserPlus />
          Add a new client
        </Button>
      )}
    </div>
  );
}
