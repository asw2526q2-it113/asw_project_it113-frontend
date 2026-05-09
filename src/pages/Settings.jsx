import { useState, useEffect } from "react";
import { useUser } from "../App";
import { settingsApi } from "../api/settings";
import "../style/settings.css";
import "../style/settings_attr_delete.css";
import "../style/settings_attr_form.css";
import "../style/settings_shared.css";

// ── Configuració dels atributs ─────────────────────────────────────────────────
const ATTRS = [
  {
    key: "statuses", label: "Statuses", singular: "Status",
    icon: <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>,
    extraCols: false,
  },
  {
    key: "priorities", label: "Priorities", singular: "Priority",
    icon: <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>,
    extraCols: false,
  },
  {
    key: "types", label: "Types", singular: "Type",
    icon: <svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
    extraCols: false,
  },
  {
    key: "severities", label: "Severities", singular: "Severity",
    icon: <svg viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    extraCols: false,
  },
  {
    key: "tags", label: "Tags", singular: "Tag",
    icon: <svg viewBox="0 0 24 24"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
    extraCols: false,
  },
  {
    key: "due-dates", label: "Due Dates", singular: "Due Date",
    icon: <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    extraCols: true,
  },
];

const EditIcon  = () => <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const DeleteIcon = () => <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>;
const PlusIcon  = () => <svg style={{width:12,height:12,stroke:"white",fill:"none",strokeWidth:2.2}} viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;

