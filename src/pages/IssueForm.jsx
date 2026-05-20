import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useUser } from "../App";
import { issuesApi } from "../api/issues";
import { settingsApi } from "../api/settings.js";
import { usersApi } from "../api/users.js";
import "../style/forms.css";

export default function IssueForm() {
  const { pk } = useParams();
  const navigate = useNavigate();
  const currentUser = useUser();
  const apiIssues = issuesApi(currentUser.apiKey);
  const apiSettings = settingsApi(currentUser.apiKey);
  const apiUsers = usersApi(currentUser.apiKey);

  const isEdit = !!pk;

  // --- ESTAT DEL FORMULARI ---
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: "",
    priority: "",
    severity: "",
    type: "",
    assigned_to: "",
    deadline: ""
  });

  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const [attachments, setAttachments] = useState([]); // Fitxers nous
  const [existingAttachments, setExistingAttachments] = useState([]); // Fitxers que ja hi eren
  const [attachmentsToDelete, setAttachmentsToDelete] = useState([]);
  const [meta, setMeta] = useState({ users: [], statuses: [], priorities: [], severities: [], types: [], tags: [] });
  const [errors, setErrors] = useState({});

  // --- CÀRREGA DE DADES ---
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // 1. Demanem configuració i usuaris alhora
        const [resSettings, resUsers] = await Promise.all([
          apiSettings.getAll(),
          apiUsers.list()
        ]);

        // Arreglem el tema de la llista d'usuaris (per si hi ha paginació)
        const usersList = Array.isArray(resUsers.data)
          ? resUsers.data
          : (resUsers.data.results || []);

        // Guardem tota la "meta" informació
        setMeta({
          users: usersList,
          statuses: resSettings.data.statuses || [],
          priorities: resSettings.data.priorities || [],
          severities: resSettings.data.severities || [],
          types: resSettings.data.types || [],
          tags: resSettings.data.tags || []
        });

        // 2. Si estem editant, demanem la Issue concreta
        if (isEdit) {
          const resIssue = await apiIssues.detail(pk);
          const d = resIssue.data;
          setFormData({
            title: d.title,
            description: d.description,
            status: d.status_detail?.id || d.status,
            priority: d.priority_detail?.id || d.priority,
            severity: d.severity_detail?.id || d.severity,
            type: d.type_detail?.id || d.type,
            assigned_to: d.assigned_to_detail?.id || d.assigned_to || "",
            deadline: d.deadline || ""
          });
          setTags(d.tags_detail?.map(t => t.name) || []);
          setExistingAttachments(d.attachments || []);
        }
      } catch (err) {
        console.error("Error loading form data:", err);
      }
    };

    fetchInitialData();
  }, [pk, currentUser]);

  // --- MANEGADORS D'EVENTS ---
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleFileChange = (e) => {
    setAttachments([...attachments, ...Array.from(e.target.files)]);
  };

  const handleDeleteExistingAttachment = async (att) => {
    try {
      await apiIssues.deleteAttachment(pk, att.id);

      setExistingAttachments((prev) =>
        prev.filter((attachment) => attachment.id !== att.id)
      );

      setAttachmentsToDelete((prev) =>
        prev.filter((id) => id !== att.id)
      );

      setErrors((prev) => ({
        ...prev,
        general: null,
      }));
    } catch (err) {
      console.error("Error deleting attachment:", err.response?.data || err);

      const status = err.response?.status;

      const backendMessage =
        err.response?.data?.error ||
        err.response?.data?.detail ||
        err.response?.data?.message;

      if (status === 401 || status === 403) {
        setErrors((prev) => ({
          ...prev,
          general: [
            "You cannot delete this attachment because it was uploaded by another user.",
          ],
        }));
      } else {
        setErrors((prev) => ({
          ...prev,
          general: [
            backendMessage || "The attachment could not be deleted.",
          ],
        }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = ["This field is required."];
    if (!formData.status)   newErrors.status   = ["This field is required."];
    if (!formData.type)     newErrors.type     = ["This field is required."];
    if (!formData.severity) newErrors.severity = ["This field is required."];
    if (!formData.priority) newErrors.priority = ["This field is required."];

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const data = new FormData();
    Object.keys(formData).forEach(key => data.append(key, formData[key]));
    data.append("tags_input", tags.join(","));
    //attachments.forEach(file => data.append("attachments", file));

    try {
      if (isEdit) {
        await apiIssues.update(pk, data);

        for (const file of attachments) {
          await apiIssues.addAttachment(pk, file);
        }

        navigate(`/issues/${pk}`, { state: { message: "Issue updated." } });
      } else {
        const res = await apiIssues.create(data);
        const issuePk = res.data.id;
        for (const file of attachments) {
          await apiIssues.addAttachment(issuePk, file);
        }
        navigate("/", { state: { message: "Issue created successfully." } });
      }
    } catch (err) {
      console.log("Error detall:", err.response?.data);
      if (err.response?.data) setErrors(err.response.data);
    }
  };

  return (
    /* Centrem el formulari i definim que ocupi el 100% fins a un màxim de 860px (com diu el teu CSS) */
    <div className="issue-form-container" >
      <Link to="/" className="back-link" style={{ display: "inline-flex", alignItems: "center", gap: "5px", color: "var(--text-muted)", fontSize: "12px", textDecoration: "none", marginBottom: "16px" }}>
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        Back to issues
      </Link>

      {/* Forçem que la targeta s'estengui al 100% de l'espai per activar el Grid real */}
      <div className="issue-form-card">
        <form onSubmit={handleSubmit}>
          <div className="form-layout">

            {/* COLUMNA PRINCIPAL */}
            <div className="form-main">
              <div className="form-title">{isEdit ? "Edit issue" : "Create issue"}</div>

              {errors.general && (
                <div className="error-message" style={{ marginBottom: "12px" }}>
                  {errors.general[0]}
                </div>
              )}

              <div className={`field ${errors.title ? 'has-error' : ''}`}>
                <label>Subject *</label>
                <input type="text" name="title" value={formData.title} onChange={handleChange} />
                {errors.title && <div className="error-message">{errors.title[0]}</div>}
              </div>

              <div className="field">
                <label>Tags</label>
                <div className="tag-editor">
                  <div className="tag-editor-row">
                    {/* AFEGIDA LA CLASSE ORIGINAL: className="tag-text-input" */}
                    <input
                      type="text"
                      className="tag-text-input"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      placeholder="Add tag"
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    />
                    <button type="button" className="add-tag-square" onClick={handleAddTag}>+</button>
                  </div>
                  <div className="selected-tags">
                    {tags.map(tag => (
                      <span key={tag} className="selected-tag">
                        {tag}
                        <button type="button" className="selected-tag-remove" onClick={() => removeTag(tag)}>&times;</button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="field">
                <label>Description</label>
                <textarea name="description" value={formData.description} onChange={handleChange}></textarea>
              </div>

              <div className="field">
                <div className="attach-header-row">
                  <span>Attachments</span>
                  <button type="button" className="add-btn" onClick={() => document.getElementById('fileInput').click()}>+</button>
                </div>
                <input type="file" id="fileInput" multiple style={{display:'none'}} onChange={handleFileChange} onClick={(e) => e.target.value = ''} />

                <ul className="file-list-preview" style={{ listStyle: "none", padding: 0 }}>
                  {existingAttachments.map((att) => (
                    <li key={att.id} style={{display:'flex', justifyContent:'space-between', alignItems: 'center', padding: "4px 0", fontSize:'12px', color:'var(--teal)'}}>
                      <span>📎 {att.filename} <span style={{color: "var(--text-muted)"}}>({(att.size / 1024).toFixed(1)} KB)</span></span>
                      <button
                        type="button"
                        onClick={() => handleDeleteExistingAttachment(att)}
                        style={{
                          border: "none",
                          background: "none",
                          color: "#dc2626",
                          cursor: "pointer",
                          fontSize: "16px"
                        }}
                      >
                        ×
                      </button>
                    </li>
                  ))}
                  {attachments.map((f, i) => (
                    <li key={i} style={{display:'flex', justifyContent:'space-between', alignItems: 'center', padding: "4px 0", fontSize:'12px', color:'var(--teal)'}}>
                      <span>📎 {f.name} <span style={{color: "var(--text-muted)"}}>({(f.size / 1024).toFixed(1)} KB)</span></span>
                      <button type="button" onClick={() => setAttachments(attachments.filter((_, idx) => idx !== i))} style={{ border: "none", background: "none", color: "#dc2626", cursor: "pointer", fontSize: "16px" }}>×</button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* SIDEBAR (BARRA LATERAL DE 260px) */}
            <div className="form-sidebar">
              <div className="field">
                <label>Status *</label>
                <select name="status" value={formData.status} onChange={handleChange}
                  className={`status-pill-select ${errors.status ? 'has-error' : ''}`}>
                  <option value="">— Status —</option>
                  {meta.statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                {errors.status && <div className="error-message">{errors.status[0]}</div>}
              </div>

              <hr className="divider" />

              <div className="field">
                <label>Assigned</label>
                <select name="assigned_to" value={formData.assigned_to} onChange={handleChange}>
                  <option value="">Unassigned</option>
                  {meta.users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
                </select>
              </div>

              <hr className="divider" />

              {/* INTEGRATS ELS CONTENIDORS field-inline-input PER EVITAR L'ENCONGIMENT */}
              <div className={`field-inline ${errors.type ? 'has-error' : ''}`}>
                <label>Type *</label>
                <div className="field-inline-input">
                  <select name="type" value={formData.type} onChange={handleChange}>
                    <option value="">— Type —</option>
                    {meta.types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                  {errors.type && <div className="error-message">{errors.type[0]}</div>}
                </div>
              </div>

              <div className={`field-inline ${errors.type ? 'has-error' : ''}`}>
                <label>Severity *</label>
                <div className="field-inline-input">
                  <select name="severity" value={formData.severity} onChange={handleChange}>
                    <option value="">— Severity —</option>
                    {meta.severities.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  {errors.severity && <div className="error-message">{errors.severity[0]}</div>}
                </div>
              </div>

              <div className={`field-inline ${errors.type ? 'has-error' : ''}`}>
                <label>Priority *</label>
                <div className="field-inline-input">
                  <select name="priority" value={formData.priority} onChange={handleChange}>
                    <option value="">— Priority —</option>
                    {meta.priorities.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  {errors.priority && <div className="error-message">{errors.priority[0]}</div>}
                </div>
              </div>

              <div className="field-inline">
                <label>Deadline</label>
                <div className="field-inline-input">
                  <input type="date" name="deadline" value={formData.deadline} onChange={handleChange} />
                </div>
              </div>
            </div>
          </div>

          <div className="form-footer">
            <button type="submit" className="btn btn-teal">{isEdit ? "SAVE CHANGES" : "CREATE ISSUE"}</button>
            <Link to="/" className="btn btn-outline">Cancel</Link>
          </div>
        </form>
      </div>
    </div>
  );
}