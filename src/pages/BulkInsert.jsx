import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useUser } from "../App";
import { issuesApi } from "../api/issues";
import "../style/bulk_insert.css";

export default function BulkInsert() {
  const [titles, setTitles] = useState("");
  const [loading, setLoading] = useState(false);
  const currentUser = useUser();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await issuesApi(currentUser.apiKey).bulkInsert(titles);
      const count = response.data.created;
      const successMsg = `Successfully created ${count} issues.`;
      navigate("/", {
      state: { message: successMsg }
      });
    } catch (error) {
      console.error("Error en el bulk insert:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bulk-container">
      <h2 className="bulk-title">New bulk insert</h2>

      <form onSubmit={handleSubmit}>
        <div className="bulk-textarea-wrapper">
          <textarea
            name="bulk_titles"
            placeholder="One item per line..."
            className="bulk-textarea"
            value={titles}
            onChange={(e) => setTitles(e.target.value)}
            disabled={loading}
            required
          />
        </div>

        <div className="bulk-actions" style={{ marginTop: "20px" }}>
          <button 
            type="submit" 
            className="btn btn-teal" 
            disabled={loading}
          >
            {loading ? "Creating..." : "Create"}
          </button>

          <Link to="/" className="btn btn-dark">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}