// ── Modal Add/Edit ─────────────────────────────────────────────────────────────
function AttrFormModal({ attr, obj, onClose, onSaved }) {
  const currentUser = useUser();
  const api = settingsApi(currentUser.apiKey);
  const isDueDates = attr.key === "due-dates";

  const [form, setForm]     = useState({
    name:         obj?.name         || "",
    color:        obj?.color        || "#4ecdc4",
    days:         obj?.days         ?? "",
    before_after: obj?.before_after || "before",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = e => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    setErrors(er => ({ ...er, [e.target.name]: null }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const payload = { name: form.name, color: form.color };
      if (isDueDates) {
        payload.days         = parseInt(form.days);
        payload.before_after = form.before_after;
      }
      if (obj) {
        await api.edit(attr.key, obj.id, payload);
      } else {
        await api.add(attr.key, payload);
      }
      onSaved();
    } catch (err) {
      if (err.response?.data) setErrors(err.response.data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{maxWidth:520}} onClick={e => e.stopPropagation()}>
        <div className="form-card" style={{maxWidth:"100%", border:"none"}}>
          <div className="form-card-header">
            <h2>{obj ? "Edit" : "Add"} {attr.singular}</h2>
          </div>
          <div className="form-body">
            <div className="field-group">
              <label>Name</label>
              <input type="text" name="name" value={form.name} onChange={handleChange} style={{width:"100%", boxSizing:"border-box"}} />
              {errors.name && <ul className="errorlist"><li>{Array.isArray(errors.name) ? errors.name[0] : errors.name}</li></ul>}
            </div>
            <div className="field-group">
              <label>Color</label>
              <div className="color-row">
                <input type="color" name="color" value={form.color} onChange={handleChange} />
                <span className="color-hex">{form.color}</span>
              </div>
              {errors.color && <ul className="errorlist"><li>{Array.isArray(errors.color) ? errors.color[0] : errors.color}</li></ul>}
            </div>
            {isDueDates && <>
              <div className="field-group">
                <label>Days</label>
                <input type="number" name="days" value={form.days} onChange={handleChange} style={{width:"100%", boxSizing:"border-box"}} />
                {errors.days && <ul className="errorlist"><li>{Array.isArray(errors.days) ? errors.days[0] : errors.days}</li></ul>}
              </div>
              <div className="field-group">
                <label>Before / After</label>
                <select name="before_after" value={form.before_after} onChange={handleChange}
                  style={{height:34,padding:"0 10px",border:"1px solid var(--border)",borderRadius:"var(--radius)",fontSize:13,background:"var(--bg)",color:"var(--text)",width:"100%"}}>
                  <option value="before">Before</option>
                  <option value="after">After</option>
                </select>
              </div>
            </>}
          </div>
          <div className="form-actions">
            <button className="btn btn-teal" onClick={handleSubmit} disabled={loading}>
              {loading ? "Saving…" : obj ? "Save changes" : "Add"}
            </button>
            <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Modal Delete ───────────────────────────────────────────────────────────────
function DeleteModal({ attr, obj, onClose, onDeleted }) {
  const currentUser = useUser();
  const api = settingsApi(currentUser.apiKey);

  const [conflict, setConflict]       = useState(null);
  const [replaceWith, setReplaceWith] = useState("");
  const [error, setError]             = useState(null);
  const [loading, setLoading]         = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    setError(null);
    try {
      await api.remove(attr.key, obj.id, replaceWith || null);
      onDeleted();
    } catch (err) {
      if (err.response?.status === 409) {
        const data = err.response.data;
        if (!data.alternatives || data.alternatives.length === 0) {
          setError(data.error);
        } else {
          setConflict(data);
        }
      } else {
        setError(err.response?.data?.error || "Error inesperat");
      }
    } finally {
      setLoading(false);
    }
  };

  const canDelete = !error && (!conflict || !!replaceWith);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{maxWidth:560}} onClick={e => e.stopPropagation()}>
        <div className="delete-card" style={{maxWidth:"100%", border:"none"}}>
          <div className="delete-card-header">
            <div className="icon-warning">
              <svg viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </div>
            <h2>Delete {attr.singular}</h2>
          </div>

          <div className="delete-body">
            <p style={{fontSize:13, color:"var(--text)", margin:0}}>
              You are about to delete the {attr.singular.toLowerCase()}:{" "}
              <span className="attr-name-badge">
                <span className="color-dot" style={{background: obj.color || "#aaa"}}></span>
                {obj.name}
              </span>
            </p>

            {error && (
              <div className="affected-box">
                <p style={{color:"#92400e", margin:0}}>{error}</p>
              </div>
            )}

            {conflict && (
              <div className="affected-box">
                <p>{conflict.affected_count} issue{conflict.affected_count !== 1 ? "s" : ""} use this {attr.singular.toLowerCase()}.</p>
                {conflict.alternatives?.length > 0 && (
                  <div className="reassign-group">
                    <label>Replace with:</label>
                    <select value={replaceWith} onChange={e => setReplaceWith(e.target.value)} required>
                      <option value="" disabled>— Select a replacement —</option>
                      {conflict.alternatives.map(alt => (
                        <option key={alt.id} value={alt.id}>{alt.name}</option>
                      ))}
                    </select>
                    <span className="reassign-note">
                      You must select a replacement before deleting this {attr.singular.toLowerCase()}.
                      All affected issues will be updated automatically.
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="delete-actions">
            <button
              className="btn btn-danger"
              style={{background:"#dc2626", color:"white", border:"none", display:"flex", alignItems:"center", gap:6, padding:"0 14px", height:32, borderRadius:6, cursor:"pointer", fontSize:12, fontWeight:500}}
              onClick={handleDelete}
              disabled={loading || !canDelete}
            >
              Delete {attr.singular}
            </button>
            <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Secció d'un atribut ────────────────────────────────────────────────────────
function AttrSection({ attr, items, onRefresh }) {
  const [formModal, setFormModal]     = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);

  return (
    <div className="attr-section" id={attr.key}>
      <div className="attr-section-header">
        <h2>{attr.label}</h2>
        <button className="btn btn-teal" style={{height:30, fontSize:12, display:"flex", alignItems:"center", gap:6}}
          onClick={() => setFormModal("add")}>
          <PlusIcon /> Add {attr.singular}
        </button>
      </div>

      <table className="attr-table">
        <thead>
          <tr>
            <th>Name</th>
            {attr.extraCols && <><th>Days to due date</th><th>Before/After</th></>}
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr className="empty-row">
              <td colSpan={attr.extraCols ? 4 : 2}>No {attr.label.toLowerCase()} defined.</td>
            </tr>
          ) : items.map(obj => (
            <tr key={obj.id}>
              <td>
                <span className="color-swatch" style={{background: obj.color}}></span>
                {obj.name}
              </td>
              {attr.extraCols && <>
                <td style={{color:"var(--text-muted)"}}>{obj.days ?? "—"}</td>
                <td style={{color:"var(--text-muted)"}}>
                  {obj.before_after === "before" ? "Before" : obj.before_after === "after" ? "After" : "—"}
                </td>
              </>}
              <td>
                <div className="row-actions">
                  <a onClick={() => setFormModal(obj)} style={{cursor:"pointer"}}>
                    <EditIcon /> Edit
                  </a>
                  <a className="danger" onClick={() => setDeleteModal(obj)} style={{cursor:"pointer"}}>
                    <DeleteIcon /> Delete
                  </a>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {formModal && (
        <AttrFormModal
          attr={attr}
          obj={formModal === "add" ? null : formModal}
          onClose={() => setFormModal(null)}
          onSaved={() => { setFormModal(null); onRefresh(); }}
        />
      )}
      {deleteModal && (
        <DeleteModal
          attr={attr}
          obj={deleteModal}
          onClose={() => setDeleteModal(null)}
          onDeleted={() => { setDeleteModal(null); onRefresh(); }}
        />
      )}
    </div>
  );
}

// ── Pàgina principal ───────────────────────────────────────────────────────────
export default function Settings() {
  const currentUser = useUser();
  const api = settingsApi(currentUser.apiKey);

  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await api.getAll();
      setData(res.data);
    } catch {
      setError("Error carregant la configuració.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSettings(); }, [currentUser]);

  if (loading) return <div style={{padding:40, color:"var(--text-muted)"}}>Loading settings…</div>;
  if (error)   return <div style={{padding:40, color:"#dc2626"}}>{error}</div>;

  return (
    <div>
      <div style={{marginBottom:20}}>
        <h1 style={{fontSize:18, fontWeight:600, margin:"0 0 4px"}}>Settings</h1>
        <p style={{color:"var(--text-muted)", fontSize:13, margin:0}}>
          Manage issue attributes, tags and due dates.
        </p>
      </div>

      <div className="settings-layout">
        <nav className="settings-nav">
          {ATTRS.map(attr => (
            <a key={attr.key} href={`#${attr.key}`}>
              {attr.icon}{attr.label}
            </a>
          ))}
        </nav>

        <div className="settings-main">
          {ATTRS.map(attr => (
            <AttrSection
              key={attr.key}
              attr={attr}
              items={data[attr.key === "due-dates" ? "due_dates" : attr.key] || []}
              onRefresh={fetchSettings}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
