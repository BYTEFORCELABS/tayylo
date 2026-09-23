"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  ChevronRight,
  Moon,
  Sun,
  Monitor,
  Trash2,
  RotateCcw,
  FileDown,
  FileUp,
  Palette,
  Edit2,
  Copy,
  Ruler,
  Check,
  Users,
  Download,
  UploadCloud,
  Calendar,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/tag";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  businessRepo,
  customerRepo,
  templateRepo,
  exportData,
  resetStore,
} from "@/lib/mock/store";
import type { Business, MeasurementTemplate } from "@/types";
import { toast } from "sonner";

export default function SettingsPage() {
  const router = useRouter();
  const [business, setBusiness] = React.useState<Business | null>(null);
  const [templates, setTemplates] = React.useState<MeasurementTemplate[]>([]);
  const [theme, setTheme] = React.useState("system");
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  // Business profile modal
  const [bizOpen, setBizOpen] = React.useState(false);
  const [bizName, setBizName] = React.useState("");
  const [ownerName, setOwnerName] = React.useState("");
  const [bizCurrency, setBizCurrency] = React.useState("NGN");

  // Template manager modal
  const [templateOpen, setTemplateOpen] = React.useState(false);
  const [selectedTemplate, setSelectedTemplate] = React.useState<MeasurementTemplate | null>(null);

  // Import modal
  const [importOpen, setImportOpen] = React.useState(false);
  const [csvText, setCsvText] = React.useState("");
  const [importing, setImporting] = React.useState(false);

  // Export modal
  const [exportOpen, setExportOpen] = React.useState(false);

  React.useEffect(() => {
    businessRepo.get().then(b => {
      setBusiness(b);
      setBizName(b.name);
      setOwnerName(b.ownerName);
      setBizCurrency(b.currency);
    });
    templateRepo.list().then(setTemplates);

    // Initial theme
    const savedTheme = localStorage.getItem("tayylo_theme") || "system";
    setTheme(savedTheme);
  }, []);

  const handleTheme = (t: string) => {
    setTheme(t);
    localStorage.setItem("tayylo_theme", t);
    document.documentElement.setAttribute("data-theme", t);
    if (t === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    toast.success(`Theme set to ${t}`);
  };

  const handleSaveBusiness = async () => {
    if (!bizName.trim()) return;
    const updated = await businessRepo.update({
      name: bizName.trim(),
      ownerName: ownerName.trim() || undefined,
      currency: bizCurrency,
    });
    setBusiness(updated);
    setBizOpen(false);
    toast.success("Business profile updated");
  };

  const handleDuplicateTemplate = async (t: MeasurementTemplate) => {
    const copy = await templateRepo.duplicate(t.id, `${t.name} (Custom)`);
    if (copy) {
      const all = await templateRepo.list();
      setTemplates(all);
      setSelectedTemplate(copy);
      toast.success(`Created custom template: ${copy.name}`);
    }
  };

  // Contacts Simulator Import
  const handleSimulateContacts = async () => {
    setImporting(true);
    const mockContacts = [
      { fullName: "Olamide Bakare", phone: "+234 802 111 9988", email: "olamide@example.com", notes: "VIP wedding client" },
      { fullName: "Folake Daniels", phone: "+234 803 222 7766", notes: "Prefers A-line skirts and boubous" },
      { fullName: "Ibrahim Sani", phone: "+234 809 444 3322", email: "ibrahim.s@example.com", notes: "Kaftans & Senator suits" },
      { fullName: "Claire Moreau", phone: "+33 6 88 99 00 11", notes: "Cocktail dresses" },
      { fullName: "Tunde Williams", phone: "+234 818 555 1234", notes: "Three-piece bespoke suits" },
    ];
    const count = await customerRepo.importCustomers(mockContacts);
    setImporting(false);
    setImportOpen(false);
    toast.success(`Imported ${count} contacts into Tayylo`);
  };

  // Parse CSV text & import
  const handleImportCsv = async () => {
    if (!csvText.trim()) return;
    setImporting(true);
    const lines = csvText.trim().split("\n");
    const items = lines.map(line => {
      const parts = line.split(",").map(p => p.trim().replace(/^"|"$/g, ""));
      return {
        fullName: parts[0] || "",
        phone: parts[1] || undefined,
        email: parts[2] || undefined,
        notes: parts[3] || undefined,
      };
    }).filter(i => i.fullName.length > 0 && i.fullName.toLowerCase() !== "full name");

    if (items.length === 0) {
      toast.error("No valid client rows found in CSV text");
      setImporting(false);
      return;
    }

    const count = await customerRepo.importCustomers(items);
    setImporting(false);
    setImportOpen(false);
    setCsvText("");
    toast.success(`Imported ${count} clients from CSV`);
  };

  // Downloads for export
  const handleDownloadJson = () => {
    const { jsonStr } = exportData();
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tayylo-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded complete JSON database archive");
  };

  const handleDownloadCsv = () => {
    const { csvStr } = exportData();
    const blob = new Blob([csvStr], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tayylo-clients-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded clients CSV spreadsheet");
  };

  const handleReset = () => {
    resetStore();
    toast.success("Demo data reset to clean initial state");
    window.location.reload();
  };

  const handleDeleteAccount = () => {
    resetStore();
    setDeleteOpen(false);
    toast.success("Account reset");
    router.push("/welcome");
  };

  return (
    <div className="max-w-2xl mx-auto pb-16">
      {/* Fixed on scroll so context is never lost */}
      <div className="sticky top-0 z-20 bg-cream/95 backdrop-blur-sm px-4 lg:px-8 pt-safe">
        <h1 className="font-serif text-2xl text-text-primary pt-6 pb-4">Settings</h1>
      </div>

      <div className="px-4 lg:px-8">
      {/* Business profile */}
      <section className="mb-6">
        <h2 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-3">Business</h2>
        <Card>
          <CardContent>
            <div
              className="flex items-center gap-4 cursor-pointer hover:bg-beige-light/20 -mx-4 -my-2 p-4 rounded-[var(--radius-card)] transition-colors"
              onClick={() => setBizOpen(true)}
            >
              <div className="w-12 h-12 rounded-[var(--radius-card)] bg-beige-light flex items-center justify-center shrink-0">
                <Image src="/symbol_olive.png" alt="Tayylo" width={28} height={28} style={{ width: "auto", height: "auto" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-primary truncate">{business?.name || "My Studio"}</p>
                <p className="text-xs text-text-secondary">
                  Owner: {business?.ownerName || "Tailor"} · Currency: {business?.currency || "NGN"}
                </p>
              </div>
              <div className="flex items-center gap-1 text-xs text-olive font-medium">
                <Edit2 size={14} />
                <span>Edit</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Studio */}
      <section className="mb-6">
        <h2 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-3">Studio</h2>
        <Card>
          <CardContent>
            <div
              className="flex items-center gap-4 cursor-pointer hover:bg-beige-light/20 -mx-4 -my-2 p-4 rounded-[var(--radius-card)] transition-colors"
              onClick={() => router.push("/appointments")}
            >
              <div className="w-12 h-12 rounded-[var(--radius-card)] bg-beige-light flex items-center justify-center shrink-0 text-olive">
                <Calendar size={22} strokeWidth={1.75} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-primary truncate">Studio Appointments</p>
                <p className="text-xs text-text-secondary">Fittings, measurements & pickups on the calendar</p>
              </div>
              <ChevronRight size={18} className="text-text-tertiary shrink-0" />
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Units */}
      <section className="mb-6">
        <h2 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-3">Measurements</h2>
        <Card>
          <CardContent>
            <div className="flex items-center justify-between py-1">
              <div>
                <span className="text-sm font-medium text-text-primary block">Unit system</span>
                <span className="text-xs text-text-tertiary">Default unit for numeric keypad entry</span>
              </div>
              <div className="flex gap-1 bg-beige-light rounded-[var(--radius-button)] p-1">
                <button
                  onClick={() => businessRepo.update({ unitSystem: "imperial" }).then(setBusiness)}
                  className={`px-3 py-1 rounded-[var(--radius-sm)] text-xs font-medium transition-colors ${
                    business?.unitSystem === "imperial" ? "bg-white-warm text-text-primary shadow-sm font-semibold" : "text-text-tertiary"
                  }`}
                >
                  Inches (¼ ½ ¾)
                </button>
                <button
                  onClick={() => businessRepo.update({ unitSystem: "metric" }).then(setBusiness)}
                  className={`px-3 py-1 rounded-[var(--radius-sm)] text-xs font-medium transition-colors ${
                    business?.unitSystem === "metric" ? "bg-white-warm text-text-primary shadow-sm font-semibold" : "text-text-tertiary"
                  }`}
                >
                  Centimetres
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Templates */}
      <section className="mb-6">
        <h2 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-3">Starter Templates</h2>
        <Card>
          <CardContent>
            <button
              onClick={() => setTemplateOpen(true)}
              className="flex items-center justify-between w-full py-1 text-left"
            >
              <div>
                <span className="text-sm font-medium text-text-primary block">Measurement templates library</span>
                <span className="text-xs text-text-tertiary">Western & traditional garment fields</span>
              </div>
              <div className="flex items-center gap-1.5 text-olive font-medium text-xs">
                <span>{templates.length} templates</span>
                <ChevronRight size={16} strokeWidth={1.5} />
              </div>
            </button>
          </CardContent>
        </Card>
      </section>

      {/* Theme */}
      <section className="mb-6">
        <h2 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-3">Appearance</h2>
        <Card>
          <CardContent>
            <div className="flex items-center justify-between py-1">
              <div>
                <span className="text-sm font-medium text-text-primary block">Theme</span>
                <span className="text-xs text-text-tertiary">Warm cream or deep olive dark mode</span>
              </div>
              <div className="flex gap-1 bg-beige-light rounded-[var(--radius-button)] p-1">
                {[
                  { key: "system", icon: Monitor, label: "System" },
                  { key: "light", icon: Sun, label: "Light" },
                  { key: "dark", icon: Moon, label: "Dark" },
                ].map(t => (
                  <button
                    key={t.key}
                    onClick={() => handleTheme(t.key)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-[var(--radius-sm)] text-xs font-medium transition-all ${
                      theme === t.key ? "bg-white-warm text-text-primary shadow-sm font-semibold" : "text-text-tertiary hover:text-text-primary"
                    }`}
                    aria-label={t.label}
                  >
                    <t.icon size={13} strokeWidth={1.5} />
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Data Import / Export */}
      <section className="mb-6">
        <h2 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-3">Data & Portability</h2>
        <Card>
          <CardContent className="space-y-0">
            <button
              onClick={() => setImportOpen(true)}
              className="flex items-center gap-3 w-full py-3.5 border-b border-border text-left hover:bg-beige-light/30 transition-colors -mx-4 px-4"
            >
              <FileUp size={18} className="text-olive" strokeWidth={1.5} />
              <div className="flex-1">
                <span className="text-sm font-medium text-text-primary block">Import clients</span>
                <span className="text-xs text-text-tertiary">From phone contacts or CSV spreadsheet</span>
              </div>
              <ChevronRight size={16} className="text-text-tertiary" strokeWidth={1.5} />
            </button>

            <button
              onClick={() => setExportOpen(true)}
              className="flex items-center gap-3 w-full py-3.5 border-b border-border text-left hover:bg-beige-light/30 transition-colors -mx-4 px-4"
            >
              <FileDown size={18} className="text-olive" strokeWidth={1.5} />
              <div className="flex-1">
                <span className="text-sm font-medium text-text-primary block">Export archive</span>
                <span className="text-xs text-text-tertiary">Download full JSON backup or clients CSV</span>
              </div>
              <ChevronRight size={16} className="text-text-tertiary" strokeWidth={1.5} />
            </button>

            <button
              onClick={handleReset}
              className="flex items-center gap-3 w-full py-3.5 text-left hover:bg-beige-light/30 transition-colors -mx-4 px-4"
            >
              <RotateCcw size={18} className="text-text-tertiary" strokeWidth={1.5} />
              <div className="flex-1">
                <span className="text-sm font-medium text-text-primary block">Reset demo data</span>
                <span className="text-xs text-text-tertiary">Restore initial 25 clients and seed orders</span>
              </div>
            </button>
          </CardContent>
        </Card>
      </section>

      {/* Design system showcase */}
      <section className="mb-6">
        <Card>
          <CardContent>
            <button
              onClick={() => router.push("/design-system")}
              className="flex items-center gap-3 w-full py-1 text-left"
            >
              <Palette size={18} className="text-olive" strokeWidth={1.5} />
              <div className="flex-1">
                <span className="text-sm font-medium text-text-primary block">Design System Showcase</span>
                <span className="text-xs text-text-tertiary">All UI tokens, typography, and interactive components</span>
              </div>
              <ChevronRight size={16} className="text-text-tertiary ml-auto" strokeWidth={1.5} />
            </button>
          </CardContent>
        </Card>
      </section>

      {/* Delete account */}
      <section className="mb-8">
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogTrigger asChild>
            <button className="flex items-center gap-2 text-sm text-danger hover:underline">
              <Trash2 size={16} strokeWidth={1.5} />
              Reset and wipe workspace
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reset workspace data?</DialogTitle>
              <DialogDescription>
                This will clear custom client records and restore clean initial state.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setDeleteOpen(false)}>Cancel</Button>
              <Button variant="destructive-filled" onClick={handleDeleteAccount}>Reset workspace</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </section>

      <p className="text-xs text-text-tertiary text-center pb-4">
        Tayylo · Version 1.0.0 (Bespoke Tailoring Workspace)
      </p>

      {/* ---- BUSINESS PROFILE MODAL ---- */}
      <Dialog open={bizOpen} onOpenChange={setBizOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Studio Profile</DialogTitle>
            <DialogDescription>
              Update your bespoke brand and studio details.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">Studio / Brand Name</label>
              <input
                type="text"
                value={bizName}
                onChange={e => setBizName(e.target.value)}
                className="w-full h-10 px-3 rounded-[var(--radius-input)] border border-border bg-white-warm text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-olive"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">Owner / Lead Tailor</label>
              <input
                type="text"
                value={ownerName}
                onChange={e => setOwnerName(e.target.value)}
                className="w-full h-10 px-3 rounded-[var(--radius-input)] border border-border bg-white-warm text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-olive"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">Default Currency</label>
              <select
                value={bizCurrency}
                onChange={e => setBizCurrency(e.target.value)}
                className="w-full h-10 px-3 rounded-[var(--radius-input)] border border-border bg-white-warm text-sm text-text-primary"
              >
                <option value="NGN">NGN (₦) · Nigerian Naira</option>
                <option value="USD">USD ($) · US Dollar</option>
                <option value="GBP">GBP (£) · British Pound</option>
                <option value="EUR">EUR (€) · Euro</option>
                <option value="GHS">GHS (₵) · Ghanaian Cedi</option>
                <option value="KES">KES (KSh) · Kenyan Shilling</option>
                <option value="INR">INR (₹) · Indian Rupee</option>
              </select>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="secondary" onClick={() => setBizOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSaveBusiness}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- TEMPLATE MANAGER MODAL ---- */}
      <Dialog open={templateOpen} onOpenChange={setTemplateOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ruler size={18} className="text-olive" />
              Measurement Templates ({templates.length})
            </DialogTitle>
            <DialogDescription>
              Tayylo starter templates across Western & traditional bespoke garments.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-2 py-2 pr-1 -mr-1">
            {templates.map(t => {
              const isSelected = selectedTemplate?.id === t.id;
              return (
                <div
                  key={t.id}
                  className={`p-3 rounded-[var(--radius-card)] border transition-all ${
                    isSelected ? "border-olive bg-beige-light/30" : "border-border bg-white-warm"
                  }`}
                >
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setSelectedTemplate(isSelected ? null : t)}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-text-primary">{t.name}</span>
                        <Tag size="sm" variant={t.category === "Traditional" ? "olive" : "beige"}>
                          {t.category}
                        </Tag>
                      </div>
                      <p className="text-xs text-text-secondary mt-0.5">{t.fields.length} measurement points</p>
                    </div>
                    <span className="text-xs text-olive font-medium">
                      {isSelected ? "Hide fields ▲" : "View fields ▼"}
                    </span>
                  </div>

                  {isSelected && (
                    <div className="mt-3 pt-3 border-t border-border/60">
                      <div className="flex flex-wrap gap-1 mb-3">
                        {t.fields.map(f => (
                          <span
                            key={f.id}
                            className="text-[11px] px-2 py-0.5 rounded bg-white-warm border border-border text-text-primary"
                          >
                            {f.label}
                          </span>
                        ))}
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="text-xs w-full"
                        onClick={() => handleDuplicateTemplate(t)}
                      >
                        <Copy size={13} />
                        Duplicate as custom template
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setTemplateOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- IMPORT CLIENTS MODAL ---- */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UploadCloud size={18} className="text-olive" />
              Import Clients
            </DialogTitle>
            <DialogDescription>
              Bring existing client records from spreadsheets or phone contacts into Tayylo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* 1-tap contacts simulation */}
            <div className="p-3 bg-beige-light/40 rounded-[var(--radius-card)] border border-border">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                  <Users size={14} className="text-olive" />
                  Quick Contacts Import
                </span>
                <span className="text-[10px] text-text-tertiary">Recommended</span>
              </div>
              <p className="text-xs text-text-secondary mb-2.5">
                Simulate importing 5 realistic clients directly into your notebook.
              </p>
              <Button
                variant="primary"
                size="sm"
                className="w-full text-xs"
                onClick={handleSimulateContacts}
                disabled={importing}
              >
                {importing ? "Importing..." : "Import 5 Contacts"}
              </Button>
            </div>

            {/* CSV Paste */}
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">
                Or Paste CSV Data (Name, Phone, Email, Notes)
              </label>
              <textarea
                value={csvText}
                onChange={e => setCsvText(e.target.value)}
                placeholder={"Chioma Adebayo, +234 803 999 1122, chioma@test.com, Wedding guest\nEmeka Okafor, +234 812 555 7788, , Kaftan preferred"}
                rows={4}
                className="w-full p-2.5 rounded-[var(--radius-input)] border border-border bg-white-warm text-xs text-text-primary font-mono focus:outline-none focus:ring-2 focus:ring-olive"
              />
              <p className="text-[10px] text-text-tertiary mt-1">One client per line: Name, Phone, Email, Notes</p>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="secondary" onClick={() => setImportOpen(false)}>Cancel</Button>
            {csvText.trim().length > 0 && (
              <Button variant="primary" onClick={handleImportCsv} disabled={importing}>
                Import CSV Rows
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- EXPORT DATA MODAL ---- */}
      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download size={18} className="text-olive" />
              Export Workspace Data
            </DialogTitle>
            <DialogDescription>
              Your client records and measurements belong to you. Download complete copies anytime.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3">
            <div
              onClick={handleDownloadCsv}
              className="p-3.5 rounded-[var(--radius-card)] bg-white-warm border border-border hover:border-olive/60 cursor-pointer transition-colors flex items-center justify-between"
            >
              <div>
                <p className="text-sm font-semibold text-text-primary">Clients Spreadsheet (CSV)</p>
                <p className="text-xs text-text-secondary">Open in Microsoft Excel, Google Sheets, or Apple Numbers</p>
              </div>
              <Download size={18} className="text-olive" />
            </div>

            <div
              onClick={handleDownloadJson}
              className="p-3.5 rounded-[var(--radius-card)] bg-white-warm border border-border hover:border-olive/60 cursor-pointer transition-colors flex items-center justify-between"
            >
              <div>
                <p className="text-sm font-semibold text-text-primary">Full Database Archive (JSON)</p>
                <p className="text-xs text-text-secondary">Clients, measurements, orders, and version history</p>
              </div>
              <Download size={18} className="text-olive" />
            </div>
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setExportOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
