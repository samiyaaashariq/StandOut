"use client";
import { useState, useEffect } from "react";

type Application = {
  id: string;
  company: string;
  role: string;
  status: string;
  applied_date: string;
  notes: string | null;
};

const STATUSES = [
  { id: "applied", label: "Applied", color: "bg-neutral-700" },
  { id: "interview", label: "Interview", color: "bg-accent/70" },
  { id: "offer", label: "Offer", color: "bg-green-500/70" },
  { id: "rejected", label: "Rejected", color: "bg-red-500/60" },
];

export default function ApplicationTracker() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function loadApplications() {
    setLoading(true);
    try {
      const res = await fetch("/api/applications");
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to load");
      const data = await res.json();
      setApplications(data.applications);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadApplications();
  }, []);

  async function handleAdd() {
    if (!company.trim() || !role.trim()) {
      setError("Company and role are required.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company, role, notes: notes || undefined }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to add");
      setCompany("");
      setRole("");
      setNotes("");
      setShowForm(false);
      await loadApplications();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function updateStatus(id: string, status: string) {
    try {
      await fetch(`/api/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      setApplications((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function deleteApplication(id: string) {
    try {
      await fetch(`/api/applications/${id}`, { method: "DELETE" });
      setApplications((prev) => prev.filter((a) => a.id !== id));
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="glass-card flex items-center justify-between p-6">
        <h2 className="font-display text-xl">Your applications</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-full bg-accent px-5 py-2 font-body text-sm font-medium text-neutral-950 transition hover:bg-accent-dim"
        >
          {showForm ? "Cancel" : "+ Add application"}
        </button>
      </div>

      {showForm && (
        <div className="glass-card animate-card-enter flex flex-col gap-3 p-6">
          <input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Company name"
            className="w-full rounded-lg border border-neutral-800 bg-neutral-900/60 p-3 font-body text-sm focus:border-accent focus:outline-none"
          />
          <input
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="Role / job title"
            className="w-full rounded-lg border border-neutral-800 bg-neutral-900/60 p-3 font-body text-sm focus:border-accent focus:outline-none"
          />
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Notes (optional)"
            className="w-full rounded-lg border border-neutral-800 bg-neutral-900/60 p-3 font-body text-sm focus:border-accent focus:outline-none"
          />
          <button
            onClick={handleAdd}
            disabled={submitting}
            className="self-start rounded-full bg-accent px-6 py-2 font-body text-sm font-medium text-neutral-950 transition hover:bg-accent-dim disabled:opacity-50"
          >
            {submitting ? "Adding..." : "Add"}
          </button>
        </div>
      )}

      {error && <p className="font-body text-sm text-red-400">{error}</p>}

      {loading ? (
        <div className="glass-card flex items-center justify-center p-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-700 border-t-accent" />
        </div>
      ) : applications.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <p className="font-body text-sm text-neutral-500">
            No applications yet. Add your first one to start tracking.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {applications.map((app) => (
            <div key={app.id} className="glass-card flex flex-col gap-3 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-body text-sm font-medium text-neutral-100">{app.role}</p>
                  <p className="font-body text-xs text-neutral-500">{app.company}</p>
                </div>
                <button
                  onClick={() => deleteApplication(app.id)}
                  className="font-body text-xs text-neutral-600 hover:text-red-400"
                >
                  Delete
                </button>
              </div>

              {app.notes && (
                <p className="font-body text-xs text-neutral-400">{app.notes}</p>
              )}

              <div className="flex flex-wrap gap-1.5">
                {STATUSES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => updateStatus(app.id, s.id)}
                    className={`rounded-full px-3 py-1 font-body text-xs transition ${
                      app.status === s.id
                        ? `${s.color} text-neutral-950 font-medium`
                        : "bg-neutral-800/60 text-neutral-400 hover:text-neutral-200"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              <p className="font-body text-xs text-neutral-600">
                Applied {new Date(app.applied_date).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
