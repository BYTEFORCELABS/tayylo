"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Calendar, CheckCircle2, Circle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Tag } from "@/components/ui/tag";
import { Skeleton, EmptyState } from "@/components/ui/states";
import { scheduleRepo, customerRepo } from "@/lib/mock/store";
import type { Customer, ScheduleItem } from "@/types";
import { toast } from "sonner";

export default function AppointmentsPage() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [schedule, setSchedule] = React.useState<ScheduleItem[]>([]);
  const [allClients, setAllClients] = React.useState<Customer[]>([]);

  React.useEffect(() => {
    async function load() {
      const [sch, clients] = await Promise.all([scheduleRepo.list(), customerRepo.list()]);
      setSchedule(sch);
      setAllClients(clients);
      setLoading(false);
    }
    load();
  }, []);

  const handleToggleSchedule = async (id: string) => {
    const isComp = await scheduleRepo.toggleComplete(id);
    setSchedule(prev => prev.map(s => (s.id === id ? { ...s, completed: isComp } : s)));
    toast(isComp ? "Appointment completed" : "Appointment marked pending");
  };

  return (
    <div className="max-w-3xl mx-auto pb-16">
      {/* Slim bar — fixed on scroll so context is never lost */}
      <div className="sticky top-0 z-20 bg-cream/95 backdrop-blur-sm px-4 lg:px-8 pt-safe">
        <div className="flex items-center gap-3 py-3">
          <button
            onClick={() => router.push("/settings")}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-beige-light transition-colors shrink-0"
            aria-label="Back to more"
          >
            <ArrowLeft size={18} strokeWidth={1.75} />
          </button>
          <p className="text-sm font-semibold text-text-primary truncate flex-1">Studio Appointments</p>
          {!loading && (
            <span className="text-xs text-text-tertiary shrink-0">
              {schedule.filter(s => s.completed).length} of {schedule.length} done
            </span>
          )}
        </div>
      </div>

      <div className="px-4 lg:px-8 pt-2">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} width="100%" height={64} className="rounded-[var(--radius-card)]" />
            ))}
          </div>
        ) : schedule.length === 0 ? (
          <EmptyState
            icon={<Calendar size={24} />}
            title="No appointments scheduled"
            description="Fittings, measurements and pickups you log will show up here."
          />
        ) : (
          <Card padding="none" className="overflow-hidden shadow-none">
            <CardContent className="divide-y divide-border/60">
              {schedule.map(item => {
                const client = allClients.find(c => c.id === item.clientId);
                return (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between p-3.5 transition-colors ${
                      item.completed ? "bg-beige-light/20 opacity-75" : "hover:bg-beige-light/40"
                    }`}
                  >
                    <div className="flex items-center gap-3.5 flex-1 min-w-0">
                      <button
                        onClick={() => handleToggleSchedule(item.id)}
                        className="text-olive hover:scale-110 transition-transform shrink-0"
                        title={item.completed ? "Mark pending" : "Mark done"}
                      >
                        {item.completed ? (
                          <CheckCircle2 size={22} className="text-success fill-success/15" />
                        ) : (
                          <Circle size={22} className="text-border-strong hover:text-olive" />
                        )}
                      </button>

                      <Avatar name={item.clientName} src={client?.photoUrl} size="sm" />

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-text-primary font-mono">{item.time}</span>
                          <Tag
                            size="sm"
                            variant={item.type === "fitting" ? "olive" : item.type === "measure" ? "info" : "beige"}
                          >
                            {item.type}
                          </Tag>
                          {item.garment && (
                            <span className="text-xs text-text-tertiary hidden sm:inline">
                              · {item.garment}
                            </span>
                          )}
                        </div>
                        <p
                          className={`text-sm text-text-primary mt-0.5 truncate ${
                            item.completed ? "line-through text-text-tertiary" : "font-semibold"
                          }`}
                        >
                          {item.title}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => router.push(`/clients/${item.clientId}`)}
                      className="text-xs text-olive hover:underline ml-2 shrink-0 font-semibold"
                    >
                      View &gt;
                    </button>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
